// Page actions shared by the journeys, written the way a customer uses the site.
const {expect} = require("@playwright/test");
const cfg = require("./config");
const fx = require("./fixtures");

async function openMenu(page) {
  await page.goto(`${cfg.siteUrl(fx.SLUG)}/menu`);
  await expect(page.getByRole("heading", {name: "Classic Burrito"})).toBeVisible();
}

async function addItem(page, name, {extras = [], protein, times = 1} = {}) {
  await page.getByRole("heading", {name, exact: true}).first().click();
  const popup = page.getByRole("button", {name: "Close"}).locator("..");
  for (const extra of extras) await popup.locator(`input[type=checkbox][value="${extra}"]`).check();
  if (protein) await popup.locator(`input[type=radio][value="${protein}"]`).check();
  for (let i = 0; i < times; i++) await popup.getByRole("button", {name: "Add To Cart"}).click();
  await page.getByRole("button", {name: "Close"}).click();
}

async function openCart(page) {
  await page.getByTestId("cart-button").click();
  await expect(page.getByRole("heading", {name: "Your Order"})).toBeVisible();
}

async function fillDetails(page, {orderType = "Collection", name = "Ann Customer", phone = "07700900123", address, postCode} = {}) {
  await page.locator(`input[name=orderType][value=${orderType}]`).first().check();
  await page.getByPlaceholder("Name").fill(name);
  await page.getByPlaceholder("Contact Number").fill(phone);
  if (address) await page.getByPlaceholder("Address").fill(address);
  if (postCode) await page.getByPlaceholder("Post Code").fill(postCode);
}

async function goToCheckout(page) {
  await page.getByRole("button", {name: "Go To Checkout"}).click();
}

async function expectFakeStripe(page) {
  await page.waitForURL(`${cfg.FAKE_STRIPE_URL}/pay/**`);
  await expect(page.getByRole("heading", {name: "Fake Stripe Checkout"})).toBeVisible();
  return page.url().split("/pay/")[1];
}

async function pay(page) {
  await page.getByRole("button", {name: /^Pay /}).click();
  await page.waitForURL(/\/order-success\/\?session_id=/);
}

module.exports = {openMenu, addItem, openCart, fillDetails, goToCheckout, expectFakeStripe, pay};
