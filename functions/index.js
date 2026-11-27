/* eslint-disable camelcase */
/* eslint-disable max-len */
const functions = require("firebase-functions");
const {defineFloat, defineInt, defineSecret} = require("firebase-functions/params");
const admin = require("firebase-admin");
admin.initializeApp();
const firestore = admin.firestore();
const express = require("express");
const cors = require("cors");
const {markOrderPaid} = require("./orders");
const menuImport = require("./menuImport");
const loyalty = require("./loyalty");
const checkout = require("./checkout");
const platformAdmin = require("./platformAdmin");

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
// Every restaurant pays Stripe's costs on its orders (Stripe takes them from MenuDock's
// account), on top of MenuDock's own fee: a percentage of everything charged plus a
// fixed amount per order.
const stripeCoverPercent = defineFloat("STRIPE_COVER_PERCENT", {
  default: 1.75,
  description: "Stripe costs passed on to the restaurant, as a percentage of each order (card fee + payout fee).",
});
const stripeCoverFixedPence = defineInt("STRIPE_COVER_FIXED_PENCE", {
  default: 20,
  description: "Stripe costs passed on to the restaurant, as a fixed amount per order in pence.",
});

// The e2e tests (e2e/) point Stripe at a local fake. Only honoured inside the
// Functions emulator, never in a deployed function.
const emulatorStripeApi = () => {
  const base = process.env.FUNCTIONS_EMULATOR === "true" && process.env.STRIPE_API_BASE;
  if (!base) return undefined;
  const url = new URL(base);
  return {host: url.hostname, port: url.port, protocol: url.protocol.replace(":", "")};
};

// Secrets are only readable while a request is running, so create the client lazily.
let stripeClient;
const stripe = () => {
  if (!stripeClient) stripeClient = require("stripe")(stripeSecretKey.value(), emulatorStripeApi());
  return stripeClient;
};

const isLiveKey = () => stripeSecretKey.value().startsWith("sk_live_");
// Where the payments function is reachable (links in onboarding emails point here).
const paymentsBaseUrl = () => `https://us-central1-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/payments`;

// const PORT = 8082;
const app = express();
app.use(cors({origin: true}));

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
 * Create a checkout. The website and the loyalty app send only what the customer
 * wants and their details; prices, totals and the order itself come from the server
 * (checkout.js, pricing.js), so a tampered basket can't change the charge or the
 * kitchen ticket. Returns { id, url } — the Stripe Checkout session to open.
 */
app.post("/stripe-session", async (req, res) => {
  try {
    const result = await checkout.createCheckout({
      db: firestore,
      stripe: stripe(),
      body: req.body || {},
      origin: req.headers.origin,
      member: await signedInCustomer(req),
      functionBaseUrl: `https://${req.get("host")}/payments`,
      platformFeePercent: platformFeePercent.value(),
      stripeCover: {percent: stripeCoverPercent.value(), fixedPence: stripeCoverFixedPence.value()},
      livemode: isLiveKey(),
    });
    res.json(result);
  } catch (err) {
    if (err instanceof checkout.CheckoutError) return res.status(err.status).json(err.message);
    console.error("Checkout failed", req.body && req.body.restaurantId, err);
    res.status(500).json("Something went wrong starting your payment. Please try again.");
  }
});

// Where Stripe sends app customers after paying (or cancelling): straight back into
// the loyalty app, which then shows the order's live progress.
app.get("/checkout-return", async (req, res) => {
  const url = await checkout.appReturnRedirect(firestore, req.query.session_id, req.query.result);
  if (!url) return res.status(404).send("Order not found. Please return to the app.");
  res.redirect(302, url);
});

