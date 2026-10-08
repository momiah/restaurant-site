/* eslint-disable */
/**
 * Seed a demo restaurant so the website and dashboard have data to run against.
 *
 * Creates:
 *   restaurants/{id}            — identity, theme, ordering rules, payments
 *   restaurants/{id}/menu/*     — one document per category (each holds an items array)
 *   domains/{host}              — optional hostname -> restaurantId mapping
 *   owners/{uid}                — optional dashboard-owner mapping (if OWNER_UID set)
 *
 * Usage (from the functions/ directory, which already has firebase-admin):
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json \
 *   RESTAURANT_ID=demo RESTAURANT_SLUG=taco-monster \
 *   [DOMAIN=order.example.com] [OWNER_UID=<firebase-auth-uid>] \
 *   node scripts/seedDemoRestaurant.js
 *
 * Idempotent: uses deterministic ids and set()/merge, so re-running is safe.
 */
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

const RESTAURANT_ID = process.env.RESTAURANT_ID || "demo";
const RESTAURANT_SLUG = process.env.RESTAURANT_SLUG || "taco-monster";
const DOMAIN = process.env.DOMAIN || "";
const OWNER_UID = process.env.OWNER_UID || "";

const NO_IMAGE =
  "https://firebasestorage.googleapis.com/v0/b/tacomonster-a73fa.appspot.com/o/Products%2Fcoming-soon-photo.jpg?alt=media&token=c917b0d8-4f97-4824-9b07-ed51759c8b31";

const restaurant = {
  slug: RESTAURANT_SLUG,
  name: "Taco Monster",
  status: "active",
  contact: {
    phone: "0207 1234 5678",
    email: "hello@tacomonster.example",
    instagram: "tacomonsteruk",
  },
  address: {
    line1: "644 Hertford Rd",
    city: "Enfield",
    postcode: "EN3 6LZ",
    formatted: "Cloud kitchen, 644 Hertford Rd, Enfield EN3 6LZ",
  },
  location: {
    lat: 51.671335,
    lng: -0.040751,
    mapsEmbedUrl:
      "https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d4948.712907721025!2d-0.0417565!3d51.6716181!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x48761f49f9cd05d7%3A0xf86d6a1bdb3aa431!2sTaco%20Monster!5e0!3m2!1sen!2suk!4v1696160226658!5m2!1sen!2suk",
    placeId: "",
  },
  theme: {
    colors: {
      primary: "#FF8C00",
      secondary: "#FFC400",
      background: "#ffffff",
      text: "#0a0a0a",
      accent: "#FF8C00",
      navBar: "#333333",
      navBarText: "#ffffff",
    },
    fonts: {
      heading: "system-ui, -apple-system, 'Segoe UI', sans-serif",
      body: "system-ui, -apple-system, 'Segoe UI', sans-serif",
    },
    logoUrl: "",
    heroImageUrl: "",
    faviconUrl: "",
    noImageUrl: NO_IMAGE,
  },
  ordering: {
    orderTypes: ["Collection", "Delivery"],
    deliveryRadiusMiles: 2,
    allowedPostcodePrefixes: ["EN1", "EN2", "EN3", "EN7", "EN8", "EN9"],
    minOrder: 0,
    freeDeliveryThreshold: 20,
    deliveryFee: 2.5,
    currency: "GBP",
    collectionAddress: "Cloud kitchen, 644 Hertford Rd, Enfield EN3 6LZ",
  },
  payments: {
    provider: "stripe-connect",
    // Set this to the restaurant's Stripe Connect account id during onboarding.
    stripeAccountId: "",
    // Optional pre-created shipping rate; otherwise the function builds one from deliveryFee.
    shippingRateId: "",
  },
};

