// End-to-end: the checkout function's logic against the Firestore emulator, with a
// fake Stripe. What gets charged and what the kitchen sees come from the menu.
const path = require("path");
const admin = require(path.join(__dirname, "..", "functions", "node_modules", "firebase-admin"));
const { createCheckout, appReturnRedirect, CheckoutError } = require("../functions/checkout");

const TACO = "taco-monster";
let app, db, stripe;

beforeAll(() => {
  app = admin.initializeApp({ projectId: "demo-menudock" }, "checkout");
  db = app.firestore();
});
afterAll(() => app.delete());

beforeEach(async () => {
  await db.recursiveDelete(db.collection("orders"));
  await db.recursiveDelete(db.collection("restaurants"));
  await db.doc(`restaurants/${TACO}`).set({
    name: "Taco Monster",
    status: "active",
    ordering: { orderTypes: ["Collection", "Delivery"], freeDeliveryThreshold: 20, deliveryFee: 2.5 },
    payments: { stripeAccountId: "acct_taco" },
  });
  await db.doc(`restaurants/${TACO}/menu/tacos`).set({
    category: "Tacos",
    order: 1,
    items: [{ name: "Burrito", price: 6.5, extras: [{ type: "Guac", price: 1 }] }],
  });
  let n = 0;
  stripe = { checkout: { sessions: { create: jest.fn(async () => ({ id: `cs_test_${++n}`, url: "https://checkout.stripe.com/pay" })) } } };
});

const base = (body, extra = {}) =>
  createCheckout({
    db,
    stripe,
    body: {
      restaurantId: TACO,
      orderType: "Collection",
      customer: { name: "Ann", contactNumber: "07700900123" },
      ...body,
    },
    origin: "https://order.tacomonster.co.uk",
    member: null,
    functionBaseUrl: "https://us-central1-demo.cloudfunctions.net/payments",
    platformFeePercent: 5,
    ...extra,
  });

it("charges menu prices even when the basket claims 1p, and writes the kitchen ticket itself", async () => {
  const res = await base({ cartItems: [{ name: "Burrito", price: 0.01, quantity: 2, extras: [{ type: "Guac", price: 0 }] }] });
  expect(res).toEqual({ id: "cs_test_1", url: "https://checkout.stripe.com/pay" });

  const params = stripe.checkout.sessions.create.mock.calls[0][0];
  expect(params.line_items).toEqual([
    { price_data: { currency: "gbp", product_data: { name: "Burrito + Guac" }, unit_amount: 750 }, quantity: 2 },
  ]);
  expect(params.payment_intent_data).toMatchObject({ transfer_data: { destination: "acct_taco" }, application_fee_amount: 75 });
  expect(params.success_url).toBe("https://order.tacomonster.co.uk/order-success/?session_id={CHECKOUT_SESSION_ID}");

  const order = (await db.doc("orders/cs_test_1").get()).data();
  expect(order).toMatchObject({
    restaurantId: TACO, payment_status: "pending", orderType: "Collection", total: 15, source: "website",
    orderItems: [{ name: "Burrito", price: 7.5, quantity: 2, extras: [{ type: "Guac", price: 1 }] }],
  });
});

it("adds the delivery fee below the free-delivery threshold, using the server's subtotal", async () => {
  await base({
    orderType: "Delivery",
    cartItems: [{ name: "Burrito", price: 100, quantity: 1 }], // claims £100 to dodge the fee
    customer: { name: "Ann", contactNumber: "07700900123", address: "1 High St", postCode: "E1 6AN" },
  });
  const params = stripe.checkout.sessions.create.mock.calls[0][0];
  expect(params.shipping_options[0].shipping_rate_data.fixed_amount.amount).toBe(250);
});

it("refuses baskets that aren't on the menu, and creates nothing", async () => {
  await expect(base({ cartItems: [{ name: "Lobster", price: 1, quantity: 1 }] })).rejects.toThrow(CheckoutError);
  expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  expect((await db.collection("orders").get()).size).toBe(0);
});

it("app orders return to the app, linked to the signed-in member", async () => {
  const res = await base(
    { cartItems: [{ name: "Burrito", quantity: 1 }], appReturnUrl: "menudock-loyalty://checkout" },
    { origin: undefined, member: { uid: "u1", email: "ann@example.com" } }
  );
  const params = stripe.checkout.sessions.create.mock.calls[0][0];
  expect(params.success_url).toBe("https://us-central1-demo.cloudfunctions.net/payments/checkout-return?session_id={CHECKOUT_SESSION_ID}&result=success");
  expect(params.metadata).toEqual({ restaurantId: TACO, customerUid: "u1" });
  expect(params.customer_email).toBe("ann@example.com");
  expect((await db.doc(`orders/${res.id}`).get()).data()).toMatchObject({ source: "loyalty-app", customerUid: "u1" });

  expect(await appReturnRedirect(db, res.id, "success")).toBe(`menudock-loyalty://checkout?orderId=${res.id}&result=success`);
  expect(await appReturnRedirect(db, res.id, "anything")).toBe(`menudock-loyalty://checkout?orderId=${res.id}&result=cancel`);
  expect(await appReturnRedirect(db, "cs_nope", "success")).toBeNull();
});

it("never redirects app customers to arbitrary websites", async () => {
  for (const appReturnUrl of ["https://evil.example", "javascript:alert(1)", "http://x"]) {
    await expect(base({ cartItems: [{ name: "Burrito", quantity: 1 }], appReturnUrl }, { origin: undefined })).rejects.toThrow(/Invalid app return address/);
  }
  await expect(base({ cartItems: [{ name: "Burrito", quantity: 1 }] }, { origin: undefined })).rejects.toThrow(/Missing return address/);
});

it("closed restaurants and unknown restaurants can't take orders", async () => {
  await db.doc(`restaurants/${TACO}`).set({ status: "paused" }, { merge: true });
  await expect(base({ cartItems: [{ name: "Burrito", quantity: 1 }] })).rejects.toThrow(/not currently accepting orders/);
  await expect(base({ restaurantId: "nope", cartItems: [] })).rejects.toThrow(/Unknown/);
});
