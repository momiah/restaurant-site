// Ports match firebase.e2e.json, which keeps the e2e emulators clear of the
// rules-tests ones (firebase.json) so both can run at once.
// One place for the ports, ids and secrets the e2e run shares between the runner,
// the fake Stripe, the website dev server and the tests. Nothing here is real.
const PROJECT_ID = "demo-menudock";
const SITE_PORT = Number(process.env.E2E_SITE_PORT || 3100);
const FAKE_STRIPE_PORT = Number(process.env.E2E_STRIPE_PORT || 12111);
const FIRESTORE_PORT = 8180;
const FUNCTIONS_URL = `http://127.0.0.1:5101/${PROJECT_ID}/us-central1/payments`;

module.exports = {
  PROJECT_ID,
  SITE_PORT,
  FAKE_STRIPE_PORT,
  FAKE_STRIPE_URL: `http://127.0.0.1:${FAKE_STRIPE_PORT}`,
  FIRESTORE_PORT,
  FUNCTIONS_URL,
  WEBHOOK_URL: `${FUNCTIONS_URL}/checkout-webhook`,
  STRIPE_SECRET_KEY: "sk_test_e2e_fake",
  STRIPE_WEBHOOK_SECRET: "whsec_e2e_fake",
  siteUrl: (subdomain) => `http://${subdomain}.localhost:${SITE_PORT}`,
};
