# Website journeys (Playwright)

Customer journeys for the ordering website, run against the Firebase emulators
(project `demo-menudock`) and a fake Stripe. Nothing touches production or real Stripe.

```bash
npm --prefix e2e ci
npx --prefix e2e playwright install chromium
npm run e2e
```

Needs Java 21+ for the emulators (`brew install openjdk@21`, then put
`/opt/homebrew/opt/openjdk@21/bin` first on `PATH`). Run one file with
`npm run e2e -- tests/delivery.spec.js`; open the last report with `npm --prefix e2e run report`.

## How it fits together

- `run.js` starts the Firestore, Auth and Functions emulators from `firebase.e2e.json`
  (own ports, so it can run next to `rules-tests/`) and runs Playwright inside them.
- `playwright.config.js` starts the fake Stripe (`support/fakeStripe.js`) and the site's dev
  server with `REACT_APP_USE_EMULATORS=1`. That switch is ignored in `npm run build`.
- The payments function talks to the fake Stripe through `STRIPE_API_BASE`, which it only
  reads inside the Functions emulator. Paying on the fake checkout page sends a signed
  `checkout.session.completed` webhook to the function, as Stripe does.
- `support/admin.js` seeds the demo restaurant (`support/fixtures.js`) before the run and
  deletes it after. The site is opened at `http://e2e-kitchen.localhost:3100`, so the
  restaurant is resolved by hostname like in production.

## Journeys

| Spec | Covers |
| --- | --- |
| `collection.spec.js` | Browse the menu, add items with extras, pay for a Collection order; order is paid and numbered, the owner sees it, kitchen status updates show on the customer's page. A cancelled checkout never reaches the kitchen. |
| `delivery.spec.js` | Delivery fee under the free-delivery threshold, free over it, minimum order refused, outside-area postcode refused. |
| `unavailable.spec.js` | An address with no restaurant shows "This restaurant isn't available". |
