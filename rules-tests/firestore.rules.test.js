// Security contract for the shared menudock-platform Firestore, verified against the
// real rules in the local emulator. Run: npm test (from this folder).
const fs = require("fs");
const path = require("path");
const { initializeTestEnvironment, assertSucceeds, assertFails } = require("@firebase/rules-unit-testing");
const { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs } = require("firebase/firestore");

let env;
const TACO = "taco-monster";
const NOODLE = "noodle-lab";

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-menudock",
    firestore: { rules: fs.readFileSync(path.join(__dirname, "..", "firestore.rules"), "utf8") },
  });
});
afterAll(() => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const id of [TACO, NOODLE]) {
      await setDoc(doc(db, "restaurants", id), {
        slug: id, name: id, status: "active",
        payments: { provider: "stripe-connect", stripeAccountId: `acct_${id}` },
        billing: { platformFeePercent: 5, monthlyRetainer: 129, setupFee: 300 },
        contact: { phone: "020" },
      });
      await setDoc(doc(db, "restaurants", id, "menu", "tacos"), { category: "Tacos", order: 1, items: [] });
    }
    await setDoc(doc(db, "owners", "tacoOwner"), { restaurantId: TACO, role: "owner" });
    await setDoc(doc(db, "owners", "noodleOwner"), { restaurantId: NOODLE, role: "owner" });
    await setDoc(doc(db, "orders", "o1"), { restaurantId: TACO, payment_status: "paid", total: 10 });
    await setDoc(doc(db, "orders", "o2"), { restaurantId: NOODLE, payment_status: "paid", total: 12 });
    await setDoc(doc(db, "restaurants", TACO, "customers", "diner1"), { name: "Ann", points: 40 });
    await setDoc(doc(db, "domains", "order.tacomonster.co.uk"), { restaurantId: TACO });
  });
});

const anon = () => env.unauthenticatedContext().firestore();
const user = (uid, claims) => env.authenticatedContext(uid, claims).firestore();
const tacoOwner = () => user("tacoOwner");
const admin = () => user("adminUid", { admin: true });

describe("public website / loyalty app reads", () => {
  it("anyone can read restaurant config, menus and domains", async () => {
    await assertSucceeds(getDoc(doc(anon(), "restaurants", TACO)));
    await assertSucceeds(getDoc(doc(anon(), "restaurants", TACO, "menu", "tacos")));
    await assertSucceeds(getDoc(doc(anon(), "domains", "order.tacomonster.co.uk")));
  });
  it("the public cannot change a menu", async () => {
    await assertFails(setDoc(doc(anon(), "restaurants", TACO, "menu", "tacos"), { items: [] }));
  });
});

describe("owner dashboard — menu editing", () => {
  it("an owner can edit their own menu", async () => {
    await assertSucceeds(setDoc(doc(tacoOwner(), "restaurants", TACO, "menu", "tacos"), { category: "Tacos", order: 1, items: [{ name: "Soft Taco", price: 2.15 }] }));
    await assertSucceeds(setDoc(doc(tacoOwner(), "restaurants", TACO, "menu", "drinks"), { category: "Drinks", order: 2, items: [] }));
    await assertSucceeds(deleteDoc(doc(tacoOwner(), "restaurants", TACO, "menu", "drinks")));
  });
  it("an owner cannot touch another restaurant's menu", async () => {
    await assertFails(setDoc(doc(tacoOwner(), "restaurants", NOODLE, "menu", "tacos"), { items: [] }));
    await assertFails(deleteDoc(doc(tacoOwner(), "restaurants", NOODLE, "menu", "tacos")));
  });
  it("a signed-in user who isn't an owner cannot edit any menu", async () => {
    await assertFails(setDoc(doc(user("rando"), "restaurants", TACO, "menu", "tacos"), { items: [] }));
  });
});

describe("owner dashboard — restaurant details", () => {
  it("an owner can update their restaurant's everyday details", async () => {
    await assertSucceeds(updateDoc(doc(tacoOwner(), "restaurants", TACO), { "contact.phone": "0207 000 0000" }));
  });
  it("an owner cannot redirect payouts to another Stripe account", async () => {
    await assertFails(updateDoc(doc(tacoOwner(), "restaurants", TACO), { "payments.stripeAccountId": "acct_attacker" }));
  });
  it("an owner cannot change MenuDock's fees", async () => {
    await assertFails(updateDoc(doc(tacoOwner(), "restaurants", TACO), { "billing.platformFeePercent": 0 }));
  });
  it("an owner cannot activate/pause their restaurant or change its slug", async () => {
    await assertFails(updateDoc(doc(tacoOwner(), "restaurants", TACO), { status: "paused" }));
    await assertFails(updateDoc(doc(tacoOwner(), "restaurants", TACO), { slug: "free-tacos" }));
  });
  it("an owner cannot delete their restaurant or create new ones", async () => {
    await assertFails(deleteDoc(doc(tacoOwner(), "restaurants", TACO)));
    await assertFails(setDoc(doc(tacoOwner(), "restaurants", "my-new-place"), { name: "x" }));
  });
  it("an owner cannot edit another restaurant at all", async () => {
    await assertFails(updateDoc(doc(tacoOwner(), "restaurants", NOODLE), { "contact.phone": "x" }));
  });
});

