// What the kitchen tablet sees: the owner signs in (Auth emulator) and lists their
// restaurant's orders through the security rules, the same query the dashboard runs.
const {initializeApp, deleteApp} = require("firebase/app");
const {getAuth, connectAuthEmulator, signInWithEmailAndPassword} = require("firebase/auth");
const {getFirestore, connectFirestoreEmulator, collection, query, where, getDocs, doc, updateDoc} = require("firebase/firestore");
const cfg = require("./config");
const fx = require("./fixtures");

async function asOwner(fn) {
  const app = initializeApp({projectId: cfg.PROJECT_ID, apiKey: "demo-api-key"}, `kitchen-${Date.now()}`);
  try {
    const auth = getAuth(app);
    connectAuthEmulator(auth, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, {disableWarnings: true});
    const db = getFirestore(app);
    const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(":");
    connectFirestoreEmulator(db, host, Number(port));
    await signInWithEmailAndPassword(auth, fx.OWNER.email, fx.OWNER.password);
    return await fn(db);
  } finally {
    await deleteApp(app);
  }
}

const kitchenOrders = () => asOwner(async (db) => {
  const snap = await getDocs(query(collection(db, "orders"), where("restaurantId", "==", fx.RESTAURANT_ID)));
  return snap.docs.map((d) => ({id: d.id, ...d.data()})).filter((o) => o.payment_status === "paid");
});

const setKitchenStatus = (orderId, status) =>
  asOwner((db) => updateDoc(doc(db, "orders", orderId), {status}));

module.exports = {kitchenOrders, setKitchenStatus};
