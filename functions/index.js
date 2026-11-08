/* eslint-disable camelcase */
/* eslint-disable max-len */
const functions = require("firebase-functions");
const {defineInt, defineSecret} = require("firebase-functions/params");
const admin = require("firebase-admin");
admin.initializeApp();
const firestore = admin.firestore();
const express = require("express");
const cors = require("cors");
const {markOrderPaid} = require("./orders");
const menuImport = require("./menuImport");
const loyalty = require("./loyalty");

// Configuration. Keys are Cloud Secret Manager secrets (firebase deploy asks for any
// that aren't set yet); the platform fee is a plain param, set in functions/.env.
// These replace functions.config(), which Google is shutting down.
const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");
const anthropicApiKey = defineSecret("ANTHROPIC_API_KEY");
const platformFeePercent = defineInt("PLATFORM_FEE_PERCENT", {
  default: 5,
  description: "MenuDock's default fee on each order, as a percentage of the item subtotal.",
});

// Secrets are only readable while a request is running, so create the client lazily.
let stripeClient;
const stripe = () => {
  if (!stripeClient) stripeClient = require("stripe")(stripeSecretKey.value());
  return stripeClient;
};

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
 * override it via payments.applicationFeePercent; otherwise PLATFORM_FEE_PERCENT applies.
 * @param {number} total Item subtotal in major currency units.
 * @param {Object} restaurant The restaurant record.
 * @return {number} Fee in minor units (e.g. pence); 0 when no fee configured.
 */
function applicationFeeAmount(total, restaurant) {
  const percent = Number(
      restaurant?.payments?.applicationFeePercent ?? platformFeePercent.value() ?? 0,
  );
  if (!percent || percent <= 0) return 0;
  return Math.round(total * (percent / 100) * 100); // minor units (e.g. pence)
}

/**
 * The loyalty member placing this order, if the request carries their Firebase ID
 * token (the loyalty app sends one; the website doesn't). Invalid tokens are ignored
 * rather than failing the order: the customer just won't be pre-linked for points.
 * @param {Object} req Express request.
 * @return {Promise<Object|null>} Decoded ID token, or null.
 */
async function signedInCustomer(req) {
  const match = /^Bearer (.+)$/.exec(req.headers.authorization || "");
  if (!match) return null;
  try {
    return await admin.auth().verifyIdToken(match[1]);
  } catch (err) {
    console.warn("Ignoring invalid ID token on checkout", err.code || err.message);
    return null;
  }
}

/**
 * Where Stripe sends the customer afterwards. Browsers send an Origin header (the
 * website); the loyalty app doesn't, so it lands on the restaurant's website order
 * page instead: restaurants/{id}.websiteUrl, else its first domains/{hostname} entry.
 * @param {Object} req Express request.
 * @param {Object} restaurant Restaurant record.
 * @return {Promise<string|null>} Origin such as https://order.example.com, or null.
 */
async function returnOrigin(req, restaurant) {
  if (req.headers.origin) return req.headers.origin;
  if (restaurant.websiteUrl) return String(restaurant.websiteUrl).replace(/\/+$/, "");
  const domains = await firestore.collection("domains").where("restaurantId", "==", restaurant.id).limit(1).get();
  return domains.empty ? null : `https://${domains.docs[0].id}`;
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

    const origin = await returnOrigin(req, restaurant);
    if (!origin) {
      return res.status(400).json("This restaurant has no website address set up for app orders yet");
    }
    const member = await signedInCustomer(req);

    const sessionParams = {
      line_items: transformedItems,
      mode: "payment",
      success_url: `${origin}/order-success/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/order-cancel/?session_id={CHECKOUT_SESSION_ID}`,
      shipping_options,
      allow_promotion_codes: true,
      // customerUid links the order to a loyalty member for points (set only from a
      // verified ID token, never from the request body).
      metadata: {restaurantId, ...(member ? {customerUid: member.uid} : {})},
      ...(member && member.email ? {customer_email: member.email} : {}),
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

    const session = await stripe().checkout.sessions.create(sessionParams);
    res.json(session);
  } catch (err) {
    res.status(err.statusCode || 500).json(err.message);
  }
});

app.post("/checkout-webhook", express.raw({type: "application/json"}), async (request, response) => {
  // Verify the event genuinely came from Stripe using the webhook signing secret.
  // On Cloud Functions the untouched request bytes are exposed as request.rawBody;
  // the parsed body cannot be used for signature verification.
  const webhookSecret = stripeWebhookSecret.value();

  if (!webhookSecret) {
    console.error("Stripe webhook secret is not configured; rejecting unverified event.");
    return response.status(500).send("Webhook secret not configured");
  }

  let event;
  const signature = request.headers["stripe-signature"];
  try {
    event = stripe().webhooks.constructEvent(request.rawBody, signature, webhookSecret);
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
    const session = event.data.object;
    try {
      const order = await markOrderPaid(firestore, session);
      // Loyalty points from what Stripe charged; also safe to repeat on a retry.
      await loyalty.awardOrderPoints(firestore, admin.auth(), session, order);
    } catch (err) {
      console.error("Failed to record paid order", session.id, err);
      return response.status(500).send("Failed to record order");
    }
  }

  response.sendStatus(200);
});

// app.listen(PORT, () => {
//   console.log("API os listening on port", PORT);
// });

exports.payments = functions
    .runWith({secrets: [stripeSecretKey, stripeWebhookSecret]})
    .https.onRequest(app);

// Menu import: the dashboard uploads a photo/PDF/doc/spreadsheet of the menu to
// menu-imports/{restaurantId}/ and calls this with its path. Returns draft categories
// for the owner to review; it never writes the live menu.
// Needs the Claude API key as a secret: firebase functions:secrets:set ANTHROPIC_API_KEY
exports.importMenu = functions
    .runWith({secrets: [anthropicApiKey], timeoutSeconds: 300, memory: "1GB"})
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
        const client = new Anthropic({apiKey: anthropicApiKey.value()});
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

// Loyalty app, after sign-in: collects points earned on orders paid with this
// member's email before they joined (or before they verified it). Needs a verified
// email, so nobody can claim someone else's points by signing up with their address.
exports.claimLoyaltyPoints = functions.https.onCall(async (data, context) => {
  const restaurantId = data && data.restaurantId;
  const token = context.auth && context.auth.token;
  if (!token) throw new functions.https.HttpsError("unauthenticated", "Please sign in again.");
  if (!restaurantId || typeof restaurantId !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "Missing restaurant.");
  }
  if (!token.email || token.email_verified !== true) {
    throw new functions.https.HttpsError("failed-precondition", "Verify your email address to collect points.");
  }
  return loyalty.claimUnclaimedPoints(firestore, {uid: context.auth.uid, email: token.email}, restaurantId);
});