describe("owner dashboard — orders", () => {
  it("an owner can live-query their own restaurant's orders", async () => {
    const q = query(collection(tacoOwner(), "orders"), where("restaurantId", "==", TACO));
    const snap = await assertSucceeds(getDocs(q));
    expect(snap.docs.map((d) => d.id)).toEqual(["o1"]);
  });
  it("an owner cannot read another restaurant's orders, or list all orders", async () => {
    await assertFails(getDocs(query(collection(tacoOwner(), "orders"), where("restaurantId", "==", NOODLE))));
    await assertFails(getDocs(collection(tacoOwner(), "orders")));
    await assertFails(getDoc(doc(tacoOwner(), "orders", "o2")));
  });
  it("nobody can mark an order paid from a client (only the Stripe webhook can)", async () => {
    await assertFails(updateDoc(doc(tacoOwner(), "orders", "o1"), { payment_status: "paid", total: 0 }));
    await assertFails(updateDoc(doc(anon(), "orders", "o1"), { payment_status: "paid" }));
  });
});

describe("website checkout — creating orders", () => {
  it("a customer can create a pending order for a restaurant", async () => {
    await assertSucceeds(setDoc(doc(anon(), "orders", "cs_1"), { restaurantId: TACO, payment_status: "pending", total: 9 }));
  });
  it("a customer cannot create an order that claims to be already paid", async () => {
    await assertFails(setDoc(doc(anon(), "orders", "cs_2"), { restaurantId: TACO, payment_status: "paid", total: 9 }));
  });
  it("an order must name a restaurant", async () => {
    await assertFails(setDoc(doc(anon(), "orders", "cs_3"), { payment_status: "pending", total: 9 }));
  });
  it("the public cannot read orders (customer details are private)", async () => {
    await assertFails(getDoc(doc(anon(), "orders", "o1")));
  });
});

describe("tenancy & account integrity", () => {
  it("an owner can read their own owner mapping but not reassign themselves", async () => {
    await assertSucceeds(getDoc(doc(tacoOwner(), "owners", "tacoOwner")));
    await assertFails(setDoc(doc(tacoOwner(), "owners", "tacoOwner"), { restaurantId: NOODLE }));
    await assertFails(getDoc(doc(tacoOwner(), "owners", "noodleOwner")));
  });
  it("an owner cannot hijack a custom domain", async () => {
    await assertFails(setDoc(doc(tacoOwner(), "domains", "order.noodlelab.co.uk"), { restaurantId: TACO }));
  });
  it("only an admin can provision owners and domains", async () => {
    await assertSucceeds(setDoc(doc(admin(), "owners", "newOwner"), { restaurantId: TACO, role: "owner" }));
    await assertSucceeds(setDoc(doc(admin(), "domains", "new.example.com"), { restaurantId: TACO }));
  });
});

describe("loyalty customer profiles are private", () => {
  it("a customer can read their own profile", async () => {
    await assertSucceeds(getDoc(doc(user("diner1"), "restaurants", TACO, "customers", "diner1")));
  });
  it("a customer cannot read someone else's profile; the public cannot read any", async () => {
    await assertFails(getDoc(doc(user("diner2"), "restaurants", TACO, "customers", "diner1")));
    await assertFails(getDoc(doc(anon(), "restaurants", TACO, "customers", "diner1")));
  });
  it("another restaurant's owner cannot read this restaurant's customers", async () => {
    await assertFails(getDoc(doc(user("noodleOwner"), "restaurants", TACO, "customers", "diner1")));
  });
  it("the restaurant's own owner can see their customers", async () => {
    await assertSucceeds(getDoc(doc(tacoOwner(), "restaurants", TACO, "customers", "diner1")));
  });
  test.todo("KNOWN GAP (points phase): customers can currently write their own points — move awarding to the Stripe webhook and make points admin-only");
});

describe("MenuDock admin console", () => {
  it("an admin can manage any restaurant, including payments, billing and status", async () => {
    await assertSucceeds(updateDoc(doc(admin(), "restaurants", NOODLE), { status: "paused", "billing.platformFeePercent": 7, "payments.stripeAccountId": "acct_new" }));
    await assertSucceeds(getDocs(collection(admin(), "orders")));
  });
});
