# Loyalty points

Customers earn points on every paid order, at each restaurant separately. Points are
awarded **only by the server** (the Stripe webhook), from what Stripe actually charged:
the apps can display points but never add them.

## Earning

- **Rate:** `restaurants/{id}.loyalty.pointsPerPound` (default **1 point per £1**), on the
  food total after discounts, excluding delivery. Rounded down.
  `loyalty.enabled: false` switches points off for a restaurant.
- **When:** as soon as Stripe confirms payment (`functions/loyalty.js`, called from the
  webhook after the order is numbered). Safe to retry: one ledger entry per order.

## Who gets them

1. **Ordered in the loyalty app, signed in** → that member. The app sends its Firebase
   ID token to `/stripe-session`, which verifies it and puts the member's uid on the
   Stripe session.
2. **Ordered on the website** → the member whose **verified** email matches the email
   entered at Stripe checkout.
3. **Nobody matches yet** → the points are held in `restaurants/{id}/unclaimedPoints`.
   When someone joins the loyalty app with that email and verifies it, the app calls
   `claimLoyaltyPoints` and the points move to their account.

Email verification matters: without it, anyone could sign up with someone else's
address and collect their points.

The order confirmation page shows what the order earned ("You earned 20 points", or
"join the loyalty app with ann@example.com to collect them").

## Data

| Where | What | Who can write |
|---|---|---|
| `restaurants/{id}/customers/{uid}` | `points` (balance), `lifetimePoints` | server; owner/admin can adjust. The customer can edit their details but not their points |
| `…/customers/{uid}/pointsHistory/{orderId}` | one entry per order: points, order number, amount | server only |
| `restaurants/{id}/unclaimedPoints/{orderId}` | points waiting for an email to join | server only |
| `orders/{orderId}.loyalty` | `{ points, status: "awarded" \| "unclaimed" }` | server only |

## Not yet

- **Redeeming rewards.** Tiers are shown in the app (`REWARD_TIERS`); redeeming them at
  checkout is the next step.
- **Refunds** don't take points back yet.
