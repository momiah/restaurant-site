# Onboarding a new restaurant

Onboarding is **config, not code** — no fork, no source edit, no new build. You add one
Firestore record (plus its menu), connect Stripe, and point a domain. Below is exactly what
you set per client.

## Prerequisites (one-time, platform-wide)

- One shared **Firebase project** (the platform project) — its config is in the site's
  `REACT_APP_FIREBASE_*` and the dashboard's `EXPO_PUBLIC_FIREBASE_*` env vars.
- Cloud Functions deployed from `functions/` with Stripe config set:
  - `firebase functions:config:set stripe.token="sk_live_…" stripe.webhook_secret="whsec_…"`
  - optional platform fee: `stripe.application_fee_percent="10"`
- Firestore rules deployed: `firebase deploy --only firestore:rules`.
- A **Stripe Connect** platform enabled on your Stripe account.

## Per-restaurant checklist

### 1. Create the `restaurants/{id}` record

The single source of truth. Fields (see `docs/MULTI_TENANT_PLAN.md` for the full shape):

- **identity** — `slug` (unique), `name`, `status: "active"`, `contact`, `address`
- **location** — `lat`, `lng`, `mapsEmbedUrl` (the Google Maps *embed* URL)
- **theme** — `colors`, `fonts`, `logoUrl`, `heroImageUrl`, `noImageUrl`
- **ordering** — `orderTypes`, `deliveryRadiusMiles`, `allowedPostcodePrefixes`,
  `minOrder`, `freeDeliveryThreshold`, `deliveryFee`, `currency`, `collectionAddress`
- **payments** — `provider: "stripe-connect"`, `stripeAccountId` (filled in step 3),
  optional `shippingRateId`, optional `applicationFeePercent`

The seed script writes a complete example you can copy and adjust:

```bash
cd functions
GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json \
RESTAURANT_ID=<id> RESTAURANT_SLUG=<slug> \
[DOMAIN=order.client.com] [OWNER_UID=<firebase-auth-uid>] \
node scripts/seedDemoRestaurant.js
```

### 2. Add the menu

Menu lives in the `restaurants/{id}/menu` subcollection — one document per category,
each holding an ordered `items` array. Seed it with the script above, edit it in the
Firebase console, or (next milestone) from the dashboard's menu editor. Changes are live
immediately — the website reads this subcollection directly.

### 3. Connect Stripe (payments)

1. Send the client a Stripe Connect onboarding link (Express account).
2. When they finish, copy their connected account id (`acct_…`).
3. Put it on the record at `payments.stripeAccountId`.

Orders now route to the client's account via a destination charge, with your platform
application fee deducted. Delivery is free above `ordering.freeDeliveryThreshold`; below it,
`payments.shippingRateId` (if set) or a fee built from `ordering.deliveryFee` applies.

> Until `stripeAccountId` is set, checkout still works but charges land on the platform
> account — useful for testing before the client finishes Stripe onboarding.

### 4. Point the domain at the platform

The website resolves which restaurant it is at boot:

- **Custom domain** (recommended): point the client's domain (e.g. `order.client.com`) at
  the platform deployment, then add `domains/{hostname}` → `{ restaurantId }`.
- **Subdomain**: `slug.myplatform.com` resolves by the `slug` field automatically.
- **Single-tenant deploy / local dev**: set `REACT_APP_RESTAURANT_ID` or
  `REACT_APP_RESTAURANT_SLUG` in that deployment's env.

### 5. Create the owner's dashboard login

1. Create a Firebase Auth (email/password) user for the owner.
2. Add `owners/{uid}` → `{ restaurantId: "<id>", role: "owner" }`.

They can now sign in to the dashboard and see **only** their restaurant's orders and
settings — enforced by the Firestore rules, not just the UI.

## What you set per client — at a glance

| Thing | Where |
|---|---|
| Identity, theme, ordering rules | `restaurants/{id}` |
| Menu | `restaurants/{id}/menu/*` |
| Stripe account | `restaurants/{id}.payments.stripeAccountId` |
| Domain mapping | `domains/{hostname}` |
| Owner login | Firebase Auth user + `owners/{uid}` |

That's the whole onboarding. Everything else is shared platform code.
