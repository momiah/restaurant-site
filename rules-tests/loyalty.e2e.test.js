// End-to-end: the webhook's loyalty logic (Admin SDK) against the Auth + Firestore
// emulators — who gets points, how many, retries, and claiming held points.
const path = require("path");
const admin = require(path.join(__dirname, "..", "functions", "node_modules", "firebase-admin"));
const { markOrderPaid } = require("../functions/orders");
const { awardOrderPoints, claimUnclaimedPoints, pointsForSession } = require("../functions/loyalty");

const TACO = "taco-monster";
let app, db, auth;

beforeAll(() => {
  app = admin.initializeApp({ projectId: "demo-menudock" }, "loyalty");
  db = app.firestore();
  auth = app.auth();
});
afterAll(() => app.delete());

beforeEach(async () => {
  await db.recursiveDelete(db.collection("orders"));
  await db.recursiveDelete(db.collection("restaurants"));
  const { users } = await auth.listUsers();
  await Promise.all(users.map((u) => auth.deleteUser(u.uid)));
  await db.doc(`restaurants/${TACO}`).set({ name: "Taco Monster", loyalty: { pointsPerPound: 1 } });
});

const member = async (email, { verified = true } = {}) => {
  const u = await auth.createUser({ email, emailVerified: verified });
  await db.doc(`restaurants/${TACO}/customers/${u.uid}`).set({ email, points: 0, lifetimePoints: 0 });
  return u.uid;
};
const session = (id, extra = {}) => ({
  id,
  payment_status: "paid",
  amount_total: 2350, // £23.50 paid…
  total_details: { amount_shipping: 350 }, // …of which £3.50 was delivery
  customer_details: { email: "Ann@Example.com" },
  metadata: { restaurantId: TACO },
  ...extra,
});
const pay = async (s) => {
  await db.doc(`orders/${s.id}`).set({ restaurantId: TACO, payment_status: "pending", total: 999 }, { merge: true });
  const order = await markOrderPaid(db, s);
  return awardOrderPoints(db, auth, s, order);
};
const customer = async (uid) => (await db.doc(`restaurants/${TACO}/customers/${uid}`).get()).data();
const order = async (id) => (await db.doc(`orders/${id}`).get()).data();

it("earns on what Stripe charged for the food, not the client's total or delivery", () => {
  expect(pointsForSession(session("x"), { loyalty: { pointsPerPound: 1 } })).toBe(20);
  expect(pointsForSession(session("x"), { loyalty: { pointsPerPound: 2.5 } })).toBe(50);
  expect(pointsForSession(session("x"), {})).toBe(20); // default 1 per £1
  expect(pointsForSession(session("x"), { loyalty: { enabled: false } })).toBe(0);
});

it("credits the member signed in to the app when they paid", async () => {
  const uid = await member("someone@else.com");
  const res = await pay(session("cs_app", { metadata: { restaurantId: TACO, customerUid: uid } }));
  expect(res).toEqual({ points: 20, status: "awarded" });
  expect(await customer(uid)).toMatchObject({ points: 20, lifetimePoints: 20 });
  const ledger = await db.doc(`restaurants/${TACO}/customers/${uid}/pointsHistory/cs_app`).get();
  expect(ledger.data()).toMatchObject({ points: 20, orderNumber: 1001, type: "earn" });
  expect((await order("cs_app")).loyalty).toEqual({ points: 20, status: "awarded" });
});

it("credits a website order to the member with that verified email", async () => {
  const uid = await member("ann@example.com");
  await pay(session("cs_web"));
  expect((await customer(uid)).points).toBe(20);
});

it("a Stripe retry never double-counts", async () => {
  const uid = await member("ann@example.com");
  await pay(session("cs_web"));
  await pay(session("cs_web"));
  expect(await customer(uid)).toMatchObject({ points: 20, lifetimePoints: 20 });
});

it("holds points for unknown or unverified emails until claimed", async () => {
  const unverified = await member("ann@example.com", { verified: false });
  expect(await pay(session("cs_1"))).toEqual({ points: 20, status: "unclaimed" });
  expect(await pay(session("cs_2", { amount_total: 1000, total_details: {} }))).toEqual({ points: 10, status: "unclaimed" });
  expect((await customer(unverified)).points).toBe(0);
  expect((await order("cs_1")).loyalty).toEqual({ points: 20, status: "unclaimed" });

  // Once they verify, claiming moves everything across, once.
  await auth.updateUser(unverified, { emailVerified: true });
  expect(await claimUnclaimedPoints(db, { uid: unverified, email: "ANN@example.com" }, TACO)).toEqual({ claimed: 30, orders: 2 });
  expect(await claimUnclaimedPoints(db, { uid: unverified, email: "ann@example.com" }, TACO)).toEqual({ claimed: 0, orders: 0 });
  expect(await customer(unverified)).toMatchObject({ points: 30, lifetimePoints: 30 });
  expect((await order("cs_1")).loyalty.status).toBe("awarded");
  expect((await db.collection(`restaurants/${TACO}/unclaimedPoints`).get()).size).toBe(0);
});

it("someone else's email gets nothing from a claim", async () => {
  await pay(session("cs_1"));
  const stranger = await member("stranger@example.com");
  expect(await claimUnclaimedPoints(db, { uid: stranger, email: "stranger@example.com" }, TACO)).toEqual({ claimed: 0, orders: 0 });
  expect((await customer(stranger)).points).toBe(0);
});

it("ignores unpaid sessions and restaurants with loyalty switched off", async () => {
  const uid = await member("ann@example.com");
  expect(await pay(session("cs_x", { payment_status: "unpaid" }))).toBeNull();
  await db.doc(`restaurants/${TACO}`).set({ loyalty: { enabled: false } }, { merge: true });
  expect(await pay(session("cs_y"))).toBeNull();
  expect((await customer(uid)).points).toBe(0);
});
