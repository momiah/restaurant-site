// Admin SDK on the emulators only. emulators:exec sets FIRESTORE_EMULATOR_HOST and
// FIREBASE_AUTH_EMULATOR_HOST; refuse to run without them so nothing reaches production.
const admin = require("firebase-admin");
const {PROJECT_ID} = require("./config");
const fx = require("./fixtures");

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  throw new Error("e2e must run under the Firebase emulators (npm run e2e).");
}

const app = admin.apps.find((a) => a.name === "e2e") || admin.initializeApp({projectId: PROJECT_ID}, "e2e");
const db = app.firestore();
const auth = app.auth();

async function cleanup() {
  await db.recursiveDelete(db.doc(`restaurants/${fx.RESTAURANT_ID}`));
  const orders = await db.collection("orders").where("restaurantId", "==", fx.RESTAURANT_ID).get();
  await Promise.all(orders.docs.map((d) => d.ref.delete()));
  const owner = await auth.getUserByEmail(fx.OWNER.email).catch(() => null);
  if (owner) {
    await db.doc(`owners/${owner.uid}`).delete();
    await auth.deleteUser(owner.uid);
  }
}

async function seed() {
  await cleanup();
  await db.doc(`restaurants/${fx.RESTAURANT_ID}`).set(fx.restaurant);
  await Promise.all(fx.menu.map(({id, ...cat}) => db.doc(`restaurants/${fx.RESTAURANT_ID}/menu/${id}`).set(cat)));
  const owner = await auth.createUser({email: fx.OWNER.email, password: fx.OWNER.password});
  await db.doc(`owners/${owner.uid}`).set({restaurantId: fx.RESTAURANT_ID});
}

const getOrder = async (id) => (await db.doc(`orders/${id}`).get()).data();
const setOrdering = (patch) =>
  db.doc(`restaurants/${fx.RESTAURANT_ID}`).set({ordering: {...fx.ordering, ...patch}}, {merge: true});

module.exports = {db, auth, seed, cleanup, getOrder, setOrdering};
