/* eslint-disable max-len */
// Loyalty points. Awarded only here, on the server, when Stripe confirms a payment —
// never by the apps. See docs/LOYALTY.md.
//
// Who gets the points:
//  1. the customer signed in to the loyalty app when they paid (their uid is put on
//     the Stripe session by /stripe-session after verifying their ID token), or
//  2. the loyalty member whose *verified* email matches the checkout email.
// If neither, the points wait in restaurants/{id}/unclaimedPoints until someone joins
// the restaurant's loyalty app with that (verified) email and claims them.
const {FieldValue} = require("firebase-admin/firestore");

const DEFAULT_POINTS_PER_POUND = 1;

/**
 * Points earned on a paid checkout: from what Stripe actually charged for the food
 * (after discounts, excluding delivery), never from client-supplied totals.
 * @param {Object} session Stripe Checkout session.
 * @param {Object} restaurant Restaurant record.
 * @return {number} Whole points (0 if loyalty is switched off).
 */
function pointsForSession(session, restaurant) {
  const loyalty = (restaurant && restaurant.loyalty) || {};
  if (loyalty.enabled === false) return 0;
  const rate = Number(loyalty.pointsPerPound ?? DEFAULT_POINTS_PER_POUND);
  if (!Number.isFinite(rate) || rate <= 0) return 0;
  const shipping = (session.total_details && session.total_details.amount_shipping) || 0;
  const foodMinor = Math.max(0, (session.amount_total || 0) - shipping);
  return Math.floor((foodMinor / 100) * rate);
}

const normaliseEmail = (email) => (typeof email === "string" ? email.trim().toLowerCase() : "");

/**
 * Finds the loyalty member to credit for a checkout.
 * @param {Object} db Firestore (Admin SDK).
 * @param {Object} auth Firebase Auth (Admin SDK).
 * @param {string} restaurantId Restaurant id.
 * @param {Object} session Stripe Checkout session.
 * @return {Promise<{uid: string}|{email: string}|null>} Member, else email to hold points for.
 */
async function findMember(db, auth, restaurantId, session) {
  const customers = db.collection("restaurants").doc(restaurantId).collection("customers");
  const uid = session.metadata && session.metadata.customerUid;
  if (uid && (await customers.doc(uid).get()).exists) return {uid};

  const email = normaliseEmail(session.customer_details && session.customer_details.email);
  if (!email) return null;
  try {
    const user = await auth.getUserByEmail(email);
    // Only a verified email proves the account owner is the person who paid.
    if (user.emailVerified && (await customers.doc(user.uid).get()).exists) return {uid: user.uid};
  } catch (err) {
    if (err.code !== "auth/user-not-found") throw err;
  }
  return {email};
}

/**
 * Credits points for one paid order. Safe to repeat: the ledger entry (or the
 * unclaimed entry) is keyed by order id, so a retried webhook never double-counts.
 * @param {Object} db Firestore (Admin SDK).
 * @param {Object} auth Firebase Auth (Admin SDK).
 * @param {Object} session Stripe Checkout session (paid).
 * @param {{restaurantId: string, orderNumber: number}} order The numbered order.
 * @return {Promise<{points: number, status: string}|null>} What happened, or null if nothing to do.
 */
async function awardOrderPoints(db, auth, session, {restaurantId, orderNumber}) {
  if (session.payment_status !== "paid") return null;
  const restaurantRef = db.collection("restaurants").doc(restaurantId);
  const restaurant = (await restaurantRef.get()).data() || {};
  const points = pointsForSession(session, restaurant);
  if (points <= 0) return null;

  const member = await findMember(db, auth, restaurantId, session);
  if (!member) return null;

  const orderId = session.id;
  const orderRef = db.collection("orders").doc(orderId);
  const entry = {orderId, orderNumber: orderNumber || null, points, amount: (session.amount_total || 0) / 100};

  return db.runTransaction(async (tx) => {
    if (member.uid) {
      const customerRef = restaurantRef.collection("customers").doc(member.uid);
      const ledgerRef = customerRef.collection("pointsHistory").doc(orderId);
      const unclaimedRef = restaurantRef.collection("unclaimedPoints").doc(orderId);
      const [ledger, unclaimed] = await Promise.all([tx.get(ledgerRef), tx.get(unclaimedRef)]);
      if (ledger.exists) return {points, status: "awarded"};
      tx.set(ledgerRef, {...entry, type: "earn", createdAt: FieldValue.serverTimestamp()});
      tx.update(customerRef, {points: FieldValue.increment(points), lifetimePoints: FieldValue.increment(points)});
      if (unclaimed.exists) tx.delete(unclaimedRef);
      tx.set(orderRef, {loyalty: {points, status: "awarded"}}, {merge: true});
      return {points, status: "awarded"};
    }
    const unclaimedRef = restaurantRef.collection("unclaimedPoints").doc(orderId);
    if ((await tx.get(unclaimedRef)).exists) return {points, status: "unclaimed"};
    tx.set(unclaimedRef, {...entry, email: member.email, createdAt: FieldValue.serverTimestamp()});
    tx.set(orderRef, {loyalty: {points, status: "unclaimed"}}, {merge: true});
    return {points, status: "unclaimed"};
  });
}

/**
 * Moves points held for this member's verified email onto their account.
 * @param {Object} db Firestore (Admin SDK).
 * @param {{uid: string, email: string}} member Verified member.
 * @param {string} restaurantId Restaurant id.
 * @return {Promise<{claimed: number, orders: number}>} Points and orders claimed.
 */
async function claimUnclaimedPoints(db, {uid, email}, restaurantId) {
  const restaurantRef = db.collection("restaurants").doc(restaurantId);
  const customerRef = restaurantRef.collection("customers").doc(uid);
  const held = await restaurantRef.collection("unclaimedPoints").where("email", "==", normaliseEmail(email)).get();
  let claimed = 0;
  let orders = 0;
  for (const heldDoc of held.docs) {
    const got = await db.runTransaction(async (tx) => {
      const ledgerRef = customerRef.collection("pointsHistory").doc(heldDoc.id);
      const [unclaimed, ledger, customer] = await Promise.all([tx.get(heldDoc.ref), tx.get(ledgerRef), tx.get(customerRef)]);
      if (!unclaimed.exists || !customer.exists) return 0;
      tx.delete(heldDoc.ref);
      if (ledger.exists) return 0;
      const {orderId, orderNumber, points, amount} = unclaimed.data();
      tx.set(ledgerRef, {orderId, orderNumber, points, amount, type: "earn", claimed: true, createdAt: FieldValue.serverTimestamp()});
      tx.update(customerRef, {points: FieldValue.increment(points), lifetimePoints: FieldValue.increment(points)});
      tx.set(db.collection("orders").doc(orderId), {loyalty: {points, status: "awarded"}}, {merge: true});
      return points;
    });
    if (got > 0) {
      claimed += got;
      orders += 1;
    }
  }
  return {claimed, orders};
}

module.exports = {
  DEFAULT_POINTS_PER_POUND,
  awardOrderPoints,
  claimUnclaimedPoints,
  findMember,
  normaliseEmail,
  pointsForSession,
};
