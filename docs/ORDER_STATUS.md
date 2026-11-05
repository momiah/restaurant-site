# Order numbers & status

How an order moves from checkout to the customer's hands, and what everyone sees on the
way. It's modelled on Uber Eats / Deliveroo / Just Eat: the customer only ever sees a
handful of plain steps, and the only thing that changes between delivery and collection
is the wording of the last two.

## The steps

| `status`    | Kitchen taps (dashboard)                            | Customer sees: collection | Customer sees: delivery |
|-------------|-----------------------------------------------------|---------------------------|-------------------------|
| _(unpaid)_  | — order isn't shown to the kitchen                  | Confirming your payment…  | Confirming your payment… |
| `placed`    | **Start preparing**                                 | Order received            | Order received          |
| `preparing` | **Ready for collection** / **Send out for delivery**| Being prepared            | Being prepared          |
| `ready`     | **Mark collected** / **Mark delivered**             | Ready to collect          | Out for delivery        |
| `completed` | —                                                   | Collected                 | Delivered               |

Why only four: restaurants on MenuDock do their own delivery, so there's no separate
"driver assigned / driver arriving" stage — "out for delivery" covers it. One tap per
step keeps the tablet fast during a rush, and every step tells the customer something
they can act on (wait, head over, look out for the driver).

## Order numbers

When Stripe confirms a payment, the webhook (`functions/orders.js`, `markOrderPaid`):

1. gives the order the restaurant's next **order number** — sequential per restaurant,
   starting at `1001`, kept in `restaurants/{id}/counters/orders` (`{ next }`);
2. sets `status: "placed"` and `statusTimes.placed`;
3. records `payment_status: "paid"` and the customer details from Stripe.

It runs in a transaction and is safe for Stripe to retry: a retried event keeps the same
number and never resets an order the kitchen has already started. Both
`checkout.session.completed` and `checkout.session.async_payment_succeeded` are handled,
so delayed payment methods are numbered when they settle.

The customer sees the number (e.g. **#1004**) on the order page and quotes it at the
counter or on the phone; the kitchen sees the same number on the tablet.

## Who can change what (enforced by `firestore.rules`)

- **Customer** — follows their order live at `/order-success/?session_id=…`. The order id
  is the Stripe Checkout session id: long, unguessable, and only sent to that customer.
  Anyone holding the id can read that one order; nobody but the owner/admins can list or
  search orders.
- **Owner (dashboard)** — on their own **paid** orders may change only `status` (one of the
  four above) and `statusTimes`. They can step back to undo a mis-tap. They can't touch
  totals, items, payment status or the order number.
- **Stripe webhook (Admin SDK)** — the only thing that marks orders paid and numbers them.
- Nobody deletes orders.

`statusTimes.<status>` holds a server timestamp for each step, for "ready in X mins"
estimates and reporting later.

Orders paid before this workflow existed have `status: "active"`; every app treats that
as `placed`.

## Deploying

Rules and the webhook change together:

```bash
firebase deploy --only firestore:rules,functions
```

Run `cd rules-tests && npm test` first (see `docs/ONBOARDING.md`).