// The link a restaurant owner gets to set up their Stripe account. It never expires:
// each visit makes a fresh Stripe onboarding page (Stripe's own expire in minutes).
const page = (title, body) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{font-family:system-ui,sans-serif;max-width:32rem;margin:15vh auto;padding:0 1rem;color:#13324f;line-height:1.5}h1{font-size:1.4rem}a{color:#0E7C7B}</style></head>
<body><h1>${title}</h1>${body}</body></html>`;

app.get("/stripe-onboarding", async (req, res) => {
  try {
    const url = await platformAdmin.onboardingRedirect(firestore, stripe(), {
      restaurantId: req.query.r, token: req.query.t, baseUrl: paymentsBaseUrl(),
    });
    if (!url) return res.status(404).send(page("Link not recognised", "<p>This link isn't valid any more. Ask MenuDock for a new one.</p>"));
    res.redirect(302, url);
  } catch (err) {
    console.error("Stripe onboarding link failed", req.query.r, err);
    res.status(500).send(page("Something went wrong", "<p>Please try the link again in a minute.</p>"));
  }
});

// Where Stripe sends the owner afterwards: record how far they got.
app.get("/stripe-onboarding-done", async (req, res) => {
  try {
    const accountId = await platformAdmin.accountForLink(firestore, req.query.r, req.query.t);
    if (!accountId) return res.status(404).send(page("Link not recognised", "<p>Ask MenuDock for a new link.</p>"));
    const status = await platformAdmin.syncStripeAccount(firestore, stripe(), req.query.r);
    if (status && status.ready) {
      return res.send(page("You're all set", "<p>Your Stripe account is ready. Payments for your online orders will go to your bank account. You can close this page.</p>"));
    }
    const again = `/payments/stripe-onboarding?r=${encodeURIComponent(req.query.r)}&t=${encodeURIComponent(req.query.t)}`;
    res.send(page("Nearly there", `<p>Stripe still needs a few details before you can take payments.</p><p><a href="${again}">Continue setting up</a></p><p>If you've just finished, Stripe may still be checking your details. MenuDock will let you know when you're live.</p>`));
  } catch (err) {
    console.error("Stripe onboarding return failed", req.query.r, err);
    res.status(500).send(page("Something went wrong", "<p>Your details are saved with Stripe. MenuDock will check and let you know.</p>"));
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

// ---------------------------------------------------------------------------
// MenuDock admin console actions (admins only; see platformAdmin.js).
// ---------------------------------------------------------------------------

/**
 * Runs an admin action, turning known problems into messages the console can show.
 * @param {string} name For logs.
 * @param {Function} fn The action.
 * @return {Promise<*>} Its result.
 */
async function adminAction(name, fn) {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof platformAdmin.AdminError) throw new functions.https.HttpsError(err.code, err.message);
    if (err.type && String(err.type).startsWith("Stripe")) {
      console.error(name, err);
      throw new functions.https.HttpsError("failed-precondition", `Stripe said: ${err.message}`);
    }
    console.error(name, err);
    throw new functions.https.HttpsError("internal", "Something went wrong. Please try again.");
  }
}

// Make (or reuse) a restaurant's Stripe account and get the link to send its owner.
exports.adminStripeOnboardingLink = functions
    .runWith({secrets: [stripeSecretKey]})
    .https.onCall((data, context) => adminAction("adminStripeOnboardingLink", async () => {
      platformAdmin.assertAdmin(context.auth);
      return platformAdmin.stripeOnboardingLink(firestore, stripe(), {
        restaurantId: data && data.restaurantId, baseUrl: paymentsBaseUrl(), livemode: isLiveKey(),
      });
    }));

// Re-check the restaurant's Stripe account; once ready, orders start paying into it.
exports.adminRefreshStripe = functions
    .runWith({secrets: [stripeSecretKey]})
    .https.onCall((data, context) => adminAction("adminRefreshStripe", async () => {
      platformAdmin.assertAdmin(context.auth);
      const status = await platformAdmin.syncStripeAccount(firestore, stripe(), data && data.restaurantId);
      if (!status) throw new platformAdmin.AdminError("failed-precondition", "No Stripe account has been set up for this restaurant yet.");
      return status;
    }));

// Create the owner's kitchen-tablet login (returns a temporary password once).
exports.adminCreateOwnerLogin = functions.https.onCall((data, context) => adminAction("adminCreateOwnerLogin", async () => {
  platformAdmin.assertAdmin(context.auth);
  return platformAdmin.createOwnerLogin(firestore, admin.auth(), {
    restaurantId: data && data.restaurantId, email: data && data.email,
  });
}));
