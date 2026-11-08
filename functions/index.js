/* eslint-disable camelcase */
/* eslint-disable max-len */
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const firestore = admin.firestore();
const express = require("express");
const cors = require("cors");
const {markOrderPaid} = require("./orders");
const menuImport = require("./menuImport");
const stripe = require("stripe")(functions.config().stripe.token);

// const PORT = 8082;
const app = express();
app.use(cors({origin: true}));

/**
 * Load a restaurant's config (payments + ordering rules) from Firestore.
 * @param {string} restaurantId Restaurant document id.
 * @return {Promise<Object|null>} The restaurant record, or null if not found.
 */
async function loadRestaurant(restaurantId) {
  if (!restaurantId) return null;
  const snap = await firestore.collection("restaurants").doc(restaurantId).get();
  return snap.exists ? {id: snap.id, ...snap.data()} : null;
}

/**
 * Platform application fee, as a percentage of the item subtotal. A restaurant may
 * override it via payments.applicationFeePercent; otherwise stripe.application_fee_percent.
 * @param {number} total Item subtotal in major currency units.
 * @param {Object} restaurant The restaurant record.
 * @return {number} Fee in minor units (e.g. pence); 0 when no fee configured.
 */
function applicationFeeAmount(total, restaurant) {
  const percent = Number(
      restaurant?.payments?.applicationFeePercent ??
      (functions.config().stripe && functions.config().stripe.application_fee_percent) ??
      0,
  );
  if (!percent || percent <= 0) return 0;
  return Math.round(total * (percent / 100) * 100); // minor units (e.g. pence)
}

// route endpoint
app.post("/stripe-session", async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  const cartItems = [...req.body.cartItems];
  const total = req.body.total;
  const orderType = req.body.orderType;
  const restaurantId = req.body.restaurantId;

  try {
    const restaurant = await loadRestaurant(restaurantId);
    if (!restaurant) {
      return res.status(400).json(`Unknown or missing restaurantId: ${restaurantId}`);
    }
    if (restaurant.status && restaurant.status !== "active") {
      return res.status(403).json("This restaurant is not currently accepting orders");
    }

    const ordering = restaurant.ordering || {};
    const payments = restaurant.payments || {};
    const currency = (ordering.currency || "GBP").toLowerCase();

    const transformedItems = cartItems?.map((item) => ({
      price_data: {
        currency,
        product_data: {
          name: `${item?.name} ${item?.extras?.reduce((a, e) => a += `+ ${e?.type} `, "")}`,
          images: item?.image ? [item.image] : [],
          description: item?.description,
        },
        unit_amount_decimal: item?.price * 100,
      },
      quantity: item?.quantity,
    }));

    // Per-restaurant delivery fee: free above the restaurant's threshold, otherwise a
    // pre-created shipping rate (payments.shippingRateId) or one built from ordering.deliveryFee.
    const threshold = ordering.freeDeliveryThreshold ?? 0;
    let shipping_options = [];
    if (orderType === "Delivery" && total < threshold) {
      if (payments.shippingRateId) {
        shipping_options = [{shipping_rate: payments.shippingRateId}];
      } else if (ordering.deliveryFee > 0) {
        shipping_options = [{
          shipping_rate_data: {
            type: "fixed_amount",
            display_name: "Delivery",
            fixed_amount: {amount: Math.round(ordering.deliveryFee * 100), currency},
          },
        }];
      }
    }

    const sessionParams = {
      line_items: transformedItems,
      mode: "payment",
      success_url: `${req.headers.origin}/order-success/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/order-cancel/?session_id={CHECKOUT_SESSION_ID}`,
      shipping_options,
      allow_promotion_codes: true,
      metadata: {restaurantId},
    };

    // Stripe Connect: route the money to the restaurant's connected account via a
    // destination charge, taking the platform application fee. When a restaurant has
    // no connected account yet (pre-onboarding), fall back to a plain platform charge.
    const destination = payments.stripeAccountId;
    if (destination) {
      const feeAmount = applicationFeeAmount(total, restaurant);
      sessionParams.payment_intent_data = {
        transfer_data: {destination},
        ...(feeAmount > 0 ? {application_fee_amount: feeAmount} : {}),
        metadata: {restaurantId},
      };
    } else {
      console.warn(`Restaurant ${restaurantId} has no Stripe connected account; charging on the platform account.`);
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    res.json(session);
  } catch (err) {
    res.status(err.statusCode || 500).json(err.message);
  }
});

