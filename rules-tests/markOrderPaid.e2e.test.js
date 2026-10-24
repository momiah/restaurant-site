// End-to-end: run the Stripe webhook's order logic (markOrderPaid, Admin SDK) against
// the Firestore emulator. Checks order numbering, retries and status handling.
const path = require("path");
const admin = require(path.join(__dirname, "..", "functions", "node_modules", "firebase-admin"));
const { markOrderPaid, FIRST_ORDER_NUMBER } = require("../functions/orders");

const TACO = "taco-monster";
let db;

beforeAll(() => {
  admin.initializeApp({ projectId: "demo-menudock" }, "webhook");
  db = admin.app("webhook").firestore();
});
afterAll(() => admin.app("webhook").delete());

beforeEach(async () => {
  await db.recursiveDelete(db.collection("orders"));
  await db.recursiveDelete(db.collection("restaurants"));
});

const session = (id, overrides = {}) => ({
  id,
  payment_status: "paid",
  currency: "gbp",
  created: 1700000000,
  customer_details: { name: "Ann", email: "ann@example.com" },
  metadata: { restaurantId: TACO },
  ...overrides,
});
const pendingOrder = (id, extra = {}) =>
  db.collection("orders").doc(id).set({ restaurantId: TACO, payment_status: "pending", total: 9, ...extra });
const read = async (id) => (await db.collection("orders").doc(id).get()).data();

it("numbers paid orders per restaurant, starting at 1001", async () => {
  await pendingOrder("cs_a");
  await pendingOrder("cs_b");
  await markOrderPaid(db, session("cs_a"));
  await markOrderPaid(db, session("cs_b"));

  const a = await read("cs_a");
  const b = await read("cs_b");
  expect(a).toMatchObject({ orderNumber: FIRST_ORDER_NUMBER, payment_status: "paid", status: "placed", total: 9 });
  expect(a.statusTimes.placed).toBeInstanceOf(admin.firestore.Timestamp);
  expect(b.orderNumber).toBe(FIRST_ORDER_NUMBER + 1);
});

it("keeps separate number sequences for each restaurant", async () => {
  await pendingOrder("cs_a");
  await db.collection("orders").doc("cs_n").set({ restaurantId: "noodle-lab", payment_status: "pending" });
  await markOrderPaid(db, session("cs_a"));
  const res = await markOrderPaid(db, session("cs_n", { metadata: { restaurantId: "noodle-lab" } }));
  expect(res).toEqual({ orderNumber: FIRST_ORDER_NUMBER, restaurantId: "noodle-lab" });
});

it("is safe for Stripe to retry: same number, kitchen progress kept", async () => {
  await pendingOrder("cs_a");
  await markOrderPaid(db, session("cs_a"));
  await db.collection("orders").doc("cs_a").update({ status: "preparing" });

  await markOrderPaid(db, session("cs_a"));
  const a = await read("cs_a");
  expect(a.orderNumber).toBe(FIRST_ORDER_NUMBER);
  expect(a.status).toBe("preparing");
  const counter = await db.doc(`restaurants/${TACO}/counters/orders`).get();
  expect(counter.get("next")).toBe(FIRST_ORDER_NUMBER + 1);
});

it("does not number or queue an order whose payment has not settled", async () => {
  await pendingOrder("cs_a");
  const res = await markOrderPaid(db, session("cs_a", { payment_status: "unpaid" }));
  expect(res.orderNumber).toBeUndefined();
  const a = await read("cs_a");
  expect(a.payment_status).toBe("unpaid");
  expect(a.status).toBeUndefined();
  expect(a.orderNumber).toBeUndefined();
});

it("moves legacy 'active' orders onto the new workflow", async () => {
  await pendingOrder("cs_old", { status: "active" });
  await markOrderPaid(db, session("cs_old"));
  expect((await read("cs_old")).status).toBe("placed");
});

it("falls back to the session metadata when the order doc is missing", async () => {
  const res = await markOrderPaid(db, session("cs_orphan"));
  expect(res.restaurantId).toBe(TACO);
  expect(await read("cs_orphan")).toMatchObject({ restaurantId: TACO, orderNumber: FIRST_ORDER_NUMBER });
});

it("refuses an order it cannot tie to a restaurant", async () => {
  await expect(markOrderPaid(db, session("cs_x", { metadata: {} }))).rejects.toThrow(/no restaurantId/);
});
