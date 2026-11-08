// Server-side pricing: the basket says what, the menu says how much.
const {PricingError, checkOrder, priceCart} = require("../pricing");

const menu = [
  {category: "Tacos", items: [
    {name: "Soft Taco", price: 2.15, description: "Beef", imageUrl: "https://img/soft.jpg",
      extras: [{type: "Sour Cream", price: 0.4}, {type: "Jalapeños", price: 0.3}],
      protein: [{type: "Beef", price: null}, {type: "Chicken", price: null}]},
    {name: "Sold Out Taco", price: 3, available: false},
  ]},
  {category: "Drinks", items: [{name: "Pepsi Max", price: 1.2}, {name: "Free Water", price: 0}]},
];

describe("priceCart", () => {
  it("prices from the menu and ignores any price the client sends", () => {
    const {lines, subtotal} = priceCart(menu, [
      {name: "Soft Taco", price: 0.01, quantity: 2, extras: [{type: "Sour Cream", price: 0}], protein: "Chicken"},
      {name: "pepsi max", price: 0.01, quantity: 3},
    ]);
    expect(subtotal).toBe(8.7); // (2.15 + 0.40) × 2 + 1.20 × 3
    expect(lines[0]).toEqual({
      name: "Soft Taco", description: "Beef", image: "https://img/soft.jpg", price: 2.55, quantity: 2,
      extras: [{type: "Sour Cream", price: 0.4}], protein: "Chicken", secondProtein: null, thirdProtein: null,
    });
    expect(lines[1]).toMatchObject({name: "Pepsi Max", price: 1.2, quantity: 3, extras: []});
  });

  it("charges each extra once, even if sent twice", () => {
    const {subtotal} = priceCart(menu, [{name: "Soft Taco", quantity: 1, protein: "Beef", extras: ["Sour Cream", "Sour Cream"]}]);
    expect(subtotal).toBe(2.55);
  });

  it("rejects items, extras and choices that aren't on the menu", () => {
    expect(() => priceCart(menu, [{name: "Lobster", quantity: 1}])).toThrow(/no longer available/);
    expect(() => priceCart(menu, [{name: "Sold Out Taco", quantity: 1}])).toThrow(/no longer available/);
    expect(() => priceCart(menu, [{name: "Soft Taco", quantity: 1, protein: "Beef", extras: [{type: "Gold Leaf", price: 0}]}])).toThrow(/isn't available on Soft Taco/);
    expect(() => priceCart(menu, [{name: "Soft Taco", quantity: 1, protein: "Lobster"}])).toThrow(/choose a protein/);
    expect(() => priceCart(menu, [{name: "Soft Taco", quantity: 1}])).toThrow(/choose a protein/);
  });

  it("rejects silly quantities, empty baskets and zero-price items", () => {
    for (const quantity of [0, -1, 1.5, 51, "lots", null]) {
      expect(() => priceCart(menu, [{name: "Pepsi Max", quantity}])).toThrow(PricingError);
    }
    expect(() => priceCart(menu, [])).toThrow(/empty/);
    expect(() => priceCart(menu, null)).toThrow(/empty/);
    expect(() => priceCart(menu, [{name: "Free Water", quantity: 1}])).toThrow(/can't be ordered online/);
  });
});

describe("checkOrder", () => {
  const restaurant = {ordering: {orderTypes: ["Collection", "Delivery"], minOrder: 5, allowedPostcodePrefixes: ["E1", "E2"]}};
  const customer = {name: "Ann", contactNumber: "07700 900123", address: "1 High St", postCode: "E1 6AN"};

  it("accepts a valid collection or delivery order", () => {
    expect(() => checkOrder(restaurant, {orderType: "Collection", subtotal: 6, customer})).not.toThrow();
    expect(() => checkOrder(restaurant, {orderType: "Delivery", subtotal: 6, customer})).not.toThrow();
  });

  it("enforces what the browser checks too", () => {
    expect(() => checkOrder(restaurant, {orderType: "Collection", subtotal: 4, customer})).toThrow(/minimum order is £5.00/);
    expect(() => checkOrder(restaurant, {orderType: "Teleport", subtotal: 6, customer})).toThrow(/isn't available/);
    expect(() => checkOrder({ordering: {orderTypes: ["Collection"]}}, {orderType: "Delivery", subtotal: 6, customer})).toThrow(/isn't available/);
    expect(() => checkOrder(restaurant, {orderType: "Collection", subtotal: 6, customer: {...customer, name: ""}})).toThrow(/name/);
    expect(() => checkOrder(restaurant, {orderType: "Collection", subtotal: 6, customer: {...customer, contactNumber: "123"}})).toThrow(/phone/);
    expect(() => checkOrder(restaurant, {orderType: "Delivery", subtotal: 6, customer: {...customer, address: ""}})).toThrow(/address/);
    expect(() => checkOrder(restaurant, {orderType: "Delivery", subtotal: 6, customer: {...customer, postCode: "N1 1AA"}})).toThrow(/outside our delivery area/);
  });
});