app.post("/checkout-webhook", express.raw({type: "application/json"}), async (request, response) => {
  // Verify the event genuinely came from Stripe using the webhook signing secret.
  // On Cloud Functions the untouched request bytes are exposed as request.rawBody;
  // the parsed body cannot be used for signature verification.
  const webhookSecret = functions.config().stripe.webhook_secret;

  if (!webhookSecret) {
    console.error("Stripe webhook secret is not configured; rejecting unverified event.");
    return response.status(500).send("Webhook secret not configured");
  }

  let event;
  const signature = request.headers["stripe-signature"];
  try {
    event = stripe.webhooks.constructEvent(request.rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("⚠️  Webhook signature verification failed.", err.message);
    return response.status(400).send(`Webhook Error: ${err.message}`);
  }

  // A completed checkout (or a delayed payment method settling later) marks the order
  // paid, numbers it and puts it in the kitchen queue. On failure, return 500 so
  // Stripe retries; markOrderPaid is safe to repeat.
  const paidEvents = [
    "checkout.session.completed",
    "checkout.session.async_payment_succeeded",
  ];
  if (paidEvents.includes(event.type)) {
    try {
      await markOrderPaid(firestore, event.data.object);
    } catch (err) {
      console.error("Failed to record paid order", event.data.object.id, err);
      return response.status(500).send("Failed to record order");
    }
  }

  response.sendStatus(200);
});

// app.listen(PORT, () => {
//   console.log("API os listening on port", PORT);
// });

exports.payments = functions.https.onRequest(app);

// Menu import: the dashboard uploads a photo/PDF/doc/spreadsheet of the menu to
// menu-imports/{restaurantId}/ and calls this with its path. Returns draft categories
// for the owner to review; it never writes the live menu.
// Needs the Claude API key as a secret: firebase functions:secrets:set ANTHROPIC_API_KEY
exports.importMenu = functions
    .runWith({secrets: ["ANTHROPIC_API_KEY"], timeoutSeconds: 300, memory: "1GB"})
    .https.onCall(async (data, context) => {
      const restaurantId = data && data.restaurantId;
      try {
        await menuImport.assertCanImport(firestore, context.auth, restaurantId);
        const file = admin.storage().bucket().file(menuImport.importPath(restaurantId, data.path));
        const [exists] = await file.exists();
        if (!exists) throw new menuImport.ImportError("not-found", "That upload can't be found. Please try again.");
        const [[metadata], [buffer]] = await Promise.all([file.getMetadata(), file.download()]);
        const blocks = await menuImport.toContentBlocks(buffer, metadata.contentType, data.fileName || metadata.name);

        const Anthropic = require("@anthropic-ai/sdk");
        const client = new Anthropic({apiKey: process.env.ANTHROPIC_API_KEY});
        const draft = await menuImport.extractMenu(client, blocks);
        await file.delete().catch(() => {}); // the upload is only needed for this import
        return draft;
      } catch (err) {
        if (err instanceof menuImport.ImportError) {
          const code = ["unauthenticated", "permission-denied", "invalid-argument", "not-found"].includes(err.code) ?
            err.code : "failed-precondition";
          throw new functions.https.HttpsError(code, err.message, {reason: err.code});
        }
        console.error("Menu import failed", restaurantId, err);
        throw new functions.https.HttpsError("internal", "Something went wrong reading that menu. Please try again.");
      }
    });
