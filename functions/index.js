/* eslint-disable camelcase */
/* eslint-disable max-len */
const functions = require("firebase-functions");
const firestore = require("firebase-admin").initializeApp().firestore();
const express = require("express");
const cors = require("cors");
const stripe = require("stripe")(functions.config().stripe.token);

// const PORT = 8082;
const app = express();
app.use(cors({origin: true}));

// route endpoint
app.post("/stripe-session", async (req, res) => {
  const cartItems = [...req.body.cartItems];

  const transformedItems = cartItems?.map((item) => ({
    price_data: {
      currency: "GBP",
      product_data: {
        name: `${item?.name} ${item?.extras?.reduce((a, e) => a += `+ ${e?.type} `, "")}`,
        images: [item.image],
        description: item?.description,
      },
      unit_amount_decimal: item?.price * 100,
    },
    quantity: item?.quantity,
    // adjustable_quantity: {
    //   enabled: false,
    //   minimum: 0,
    //   maximum: item.stock,
    // },
  }));

  if (req.method === "POST") {
    try {
      // Create Checkout Sessions from body params.
      const session = await stripe.checkout.sessions.create({
        line_items: transformedItems,
        mode: "payment",
        success_url: `${req.headers.origin}/?session_id={CHECKOUT_SESSION_ID}&success=true`,
        cancel_url: `${req.headers.origin}/?session_id={CHECKOUT_SESSION_ID}&success=false`,
        // shipping_options: [
        //   { shipping_rate: "shr_1Mum5DHNnpMceVwomaHhUCiJ" },
        //   { shipping_rate: "shr_1MumbYHNnpMceVwo2WU7AzUi" },
        // ],
        allow_promotion_codes: true,
      });
      res.json(session);
    } catch (err) {
      res.status(err.statusCode || 500).json(err.message);
    }
  } else {
    res.setHeader("Allow", "POST");
    res.status(405).end("Method Not Allowed");
  }
});

app.post("/checkout-webhook", express.raw({type: "application/json"}), async (request, response) => {
  const event = request.body;
  // const webhook_secret = functions.config().stripe.webhook_secret;
  // Only verify the event if you have an endpoint secret defined.
  // Otherwise use the basic event deserialized with JSON.parse
  // if (webhook_secret) {
  //   // Get the signature sent by Stripe
  //   const signature = request.headers["stripe-signature"];
  //   try {
  //     event = stripe.webhooks.constructEvent(request.body, signature, webhook_secret);
  //   } catch (err) {
  //     console.log(`⚠️  Webhook signature verification failed.`, err.message);
  //     return response.status(400).send(`Webhook Error: ${err.message} ${JSON.stringify(request.body)}`);
  //   }
  // }

  // Handle the checkout.session.completed event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    // Fulfill the purchase...
    console.log("session", session);
    // update data in order data with id of session in firestore
    await firestore.collection("orders").doc(session.id).update({
      payment_status: session.payment_status,
      customer_details: session.customer_details,
      currency: session.currency,
      created: session.created,
      status: "active",
    });
  }

  response.sendStatus(200);
});

// app.listen(PORT, () => {
//   console.log("API os listening on port", PORT);
// });

exports.payments = functions.https.onRequest(app);
