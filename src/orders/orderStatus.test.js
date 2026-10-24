import { describeOrder, orderReference, orderStep, stepLabels } from "./orderStatus";

const paid = (extra) => ({ payment_status: "paid", orderType: "Collection", ...extra });

test("an unpaid order is still confirming payment", () => {
  expect(orderStep({ payment_status: "pending", status: "placed" })).toBeNull();
  expect(describeOrder({ payment_status: "pending" }).title).toMatch(/Confirming your payment/);
  expect(describeOrder(undefined).index).toBe(-1);
});

test("legacy 'active' and missing statuses count as placed", () => {
  expect(orderStep(paid({ status: "active" }))).toBe("placed");
  expect(orderStep(paid({}))).toBe("placed");
});

test("ready reads differently for collection and delivery", () => {
  expect(describeOrder(paid({ status: "ready" })).title).toBe("Ready to collect");
  expect(describeOrder(paid({ status: "ready", orderType: "Delivery" })).title).toBe("Out for delivery");
  expect(describeOrder(paid({ status: "completed", orderType: "Delivery" })).title).toBe("Delivered");
  expect(describeOrder(paid({ status: "completed" })).title).toBe("Collected");
});

test("step labels follow the order type", () => {
  expect(stepLabels(paid({ orderType: "Delivery" })).map((s) => s.label)).toEqual([
    "Order received", "Being prepared", "Out for delivery", "Delivered",
  ]);
  expect(describeOrder(paid({ status: "preparing" })).index).toBe(1);
});

test("the reference is the order number once paid, else a short checkout ref", () => {
  expect(orderReference(paid({ orderNumber: 1007 }))).toBe("#1007");
  expect(orderReference({}, "cs_test_abcdef123456")).toBe("123456");
  expect(orderReference(null, null)).toBe("—");
});
