/* eslint-disable max-len */
const functions = require("firebase-functions");
// const firestore = require("firebase-admin").initializeApp().firestore();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const stripe = require("stripe")(functions.config().stripe.token);

const app = express();
// const PORT = 8082;

app.use(express.json());
app.use(cors({origin: "*", credentials: true, optionSuccessStatus: 200}));
app.use(bodyParser.json());

// route endpoint
app.post("/stripe-session", async (req, res) => {
  const cartItems = [...req.body.cartItems];
  console.log("cartItems =============================================>", cartItems);

  const transformedItems = cartItems?.map((item) => ({
    price_data: {
      currency: "GBP",
      product_data: {
        name: `${item?.name} ${item?.extras?.reduce((a, e) => a += "+ " + e?.type, "")}`,
        images:
          ["https://img.freepik.com/free-photo/delicious-taco-studio_23-2150799517.jpg"],
        description: item?.description,
      },
      unit_amount_decimal: item?.price * 100,
    },
    quantity: item?.quantity,
    adjustable_quantity: {
      enabled: true,
      minimum: 0,
      // maximum: item.stock,
    },
  }));

  // return res.json(transformedItems);

  if (req.method === "POST") {
    try {
      // Create Checkout Sessions from body params.
      const session = await stripe.checkout.sessions.create({
        line_items: transformedItems,
        mode: "payment",
        success_url: `${req.headers.origin}/?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin}/?session_id={CHECKOUT_SESSION_ID}`,
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

// app.listen(PORT, () => {
//   console.log("API os listening on port", PORT);
// });

exports.payments = functions.https.onRequest(app);
