/* eslint-disable */
/**
 * Create (or find) a restaurant owner's login and link it to their restaurant, so they
 * can sign in to the owner dashboard and manage ONLY that restaurant (menu, orders).
 *
 * Usage (from the functions/ directory):
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json \
 *   node scripts/makeOwner.js owner@restaurant.com 'TempPassw0rd!' taco-monster
 *
 * Arguments: <email> <password> <restaurant slug or document id>
 * - New email: creates the login with that password.
 * - Existing email: links it (password is left unchanged).
 * - Safe to re-run. Refuses to move a login that already owns a different restaurant.
 */
const admin = require("firebase-admin");

async function findRestaurant(db, slugOrId) {
  const byId = await db.collection("restaurants").doc(slugOrId).get();
  if (byId.exists) return byId;
  const bySlug = await db.collection("restaurants").where("slug", "==", slugOrId).limit(1).get();
  return bySlug.empty ? null : bySlug.docs[0];
}

async function makeOwner({ email, password, restaurant }) {
  if (!admin.apps.length) admin.initializeApp();
  const db = admin.firestore();

  const r = await findRestaurant(db, restaurant);
  if (!r) throw new Error(`No restaurant found with slug or id "${restaurant}".`);

  let user;
  try {
    user = await admin.auth().getUserByEmail(email);
  } catch (e) {
    if (e.code !== "auth/user-not-found") throw e;
    if (!password) throw new Error("This email has no login yet — pass a password to create one.");
    user = await admin.auth().createUser({ email, password, displayName: `${r.get("name") || r.id} owner` });
  }

  // One owner login maps to exactly one restaurant.
  const existing = await db.collection("owners").doc(user.uid).get();
  if (existing.exists && existing.get("restaurantId") !== r.id) {
    throw new Error(`${email} already owns "${existing.get("restaurantId")}". Use a different email for "${r.id}".`);
  }

  await db.collection("owners").doc(user.uid).set(
    { restaurantId: r.id, role: "owner", email, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
    { merge: true }
  );
  return { uid: user.uid, restaurantId: r.id, restaurantName: r.get("name") || r.id };
}

module.exports = { makeOwner };

if (require.main === module) {
  const [email, password, restaurant] = process.argv.slice(2);
  if (!email || !restaurant) {
    console.error("Usage: node scripts/makeOwner.js <email> <password> <restaurant-slug>");
    process.exit(1);
  }
  makeOwner({ email, password, restaurant })
    .then(({ uid, restaurantName }) => {
      console.log(`✓ ${email} (${uid}) can now sign in to the owner dashboard for ${restaurantName}.`);
      process.exit(0);
    })
    .catch((e) => {
      console.error(`✗ ${e.message}`);
      process.exit(1);
    });
}
