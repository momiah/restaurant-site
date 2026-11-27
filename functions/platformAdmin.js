/* eslint-disable max-len */
// MenuDock admin actions that need the server: setting up a restaurant's Stripe account
// (and the link its owner uses to finish it) and creating the owner's tablet login.
// Only callers with the `admin: true` custom claim may use them.
const crypto = require("crypto");
const {FieldValue} = require("firebase-admin/firestore");

/** A problem whose message is safe to show in the admin console. */
class AdminError extends Error {
  /**
   * @param {string} code Callable error code (permission-denied, not-found, ...).
   * @param {string} message Admin-facing explanation.
   */
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/**
 * Throws unless the caller is a MenuDock admin.
 * @param {Object|undefined} auth Callable context.auth.
 * @return {void}
 */
function assertAdmin(auth) {
  if (!auth || !auth.uid) throw new AdminError("unauthenticated", "Please sign in again.");
  if (!auth.token || auth.token.admin !== true) throw new AdminError("permission-denied", "Only MenuDock admins can do this.");
}

/**
 * Loads a restaurant by id.
 * @param {Object} db Firestore (Admin SDK).
 * @param {*} restaurantId Restaurant id from the request.
 * @return {Promise<Object>} The restaurant snapshot.
 */
async function getRestaurant(db, restaurantId) {
  if (!restaurantId || typeof restaurantId !== "string") throw new AdminError("invalid-argument", "Missing restaurant.");
  const snap = await db.collection("restaurants").doc(restaurantId).get();
  if (!snap.exists) throw new AdminError("not-found", "That restaurant doesn't exist.");
  return snap;
}

// ---------------------------------------------------------------------------
// Stripe Connect onboarding
//
// The restaurant's Express account and a secret link token live in
// stripeOnboarding/{restaurantId}, which no app can read (restaurants/* is public).
// The link we hand the admin points at our own /stripe-onboarding endpoint, which
// makes a fresh Stripe onboarding page each time it's opened, so it never expires
// while the owner gets round to it. payments.stripeAccountId is only set once Stripe
// says the account can take payments, so checkout never routes money to a
// half-finished account.
// ---------------------------------------------------------------------------

const onboardingRef = (db, restaurantId) => db.collection("stripeOnboarding").doc(restaurantId);

/**
 * Whether a Stripe account can receive orders' money.
 * @param {Object} account Stripe account.
 * @return {boolean} Ready for destination charges.
 */
function accountReady(account) {
  const transfers = account.capabilities && account.capabilities.transfers;
  return Boolean(account.charges_enabled && transfers === "active");
}

/**
 * Summary of a Stripe account for the restaurant record (shown in the admin console).
 * @param {Object} account Stripe account.
 * @return {Object} Status fields.
 */
function accountStatus(account) {
  const due = (account.requirements && account.requirements.currently_due) || [];
  return {
    accountId: account.id,
    ready: accountReady(account),
    chargesEnabled: Boolean(account.charges_enabled),
    payoutsEnabled: Boolean(account.payouts_enabled),
    detailsSubmitted: Boolean(account.details_submitted),
    stillNeeded: due.length,
    livemode: Boolean(account.livemode),
  };
}

/**
 * Re-reads the restaurant's Stripe account and records where it's up to. Once it's
 * ready, its id goes on payments.stripeAccountId and orders start paying into it.
 * @param {Object} db Firestore (Admin SDK).
 * @param {Object} stripe Stripe client.
 * @param {string} restaurantId Restaurant id.
 * @return {Promise<Object|null>} The status, or null if no account was set up here.
 */
async function syncStripeAccount(db, stripe, restaurantId) {
  const pending = await onboardingRef(db, restaurantId).get();
  if (!pending.exists) return null;
  const account = await stripe.accounts.retrieve(pending.get("accountId"));
  const status = accountStatus(account);
  const update = {
    "payments.stripeStatus": {...status, checkedAt: FieldValue.serverTimestamp()},
  };
  if (status.ready) {
    update["payments.provider"] = "stripe-connect";
    update["payments.stripeAccountId"] = account.id;
    update["payments.stripeLivemode"] = status.livemode;
  }
  await db.collection("restaurants").doc(restaurantId).update(update);
  return status;
}

/**
 * Makes (or reuses) the restaurant's Stripe Express account and returns the link to
 * send its owner. An account made with a test key is replaced once the key is live.
 * @param {Object} db Firestore (Admin SDK).
 * @param {Object} stripe Stripe client.
 * @param {{restaurantId: string, baseUrl: string, livemode: boolean}} args Request.
 * @return {Promise<{url: string, accountId: string, status: Object}>} Link and status.
 */
async function stripeOnboardingLink(db, stripe, {restaurantId, baseUrl, livemode}) {
  const restaurant = await getRestaurant(db, restaurantId);
  const ref = onboardingRef(db, restaurantId);
  const existing = await ref.get();

  let account = null;
  if (existing.exists && existing.get("livemode") === livemode) {
    try {
      account = await stripe.accounts.retrieve(existing.get("accountId"));
    } catch (err) {
      if (err.code !== "resource_missing" && err.statusCode !== 404) throw err;
    }
  }
  let token = existing.exists && account ? existing.get("token") : null;
  if (!account) {
    const r = restaurant.data();
    account = await stripe.accounts.create({
      type: "express",
      country: "GB",
      email: (r.contact && r.contact.email) || undefined,
      capabilities: {card_payments: {requested: true}, transfers: {requested: true}},
      business_profile: {name: r.name || restaurantId, product_description: "Takeaway food ordered online"},
      metadata: {restaurantId},
    });
    token = crypto.randomBytes(24).toString("hex");
    await ref.set({accountId: account.id, token, livemode, createdAt: FieldValue.serverTimestamp()});
  }
  const status = accountStatus(account);
  await db.collection("restaurants").doc(restaurantId).update({"payments.stripeStatus": {...status, checkedAt: FieldValue.serverTimestamp()}});
  const query = `r=${encodeURIComponent(restaurantId)}&t=${token}`;
  return {url: `${baseUrl}/stripe-onboarding?${query}`, accountId: account.id, status};
}

/**
 * Checks the token in an onboarding link and returns the account it's for.
 * @param {Object} db Firestore (Admin SDK).
 * @param {*} restaurantId From the link.
 * @param {*} token From the link.
 * @return {Promise<string|null>} Stripe account id, or null if the link is wrong.
 */
async function accountForLink(db, restaurantId, token) {
  if (typeof restaurantId !== "string" || !restaurantId || restaurantId.includes("/") || typeof token !== "string") return null;
  const snap = await onboardingRef(db, restaurantId).get();
  if (!snap.exists) return null;
  const expected = Buffer.from(String(snap.get("token")));
  const given = Buffer.from(token);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  return snap.get("accountId");
}

/**
 * A fresh Stripe-hosted onboarding page for the owner (Stripe's own links expire within
 * minutes, so we make one each time our link is opened).
 * @param {Object} db Firestore (Admin SDK).
 * @param {Object} stripe Stripe client.
 * @param {{restaurantId: string, token: string, baseUrl: string}} args From the link.
 * @return {Promise<string|null>} Stripe URL to redirect to, or null if the link is wrong.
 */
async function onboardingRedirect(db, stripe, {restaurantId, token, baseUrl}) {
  const accountId = await accountForLink(db, restaurantId, token);
  if (!accountId) return null;
  const query = `r=${encodeURIComponent(restaurantId)}&t=${token}`;
  const link = await stripe.accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    refresh_url: `${baseUrl}/stripe-onboarding?${query}`,
    return_url: `${baseUrl}/stripe-onboarding-done?${query}`,
  });
  return link.url;
}

