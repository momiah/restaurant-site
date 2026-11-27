// What MenuDock keeps from an order: Stripe's costs passed on, plus MenuDock's own fee.
const {menuDockFeePercent, orderFees} = require("../checkout");

const cover = {percent: 1.75, fixedPence: 20};

describe("menuDockFeePercent", () => {
  it("uses the restaurant's billing fee set in the admin console", () => {
    expect(menuDockFeePercent({billing: {platformFeePercent: 7}}, 5)).toBe(7);
  });
  it("treats 0 as 'no MenuDock fee', not 'use the default'", () => {
    expect(menuDockFeePercent({billing: {platformFeePercent: 0}}, 5)).toBe(0);
  });
  it("falls back to the older payments field, then the platform default", () => {
    expect(menuDockFeePercent({payments: {applicationFeePercent: 3}}, 5)).toBe(3);
    expect(menuDockFeePercent({}, 5)).toBe(5);
  });
});

describe("orderFees", () => {
  it("a restaurant on Stripe costs only pays 1.75% + 20p of everything charged", () => {
    // £20 food + £2.50 delivery = 2250p → 39.375 → 39p + 20p
    const fees = orderFees({subtotal: 20, deliveryPence: 250, restaurant: {billing: {platformFeePercent: 0}}, platformFeePercent: 5, stripeCover: cover});
    expect(fees).toEqual({stripeCover: 59, menuDock: 0, total: 59});
  });

  it("other restaurants pay MenuDock's fee on the food on top", () => {
    const fees = orderFees({subtotal: 20, deliveryPence: 250, restaurant: {}, platformFeePercent: 5, stripeCover: cover});
    expect(fees).toEqual({stripeCover: 59, menuDock: 100, total: 159});
  });

  it("never takes more than the order", () => {
    const fees = orderFees({subtotal: 0.1, restaurant: {}, platformFeePercent: 5, stripeCover: cover});
    expect(fees.total).toBe(10);
    expect(fees.stripeCover + fees.menuDock).toBe(10);
  });

  it("without a Stripe cost setting, only MenuDock's fee applies (as before)", () => {
    expect(orderFees({subtotal: 15, restaurant: {}, platformFeePercent: 5})).toEqual({stripeCover: 0, menuDock: 75, total: 75});
  });
});
