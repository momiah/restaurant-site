# Multi-Tenant Platform Plan

> Turn the single-restaurant build into a platform where a new client is onboarded
> by writing **config** (a Firestore `restaurants` record + DNS), never by forking
> and editing code.

**Status:** Approved · **Branch:** `claude/sharp-sagan-oy3lag`
**Repos:** `restaurant-site` (customer website), `restaurant-dashboard` (owner app)

## Approved decisions

| # | Decision | Choice |
|---|----------|--------|
| 1 | Which restaurant is this site? | **Hostname lookup** (`domains/{hostname}` → id) with `REACT_APP_RESTAURANT_*` env override for local/single-tenant deploys |
| 2 | Payments | **Stripe Connect** (Express accounts), destination charges + application fee |
| 3 | Orders storage | Top-level `orders` collection, each doc carries `restaurantId` |
| 4 | Menu storage | **Per-restaurant subcollection** `restaurants/{id}/menu/{categoryId}` |
| 5 | Owner auth | Firebase Auth (email/password), `owners/{uid}` → `{ restaurantId, role }` |
| 6 | Starting point | **Fresh start** — no Taco Monster migration/back-fill; seed a demo restaurant so the apps have data to run against. Existing repos are scaffolding. |

## Data model

### `restaurants/{restaurantId}` — single source of truth

```
{
  slug, name, status,                       // status: active | paused (gates ordering)
  contact:  { phone, email, instagram },
  address:  { line1, city, postcode, formatted },
  location: { lat, lng, mapsEmbedUrl, placeId },
  theme: {
    colors: { primary, secondary, background, text, accent, navBar },
    fonts:  { heading, body },
    logoUrl, heroImageUrl, faviconUrl, noImageUrl
  },
  ordering: {
    orderTypes, deliveryRadiusMiles, allowedPostcodePrefixes,
    minOrder, freeDeliveryThreshold, deliveryFee, currency, collectionAddress
  },
  payments: { provider: "stripe-connect", stripeAccountId, shippingRateId },
  createdAt, updatedAt
}
```

### Scoped collections

| Data | Location | Scoping |
|------|----------|---------|
| Menu | `restaurants/{id}/menu/{categoryId}` | subcollection (category doc holds an ordered `items` array) |
| Orders | `orders/{orderId}` | `restaurantId` field |
| Domains | `domains/{hostname}` → `{ restaurantId }` | hostname → tenant lookup |
| Owners | `owners/{uid}` → `{ restaurantId, role }` | ties a dashboard login to one restaurant |
| Customers / points / offers *(loyalty, later)* | `restaurants/{id}/customers/{uid}`, `.../offers/{id}` | subcollection — data model left ready, not built |

## How each app resolves its restaurant

- **Website:** a `RestaurantProvider` at boot resolves the id — `REACT_APP_RESTAURANT_ID`/`REACT_APP_RESTAURANT_SLUG` if set, else `domains/{window.location.hostname}`, else a `slug` query — loads the record once, and feeds both the styled-components `ThemeProvider` and the ordering rules to the whole app. A hard-coded **fallback theme** covers first paint and misconfigured records.
- **Dashboard:** the signed-in owner's `owners/{uid}` doc gives the `restaurantId`; every query is `where("restaurantId","==",id)`, enforced again by Firestore rules.

## De-hardcoding checklist

| Hard-coded value | Was in | Moves to |
|---|---|---|
| Restaurant name / logo / Instagram | `Menu.js`, `OrderSuccess.js`, `OrderCancel.js` | `restaurant.name`, `.theme.logoUrl`, `.contact.instagram` |
| Firebase project config | `config/firebase.js` | `REACT_APP_FIREBASE_*` env (one **platform** project for all tenants) |
| Postcode allow-list `EN1…EN9` | `Cart.js` | `restaurant.ordering.allowedPostcodePrefixes` |
| Restaurant lat/lng + 2-mile radius | `LocationVerifier.js` | `restaurant.location` + `ordering.deliveryRadiusMiles` |
| Free-delivery threshold `total < 20` | `functions/index.js` | `restaurant.ordering.freeDeliveryThreshold` |
| Stripe shipping rate `shr_…` | `functions/index.js` | `restaurant.payments.shippingRateId` / built from `deliveryFee` |
| Currency `GBP` | `functions/index.js` | `restaurant.ordering.currency` |
| Cloud Function URL | `Cart.js` | `REACT_APP_FUNCTIONS_URL` env + `restaurantId` in the request |
| Whole menu (677 lines) | `Menu.config.js` | `restaurants/{id}/menu` subcollection |
| Google Maps embed | `CustomerForm.js` | `restaurant.location.mapsEmbedUrl` |
| Collection address | `OrderSuccess.js` | `restaurant.ordering.collectionAddress` |
| Colours / fonts | inline styles | `restaurant.theme` via `ThemeProvider` |

## Payments (Stripe Connect)

One platform account holds the Stripe API keys in Cloud Functions. Each restaurant is a
connected account (`acct_…`) stored on its record. The `stripe-session` function reads
`restaurantId` from the request, loads the record, and creates the Checkout Session on that
restaurant's connected account (destination charge + `application_fee_amount`), using the
restaurant's currency and delivery-fee config. Restaurants onboard through a Stripe-hosted
link and get their own payouts and dashboard.

## Security fix (shipped first)

`functions/index.js` `/checkout-webhook` verifies every event with
`stripe.webhooks.constructEvent(request.rawBody, signature, webhookSecret)` (Firebase needs
`rawBody`, not the parsed body) and rejects anything that fails before touching Firestore.
A `firestore.rules` file (there were none) locks the database down: restaurant + menu are
world-readable, orders are create-only from the site and readable only by the owning
restaurant's authenticated owner, and everything else is closed by default.

## Owner authentication (dashboard)

Firebase Auth email/password. On sign-in the app loads `owners/{uid}.restaurantId` and scopes
every read to it, so an owner sees only their own orders and settings. This is where the loyalty
data model sits ready (`customers/points/offers` scoped per restaurant) without being built.

## Delivery

Focused work, one branch per repo (`claude/sharp-sagan-oy3lag`), with granular commits:

- **restaurant-site** — (1) security fix + `firestore.rules`; (2) `RestaurantProvider` +
  `ThemeProvider` + de-hardcoding + order scoping; (3) menu from Firestore + seed script;
  (4) multi-tenant Stripe Connect payments in `functions/`.
- **restaurant-dashboard** — owner auth + `restaurantId` scoping + `ThemeProvider` + Settings.

## Onboarding a new restaurant (summary)

1. Create a `restaurants/{id}` record (identity, theme, ordering rules).
2. Add its menu (dashboard editor or seed/import script).
3. Send the Stripe Connect onboarding link; store the returned `acct_…` on the record.
4. Point the client's domain at the platform and add a `domains/{hostname}` mapping.
5. Create the owner's login and map it to the `restaurantId`.

No fork, no code edit, no new deploy. Full steps in `docs/ONBOARDING.md`.
