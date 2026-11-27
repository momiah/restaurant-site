const {test, expect} = require("@playwright/test");
const site = require("../support/site");
const fx = require("../support/fixtures");
const {getOrder} = require("../support/admin");

test.use({geolocation: fx.NEARBY, permissions: ["geolocation"]});

const deliverTo = {orderType: "Delivery", address: "2 Brick Lane, London", postCode: "E1 6RF"};

test("charges the delivery fee under the free-delivery threshold", async ({page}) => {
  await site.openMenu(page);
  await site.addItem(page, "Classic Burrito", {protein: "Chicken", times: 2});
  await site.openCart(page);
  await site.fillDetails(page, deliverTo);
  await site.goToCheckout(page);

  const sessionId = await site.expectFakeStripe(page);
  await expect(page.getByTestId("delivery-fee")).toHaveText("Delivery£2.50");
  await expect(page.getByTestId("total")).toHaveText("£15.50");

  await site.pay(page);
  await expect(page.getByTestId("order-status")).toHaveText("Order received");
  expect(await getOrder(sessionId)).toMatchObject({
    orderType: "Delivery", payment_status: "paid", total: 13, address: "2 Brick Lane, London", postCode: "E1 6RF",
  });
});

test("delivers free at or over the threshold", async ({page}) => {
  await site.openMenu(page);
  await site.addItem(page, "Classic Burrito", {protein: "Beef", times: 3});
  await site.addItem(page, "Lemonade");
  await site.openCart(page);
  await site.fillDetails(page, deliverTo);
  await site.goToCheckout(page);

  await site.expectFakeStripe(page);
  await expect(page.getByTestId("delivery-fee")).toHaveCount(0);
  await expect(page.getByTestId("total")).toHaveText("£21.00");
});

test("refuses an order under the minimum", async ({page}) => {
  await site.openMenu(page);
  await site.addItem(page, "Soft Taco", {protein: "Chicken"});
  await site.openCart(page);
  await site.fillDetails(page, deliverTo);
  await site.goToCheckout(page);

  await expect(page.getByRole("heading", {name: "We couldn't start your payment"})).toBeVisible();
  await expect(page.getByText("The minimum order is £10.00.")).toBeVisible();
  expect(page.url()).not.toContain("/pay/");
});

test("refuses a postcode outside the delivery area", async ({page}) => {
  await site.openMenu(page);
  await site.addItem(page, "Classic Burrito", {protein: "Chicken", times: 2});
  await site.openCart(page);
  await site.fillDetails(page, {...deliverTo, postCode: "SW1A 1AA"});
  await site.goToCheckout(page);

  await expect(page.getByRole("heading", {name: "Not in Delivery Location"})).toBeVisible();
  expect(page.url()).not.toContain("/pay/");
});
