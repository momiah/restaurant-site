// End-to-end: provision an owner with the real makeOwner script (Admin SDK) against the
// Auth + Firestore emulators, then sign in as that owner with the client SDK — exactly
// what the dashboard does — and check what the deployed rules let them do.
const path = require("path");
const admin = require(path.join(__dirname, "..", "functions", "node_modules", "firebase-admin"));
const { makeOwner } = require("../functions/scripts/makeOwner");
const { initializeApp, deleteApp } = require("firebase/app");
const { getAuth, connectAuthEmulator, signInWithEmailAndPassword, signOut } = require("firebase/auth");
const { getFirestore, connectFirestoreEmulator, doc, getDoc, setDoc } = require("firebase/firestore");

const PROJECT = "demo-menudock";
let client, auth, db;

beforeAll(async () => {
  admin.initializeApp({ projectId: PROJECT });
  const fdb = admin.firestore();
  await fdb.collection("restaurants").doc("taco-monster").set({ slug: "taco-monster", name: "Taco Monster", status: "active" });
  await fdb.collection("restaurants").doc("noodle-lab").set({ slug: "noodle-lab", name: "Noodle Lab", status: "active" });
  await fdb.collection("restaurants").doc("noodle-lab").collection("menu").doc("noodles").set({ category: "Noodles", order: 1, items: [] });

  client = initializeApp({ projectId: PROJECT, apiKey: "demo-key" }, "dashboard-client");
  auth = getAuth(client);
  connectAuthEmulator(auth, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, { disableWarnings: true });
  db = getFirestore(client);
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(":");
  connectFirestoreEmulator(db, host, Number(port));
});

afterAll(async () => {
  await signOut(auth).catch(() => {});
  await deleteApp(client);
  await Promise.all(admin.apps.map((a) => a.delete()));
});

it("creates the login and links it to the restaurant by slug", async () => {
  const res = await makeOwner({ email: "owner@tacomonster.test", password: "Passw0rd!", restaurant: "taco-monster" });
  expect(res.restaurantId).toBe("taco-monster");
  const mapping = await admin.firestore().collection("owners").doc(res.uid).get();
  expect(mapping.data()).toMatchObject({ restaurantId: "taco-monster", role: "owner", email: "owner@tacomonster.test" });
});

it("is safe to re-run for the same owner and restaurant", async () => {
  const again = await makeOwner({ email: "owner@tacomonster.test", password: "ignored", restaurant: "taco-monster" });
  expect(again.restaurantId).toBe("taco-monster");
});

it("refuses to silently move an owner to a different restaurant", async () => {
  await expect(makeOwner({ email: "owner@tacomonster.test", password: "x", restaurant: "noodle-lab" })).rejects.toThrow(/already owns/);
});

it("fails clearly for an unknown restaurant", async () => {
  await expect(makeOwner({ email: "new@x.test", password: "Passw0rd!", restaurant: "no-such-place" })).rejects.toThrow(/No restaurant found/);
});

it("the provisioned owner can sign in and edit their own menu — and only theirs", async () => {
  const cred = await signInWithEmailAndPassword(auth, "owner@tacomonster.test", "Passw0rd!");
  // What the dashboard reads on sign-in:
  const mapping = await getDoc(doc(db, "owners", cred.user.uid));
  expect(mapping.data().restaurantId).toBe("taco-monster");
  // What the menu editor writes:
  await setDoc(doc(db, "restaurants", "taco-monster", "menu", "tacos"), { category: "Tacos", order: 1, items: [{ name: "Soft Taco", price: 2.15 }] });
  // Another restaurant's menu is off-limits:
  await expect(setDoc(doc(db, "restaurants", "noodle-lab", "menu", "noodles"), { category: "Hacked", order: 1, items: [] })).rejects.toThrow(/PERMISSION_DENIED|permission/i);
});
