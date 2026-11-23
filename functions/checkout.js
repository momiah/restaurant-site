/* eslint-disable camelcase */
/* eslint-disable max-len */
// Creating a checkout, for the website and the loyalty app alike. Clients send what
// the customer wants and their details; everything that matters — prices, total,
// the Stripe session and the pending order the kitchen will see — is decided here.
const {FieldValue} = require("firebase-admin/firestore");
const {PricingError, checkOrder, priceCart} = require("./pricing");

// Custom URL schemes a loyalty app build may return to after paying: Expo Go during
// development, and MenuDock app builds (menudock-loyalty://, menudock-<slug>://).
const APP_RETURN_URL = /^(exps?|menudock[a-z0-9.+-]*):\/\/\S*$/i;

/** A checkout problem whose message is safe to show the customer. */
class CheckoutError extends Error {
  /**
   * @param {number} status HTTP status.
   * @param {string} message Customer-facing explanation.
   */
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/**
 * MenuDock's own fee percentage for a restaurant: its billing.platformFeePercent (set
 * in the admin console), else the older payments.applicationFeePercent, else the
 * platform default. 0 is a real value ("Stripe costs only"), not "use the default".
 * @param {Object} restaurant Restaurant record.
 * @param {number} platformFeePercent Default fee percentage.
 * @return {number} Percentage (0 when none).
 */
function menuDockFeePercent(restaurant, platformFeePercent) {
  const percent = Number((restaurant.billing && restaurant.billing.platformFeePercent) ??
    (restaurant.payments && restaurant.payments.applicationFeePercent) ?? platformFeePercent ?? 0);
  return Number.isFinite(percent) && percent > 0 ? percent : 0;
}

/**
 * MenuDock's fee on an order (food subtotal only), in minor units (pence).
 * @param {number} subtotal Food subtotal in pounds.
 * @param {Object} restaurant Restaurant record.
 * @param {number} platformFeePercent Default fee percentage.
 * @return {number} Fee in pence (0 when none).
 */
function applicationFeeAmount(subtotal, restaurant, platformFeePercent) {
  return Math.round(subtotal * (menuDockFeePercent(restaurant, platformFeePercent) / 100) * 100);
}

/**
 * Everything MenuDock keeps from one order, in pence. With destination charges Stripe
 * takes its processing fee from the MenuDock account, so every restaurant pays a
 * "Stripe costs" part (a percentage of everything charged, delivery included, plus a
 * fixed amount per order) that passes those costs on, then MenuDock's own fee on the
 * food on top. Never more than the order itself.
 * @param {Object} args Order and fee settings.
 * @param {number} args.subtotal Food subtotal in pounds.
 * @param {number} args.deliveryPence Delivery charged, in pence.
 * @param {Object} args.restaurant Restaurant record.
 * @param {number} args.platformFeePercent Default MenuDock fee percentage.
 * @param {{percent: number, fixedPence: number}} [args.stripeCover] Stripe cost pass-through.
 * @return {{stripeCover: number, menuDock: number, total: number}} Fees in pence.
 */
function orderFees({subtotal, deliveryPence = 0, restaurant, platformFeePercent, stripeCover}) {
  const chargedPence = Math.round(subtotal * 100) + deliveryPence;
  const percent = Number((stripeCover && stripeCover.percent) || 0);
  const fixed = Math.round(Number((stripeCover && stripeCover.fixedPence) || 0));
  const cover = Math.max(0, Math.round(chargedPence * (percent / 100)) + Math.max(0, fixed));
  const menuDock = applicationFeeAmount(subtotal, restaurant, platformFeePercent);
  const total = Math.min(cover + menuDock, chargedPence);
  return {stripeCover: Math.min(cover, total), menuDock: total - Math.min(cover, total), total};
}

/**
 * Delivery charge options for Stripe: free above the restaurant's threshold,
 * otherwise its pre-created shipping rate or one built from ordering.deliveryFee.
 * @param {Object} restaurant Restaurant record.
 * @param {string} orderType Collection | Delivery.
 * @param {number} subtotal Food subtotal in pounds.
 * @param {string} currency Lower-case currency code.
 * @return {Array<Object>} Stripe shipping_options.
 */
function shippingOptions(restaurant, orderType, subtotal, currency) {
  const ordering = restaurant.ordering || {};
  const payments = restaurant.payments || {};
  if (orderType !== "Delivery" || subtotal >= (ordering.freeDeliveryThreshold ?? 0)) return [];
  if (payments.shippingRateId) return [{shipping_rate: payments.shippingRateId}];
  if (ordering.deliveryFee > 0) {
    return [{
      shipping_rate_data: {
        type: "fixed_amount",
        display_name: "Delivery",
        fixed_amount: {amount: Math.round(ordering.deliveryFee * 100), currency},
      },
    }];
  }
  return [];
}

const clean = (value, max) => String(value || "").trim().slice(0, max);

/**
 * Prices the basket from the menu, opens a Stripe Checkout session and records the
 * pending order.
 * @param {Object} deps Dependencies and request data.
 * @param {Object} deps.db Firestore (Admin SDK).
 * @param {Object} deps.stripe Stripe client.
 * @param {Object} deps.body { restaurantId, orderType, cartItems, customer, appReturnUrl? }.
 * @param {string} [deps.origin] Website origin (browsers send one; the app doesn't).
 * @param {Object|null} deps.member Verified ID token of a signed-in loyalty member.
 * @param {string} deps.functionBaseUrl Public URL of the payments function.
 * @param {number} deps.platformFeePercent Default MenuDock fee.
 * @param {{percent: number, fixedPence: number}} [deps.stripeCover] Stripe cost pass-through.
 * @param {boolean} [deps.livemode] Whether the Stripe key is live (sk_live_); a
 *   connected account made in the other mode is ignored rather than failing checkout.
 * @return {Promise<{id: string, url: string}>} The session to open.
 */
async function createCheckout({db, stripe, body, origin, member, functionBaseUrl, platformFeePercent, stripeCover, livemode}) {
  const {restaurantId, orderType, appReturnUrl} = body;
  const customer = body.customer || {};

  const restaurantSnap = restaurantId ? await db.collection("restaurants").doc(String(restaurantId)).get() : null;
  if (!restaurantSnap || !restaurantSnap.exists) throw new CheckoutError(400, `Unknown or missing restaurantId: ${restaurantId}`);
  const restaurant = {id: restaurantSnap.id, ...restaurantSnap.data()};
  if (restaurant.status && restaurant.status !== "active") {
    throw new CheckoutError(403, "This restaurant is not currently accepting orders");
  }

  // Website orders return to the website; app orders return to the app (via
  // /checkout-return) so the app tracks them itself.
  const fromApp = typeof appReturnUrl === "string" && appReturnUrl.length > 0;
  if (fromApp && !APP_RETURN_URL.test(appReturnUrl)) throw new CheckoutError(400, "Invalid app return address");
  if (!fromApp && !origin) throw new CheckoutError(400, "Missing return address");

  let priced;
  try {
    const menu = await db.collection("restaurants").doc(restaurant.id).collection("menu").get();
    priced = priceCart(menu.docs.map((d) => d.data()), body.cartItems);
    checkOrder(restaurant, {orderType, subtotal: priced.subtotal, customer});
  } catch (err) {
    if (err instanceof PricingError) throw new CheckoutError(400, err.message);
    throw err;
  }
  const {lines, subtotal} = priced;

  const currency = ((restaurant.ordering && restaurant.ordering.currency) || "GBP").toLowerCase();
  const shipping = shippingOptions(restaurant, orderType, subtotal, currency);
  const deliveryPence = shipping.length === 0 ? 0 :
    shipping[0].shipping_rate_data ? shipping[0].shipping_rate_data.fixed_amount.amount :
    Math.round(Number((restaurant.ordering && restaurant.ordering.deliveryFee) || 0) * 100);
  const returnBase = `${functionBaseUrl}/checkout-return?session_id={CHECKOUT_SESSION_ID}&result=`;
  const params = {
    mode: "payment",
    line_items: lines.map((line) => ({
      price_data: {
        currency,
        product_data: {
          name: [line.name, ...line.extras.map((e) => `+ ${e.type}`)].join(" "),
          ...(line.image ? {images: [line.image]} : {}),
          ...(line.description ? {description: line.description} : {}),
        },
        unit_amount: Math.round(line.price * 100),
      },
      quantity: line.quantity,
    })),
    success_url: fromApp ? `${returnBase}success` : `${origin}/order-success/?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: fromApp ? `${returnBase}cancel` : `${origin}/order-cancel/?session_id={CHECKOUT_SESSION_ID}`,
    shipping_options: shipping,
    allow_promotion_codes: true,
    // customerUid links the order to a loyalty member for points; it only ever comes
    // from a verified ID token, never from the request body.
    metadata: {restaurantId: restaurant.id, ...(member ? {customerUid: member.uid} : {})},
    ...(member && member.email ? {customer_email: member.email} : {}),
  };

  // Stripe Connect: pay the restaurant's connected account by destination charge,
  // keeping MenuDock's fee. Without an account yet, charge on the platform account.
  const payments = restaurant.payments || {};
  const wrongMode = typeof livemode === "boolean" && typeof payments.stripeLivemode === "boolean" &&
    payments.stripeLivemode !== livemode;
  const destination = wrongMode ? null : payments.stripeAccountId;
  const fees = orderFees({subtotal, deliveryPence, restaurant, platformFeePercent, stripeCover});
  if (destination) {
    params.payment_intent_data = {
      transfer_data: {destination},
      ...(fees.total > 0 ? {application_fee_amount: fees.total} : {}),
      metadata: {restaurantId: restaurant.id},
    };
  } else {
    console.warn(`Restaurant ${restaurant.id} has no ${wrongMode ? "Stripe account in this mode (test/live)" : "Stripe connected account"}; charging on the platform account.`);
  }

  const session = await stripe.checkout.sessions.create(params);

  // Clients can't create orders; this is the ticket the kitchen sees once paid.
  const delivery = orderType === "Delivery";
  await db.collection("orders").doc(session.id).set({
    id: session.id,
    restaurantId: restaurant.id,
    payment_status: "pending",
    orderType,
    name: clean(customer.name, 100),
    contactNumber: clean(customer.contactNumber, 30),
    address: delivery ? clean(customer.address, 300) : "",
    postCode: delivery ? clean(customer.postCode, 12) : "",
    notes: clean(customer.notes, 500),
    orderItems: lines,
    total: subtotal,
    // What MenuDock keeps (only taken when paid out to the restaurant's own account).
    fees: destination ?
      {stripeCover: fees.stripeCover / 100, menuDock: fees.menuDock / 100, total: fees.total / 100} :
      {stripeCover: 0, menuDock: 0, total: 0},
    source: fromApp ? "loyalty-app" : "website",
    ...(member ? {customerUid: member.uid} : {}),
    ...(fromApp ? {appReturnUrl} : {}),
    createdAt: new Date().toLocaleString("en-GB", {timeZone: "Europe/London"}),
    createdAtTs: FieldValue.serverTimestamp(),
  });

  return {id: session.id, url: session.url};
}

/**
 * Where to send an app customer coming back from Stripe: their app, with the order id.
 * @param {Object} db Firestore (Admin SDK).
 * @param {string} sessionId Stripe Checkout session id (= order id).
 * @param {string} result "success" or "cancel".
 * @return {Promise<string|null>} Deep link into the app, or null if unknown.
 */
async function appReturnRedirect(db, sessionId, result) {
  if (!sessionId || typeof sessionId !== "string") return null;
  const snap = await db.collection("orders").doc(sessionId).get();
  const target = snap.exists ? snap.get("appReturnUrl") : null;
  if (!target || !APP_RETURN_URL.test(target)) return null;
  const outcome = result === "success" ? "success" : "cancel";
  return `${target}${target.includes("?") ? "&" : "?"}orderId=${encodeURIComponent(sessionId)}&result=${outcome}`;
}

module.exports = {APP_RETURN_URL, CheckoutError, appReturnRedirect, applicationFeeAmount, createCheckout, menuDockFeePercent, orderFees};
