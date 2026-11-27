const {test, expect} = require("@playwright/test");
const site = require("../support/site");
const {getOrder} = require("../support/admin");
const {kitchenOrders, setKitchenStatus} = require("../support/kitchen");

test("browse the menu, add items with extras and pay for a Collection order; the kitchen gets it", async ({page}) => {
  await site.openMenu(page);
  await expect(page.getByRole("heading", {name: "TACOS"})).toBeVisible();
  await expect(page.getByRole("heading", {name: "DRINKS"})).toBeVisible();

  await site.addItem(page, "Classic Burrito", {protein: "Chicken", extras: ["Sour Cream", "Double protein"]});
  await site.addItem(page, "Lemonade", {times: 2});

  await site.openCart(page);
  await expect(page.getByText("Sour Cream")).toBeVisible();
  await expect(page.getByText("Classic Burrito (1)")).toBeVisible();
  await expect(page.getByText("Lemonade (2)")).toBeVisible();
  await site.fillDetails(page, {orderType: "Collection", name: "Ann Customer"});
  await site.goToCheckout(page);

  const sessionId = await site.expectFakeStripe(page);
  await expect(page.getByTestId("line")).toHaveText([
    "Classic Burrito + Sour Cream + Double protein × 1£7.90",
    "Lemonade × 2£3.00",
  ]);
  await expect(page.getByTestId("delivery-fee")).toHaveCount(0);
  await expect(page.getByTestId("total")).toHaveText("£10.90");

  const pending = await getOrder(sessionId);
  expect(pending).toMatchObject({payment_status: "pending", orderType: "Collection", total: 10.9, source: "website", name: "Ann Customer"});

  await site.pay(page);
  await expect(page.getByTestId("order-status")).toHaveText("Order received");
  await expect(page.getByTestId("order-ref")).toHaveText(/^#\d{4}$/);

  const paid = await getOrder(sessionId);
  expect(paid).toMatchObject({payment_status: "paid", status: "placed"});
  expect(paid.orderNumber).toBeGreaterThanOrEqual(1001);

  const kitchen = await kitchenOrders();
  expect(kitchen.map((o) => o.id)).toContain(sessionId);

  await setKitchenStatus(sessionId, "preparing");
  await expect(page.getByTestId("order-status")).toHaveText("Being prepared");
  await setKitchenStatus(sessionId, "ready");
  await expect(page.getByTestId("order-status")).toHaveText("Ready to collect");
});

test("an unpaid order never reaches the kitchen", async ({page}) => {
  await site.openMenu(page);
  await site.addItem(page, "Classic Burrito", {protein: "Beef", times: 2});
  await site.openCart(page);
  await site.fillDetails(page);
  await site.goToCheckout(page);
  const sessionId = await site.expectFakeStripe(page);

  await page.getByRole("link", {name: "Cancel"}).click();
  await page.waitForURL(/\/order-cancel\//);

  expect((await getOrder(sessionId)).payment_status).toBe("pending");
  expect((await kitchenOrders()).map((o) => o.id)).not.toContain(sessionId);
});