// ---------------------------------------------------------------------------
// Owner logins
// ---------------------------------------------------------------------------

/**
 * A temporary password that's easy to read out or type on a tablet: 3 words-ish
 * blocks of letters and digits, no look-alike characters.
 * @return {string} e.g. "Kp7m-Tx4q-Hw9z".
 */
function temporaryPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(12);
  const out = Array.from(bytes, (b) => chars[b % chars.length]).join("");
  return `${out.slice(0, 4)}-${out.slice(4, 8)}-${out.slice(8, 12)}`;
}

/**
 * Creates the owner's kitchen-tablet login (or links an existing one) to a restaurant.
 * A new login gets a temporary password, returned once for the admin to pass on.
 * @param {Object} db Firestore (Admin SDK).
 * @param {Object} auth Firebase Auth (Admin SDK).
 * @param {{restaurantId: string, email: string}} args Request.
 * @return {Promise<{uid: string, email: string, created: boolean, temporaryPassword: (string|null)}>} Result.
 */
async function createOwnerLogin(db, auth, {restaurantId, email}) {
  const restaurant = await getRestaurant(db, restaurantId);
  const address = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) throw new AdminError("invalid-argument", "Enter the owner's email address.");

  let user;
  let password = null;
  try {
    user = await auth.getUserByEmail(address);
  } catch (err) {
    if (err.code !== "auth/user-not-found") throw err;
    password = temporaryPassword();
    user = await auth.createUser({email: address, password, displayName: `${restaurant.get("name") || restaurantId} owner`});
  }
  if (user.customClaims && user.customClaims.admin === true) {
    throw new AdminError("failed-precondition", "That's a MenuDock admin login. Use the restaurant owner's own email.");
  }

  const ownerRef = db.collection("owners").doc(user.uid);
  const owner = await ownerRef.get();
  if (owner.exists && owner.get("restaurantId") !== restaurantId) {
    throw new AdminError("already-exists", `${address} already runs another restaurant (${owner.get("restaurantId")}). Use a different email.`);
  }
  await ownerRef.set({restaurantId, role: "owner", email: address, updatedAt: FieldValue.serverTimestamp()}, {merge: true});
  return {uid: user.uid, email: address, created: Boolean(password), temporaryPassword: password};
}

module.exports = {
  AdminError,
  accountForLink,
  accountReady,
  accountStatus,
  assertAdmin,
  createOwnerLogin,
  onboardingRedirect,
  stripeOnboardingLink,
  syncStripeAccount,
  temporaryPassword,
};