// Representative menu across every category. Each doc mirrors the in-app shape:
// { category, order, items: [{ name, description, price, imageUrl, extras, protein }] }
const extras = [
  { type: "Sour Cream", price: 0.4 },
  { type: "Crispy Onions", price: 0.4 },
  { type: "Double protein", price: 1.0 },
];
const protein = [
  { type: "Chicken", price: null },
  { type: "Beef", price: null },
  { type: "Spicy Bean", price: null },
];

const menu = [
  {
    category: "Tacos",
    order: 1,
    items: [
      { name: "Soft Taco", description: "Snack sized wrap filled with protein, lettuce and cheese", price: 2.15, imageUrl: NO_IMAGE, extras, protein },
      { name: "Crunchy Taco", description: "Crunchy shell filled with protein, lettuce and cheese", price: 2.15, imageUrl: NO_IMAGE, extras, protein },
    ],
  },
  {
    category: "Burritos",
    order: 2,
    items: [
      { name: "Classic Burrito", description: "Large tortilla with rice, beans, protein and cheese", price: 6.5, imageUrl: NO_IMAGE, extras, protein },
    ],
  },
  {
    category: "Fries",
    order: 3,
    items: [
      { name: "Monster Fries", description: "Loaded fries with cheese sauce", price: 4.0, imageUrl: NO_IMAGE, extras: [], protein: [] },
      { name: "Seasoned Fries", description: "Crispy seasoned fries", price: 2.5, imageUrl: NO_IMAGE, extras: [], protein: [] },
    ],
  },
  {
    category: "Grillers",
    order: 4,
    items: [
      { name: "Griller Combo", description: "Grilled wrap with sides", price: 7.0, imageUrl: NO_IMAGE, extras, protein },
    ],
  },
  {
    category: "Drinks",
    order: 5,
    items: [
      { name: "Pepsi Max", description: "330ml can", price: 1.2, imageUrl: NO_IMAGE, extras: [], protein: [] },
      { name: "Tango Apple", description: "330ml can", price: 1.2, imageUrl: NO_IMAGE, extras: [], protein: [] },
    ],
  },
  {
    category: "Desserts",
    order: 6,
    items: [
      { name: "2 Churros", description: "Cinnamon sugar churros", price: 2.5, imageUrl: NO_IMAGE, extras: [], protein: [] },
    ],
  },
  {
    category: "Combos",
    order: 7,
    items: [
      { name: "Taco Combo", description: "2 tacos, fries and a drink", price: 8.5, imageUrl: NO_IMAGE, extras: [], protein: [] },
    ],
  },
  {
    category: "Kids",
    order: 8,
    items: [
      { name: "Kids Taco Meal", description: "1 taco, small fries and a drink", price: 4.5, imageUrl: NO_IMAGE, extras: [], protein: [] },
    ],
  },
];

async function seed() {
  const now = admin.firestore.FieldValue.serverTimestamp();
  const restaurantRef = db.collection("restaurants").doc(RESTAURANT_ID);

  await restaurantRef.set(
    { ...restaurant, createdAt: now, updatedAt: now },
    { merge: true }
  );
  console.log(`✓ restaurants/${RESTAURANT_ID} (${RESTAURANT_SLUG})`);

  // Deterministic category ids (slugified) so re-running overwrites in place.
  const batch = db.batch();
  for (const category of menu) {
    const id = category.category.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    batch.set(restaurantRef.collection("menu").doc(id), category, { merge: true });
  }
  await batch.commit();
  console.log(`✓ ${menu.length} menu categories`);

  if (DOMAIN) {
    await db.collection("domains").doc(DOMAIN).set({ restaurantId: RESTAURANT_ID });
    console.log(`✓ domains/${DOMAIN} -> ${RESTAURANT_ID}`);
  }

  if (OWNER_UID) {
    await db.collection("owners").doc(OWNER_UID).set(
      { restaurantId: RESTAURANT_ID, role: "owner" },
      { merge: true }
    );
    console.log(`✓ owners/${OWNER_UID} -> ${RESTAURANT_ID}`);
  }

  console.log("Done.");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
