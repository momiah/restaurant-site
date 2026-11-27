const {test, expect} = require("@playwright/test");
const cfg = require("../support/config");

test("an address with no restaurant behind it shows the 'isn't available' page", async ({page}) => {
  await page.goto(cfg.siteUrl("no-such-restaurant"));
  await expect(page.getByRole("heading", {name: "This restaurant isn't available"})).toBeVisible();
  await expect(page.getByText(/no-such-restaurant/)).toBeVisible();
});
