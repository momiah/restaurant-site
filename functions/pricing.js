/* eslint-disable max-len */
// Server-side pricing. The browser/app only says WHAT the customer wants (item names,
// chosen extras and proteins, quantities); every price comes from the restaurant's
// own menu in Firestore. A tampered basket can't change what Stripe charges or what
// the kitchen sees.

const MAX_QUANTITY = 50;
const MAX_LINES = 100;

/** An error whose message is safe to show the customer. */
class PricingError extends Error {}

const key = (s) => String(s || "").trim().toLowerCase();
const pence = (pounds) => Math.round(Number(pounds) * 100);

/**
 * Every orderable item on the menu, by name (first one wins if a name repeats).
 * @param {Array<Object>} menuDocs Category docs: { category, items: [...] }.
 * @return {Map<string, Object>} Item by lower-cased name.
 */
function indexMenu(menuDocs) {
  const items = new Map();
  for (const cat of menuDocs) {
    for (const item of (cat && cat.items) || []) {
      if (item && item.name && !items.has(key(item.name))) items.set(key(item.name), item);
    }
  }
  return items;
}

/**
 * One chosen option (protein) checked against the menu item's list of choices.
 * @param {Array<Object>|undefined} choices Menu item's choices: [{ type }].
 * @param {*} chosen What the customer picked (a type name).
 * @param {string} itemName For messages.
 * @param {string} label "protein", "second protein", ...
 * @return {string|null} The validated choice.
 */
function pickChoice(choices, chosen, itemName, label) {
  const hasChoices = Array.isArray(choices) && choices.length > 0;
  if (!hasChoices) return null;
  const name = typeof chosen === "object" && chosen ? chosen.type : chosen;
  const match = choices.find((c) => c && key(c.type) === key(name));
  if (!match) throw new PricingError(`Please choose a ${label} for ${itemName}.`);
  return match.type;
}

/**
 * Prices a basket from the menu.
 * @param {Array<Object>} menuDocs The restaurant's menu category docs.
 * @param {Array<Object>} cartItems What the customer asked for.
 * @return {{lines: Array<Object>, subtotal: number}} Priced lines (unit prices in
 *   pounds, extras included) and the food subtotal in pounds.
 */
function priceCart(menuDocs, cartItems) {
  if (!Array.isArray(cartItems) || cartItems.length === 0) throw new PricingError("Your basket is empty.");
  if (cartItems.length > MAX_LINES) throw new PricingError("That's too many different items for one order.");
  const menu = indexMenu(menuDocs);

  let subtotalPence = 0;
  const lines = cartItems.map((wanted) => {
    const item = menu.get(key(wanted && wanted.name));
    if (!item || item.available === false) {
      throw new PricingError(`${(wanted && wanted.name) || "An item"} is no longer available. Please remove it from your basket.`);
    }
    const quantity = Number(wanted.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      throw new PricingError(`Please check the quantity of ${item.name}.`);
    }

    // Extras: only ones this item offers, at the menu's price, each once.
    const offered = Array.isArray(item.extras) ? item.extras : [];
    const extras = [];
    for (const e of Array.isArray(wanted.extras) ? wanted.extras : []) {
      const name = typeof e === "object" && e ? e.type : e;
      const match = offered.find((o) => o && key(o.type) === key(name));
      if (!match) throw new PricingError(`"${name}" isn't available on ${item.name}.`);
      if (!extras.some((x) => x.type === match.type)) extras.push({type: match.type, price: Number(match.price) || 0});
    }

    // Proteins are choices; like the website, they don't change the price.
    const protein = pickChoice(item.protein, wanted.protein, item.name, "protein");
    const secondProtein = pickChoice(item.secondProtein, wanted.secondProtein, item.name, "second protein");
    const thirdProtein = pickChoice(item.thirdProtein, wanted.thirdProtein, item.name, "third protein");

    const unitPence = pence(item.price) + extras.reduce((a, x) => a + pence(x.price), 0);
    if (!Number.isFinite(unitPence) || unitPence <= 0) {
      throw new PricingError(`${item.name} can't be ordered online right now.`);
    }
    subtotalPence += unitPence * quantity;
    return {
      name: item.name,
      description: item.description || "",
      image: item.imageUrl || null,
      price: unitPence / 100,
      quantity,
      extras,
      protein,
      secondProtein,
      thirdProtein,
    };
  });
  return {lines, subtotal: subtotalPence / 100};
}

/**
 * Order-level checks the browser also does, repeated here because the browser can
 * be bypassed: order type offered, minimum order, delivery details and area.
 * @param {Object} restaurant Restaurant record.
 * @param {{orderType: string, subtotal: number, customer: Object}} order The order.
 * @return {void}
 */
function checkOrder(restaurant, {orderType, subtotal, customer}) {
  const ordering = restaurant.ordering || {};
  const types = Array.isArray(ordering.orderTypes) && ordering.orderTypes.length ? ordering.orderTypes : ["Collection", "Delivery"];
  if (!["Collection", "Delivery"].includes(orderType) || !types.includes(orderType)) {
    throw new PricingError(`${orderType || "That order type"} isn't available from this restaurant.`);
  }
  if (ordering.minOrder && subtotal < Number(ordering.minOrder)) {
    throw new PricingError(`The minimum order is £${Number(ordering.minOrder).toFixed(2)}.`);
  }
  if (!String(customer.name || "").trim()) throw new PricingError("Please add your name.");
  if (String(customer.contactNumber || "").replace(/\D/g, "").length < 11) {
    throw new PricingError("Please add a phone number the restaurant can call.");
  }
  if (orderType === "Delivery") {
    if (!String(customer.address || "").trim()) throw new PricingError("Please add your delivery address.");
    const prefixes = ordering.allowedPostcodePrefixes || [];
    const postcode = String(customer.postCode || "").toUpperCase().replace(/\s/g, "");
    if (prefixes.length > 0 && !prefixes.some((p) => postcode.startsWith(String(p).toUpperCase().replace(/\s/g, "")))) {
      throw new PricingError("Sorry, that address is outside our delivery area. Please try collection instead.");
    }
  }
}

module.exports = {MAX_QUANTITY, PricingError, checkOrder, indexMenu, priceCart};
