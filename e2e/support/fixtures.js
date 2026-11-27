// The demo restaurant the journeys run against, shaped like
// functions/scripts/seedDemoRestaurant.js writes in production.
const RESTAURANT_ID = "e2e-kitchen";
const SLUG = "e2e-kitchen";
const OWNER = {email: "owner@e2e-kitchen.test", password: "e2e-owner-password"};

const ordering = {
  orderTypes: ["Collection", "Delivery"],
  deliveryRadiusMiles: 3,
  allowedPostcodePrefixes: ["E1", "E2"],
  minOrder: 10,
  freeDeliveryThreshold: 20,
  deliveryFee: 2.5,
  currency: "GBP",
  collectionAddress: "E2E Kitchen, 1 Demo Street, London E1 6AN",
};

const restaurant = {
  slug: SLUG,
  name: "E2E Kitchen",
  status: "active",
  contact: {phone: "020 7946 0000", email: "kitchen@e2e-kitchen.test", instagram: ""},
  address: {line1: "1 Demo Street", city: "London", postcode: "E1 6AN", formatted: "E2E Kitchen, 1 Demo Street, London E1 6AN"},
  location: {lat: 51.5202, lng: -0.0779, mapsEmbedUrl: "", placeId: ""},
  theme: {colors: {primary: "#0E7C7B", secondary: "#F2A33A", navBar: "#131C26", navBarText: "#ffffff"}, logoUrl: "", heroImageUrl: "", noImageUrl: ""},
  ordering,
  payments: {provider: "stripe-connect", stripeAccountId: "acct_e2e_kitchen", shippingRateId: ""},
};

const extras = [
  {type: "Sour Cream", price: 0.4},
  {type: "Double protein", price: 1.0},
];
const protein = [
  {type: "Chicken", price: null},
  {type: "Beef", price: null},
];

const menu = [
  {id: "tacos", category: "Tacos", order: 1, items: [
    {name: "Soft Taco", description: "Snack sized wrap", price: 2.15, imageUrl: "", extras, protein},
  ]},
  {id: "burritos", category: "Burritos", order: 2, items: [
    {name: "Classic Burrito", description: "Rice, beans, protein and cheese", price: 6.5, imageUrl: "", extras, protein},
  ]},
  {id: "drinks", category: "Drinks", order: 3, items: [
    {name: "Lemonade", description: "330ml can", price: 1.5, imageUrl: ""},
  ]},
];

// Within the 3-mile radius of the restaurant.
const NEARBY = {latitude: 51.5155, longitude: -0.0722};

module.exports = {RESTAURANT_ID, SLUG, OWNER, ordering, restaurant, menu, NEARBY};
