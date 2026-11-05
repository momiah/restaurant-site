const {FieldValue} = require("firebase-admin/firestore");

// Order numbers are per restaurant and start here (customers see e.g. "#1042").
const FIRST_ORDER_NUMBER = 1001;

/**
 * Record a Stripe Checkout session on its order. When the session is paid, the
 * order gets the restaurant's next order number and enters the kitchen workflow
 * ("placed"). Idempotent: Stripe can deliver an event more than once, so an
 * order is numbered once and a status the kitchen moved on is never reset.
 * @param {FirebaseFirestore.Firestore} db Admin Firestore instance.
 * @param {Object} session Stripe Checkout Session object.
 * @return {Promise<{orderNumber: (number|undefined), restaurantId: string}>}
 */
async function markOrderPaid(db, session) {
  const orderRef = db.collection("orders").doc(session.id);
  return db.runTransaction(async (tx) => {
    const orderSnap = await tx.get(orderRef);
    const order = orderSnap.exists ? orderSnap.data() : {};
    const restaurantId = order.restaurantId ||
      (session.metadata && session.metadata.restaurantId);
    if (!restaurantId) {
      throw new Error(`Order ${session.id} has no restaurantId`);
    }

    const paid = session.payment_status === "paid";
    const update = {
      restaurantId,
      payment_status: session.payment_status,
      customer_details: session.customer_details || null,
      currency: session.currency || null,
      created: session.created || null,
    };

    let orderNumber = order.orderNumber;
    if (paid && !orderNumber) {
      const counterRef = db.collection("restaurants").doc(restaurantId)
          .collection("counters").doc("orders");
      const counter = await tx.get(counterRef); // all reads before any writes
      orderNumber = counter.exists ? counter.get("next") : FIRST_ORDER_NUMBER;
      tx.set(counterRef, {next: orderNumber + 1}, {merge: true});
      update.orderNumber = orderNumber;
    }

    // "active" is what the previous webhook wrote for a paid order.
    if (paid && (!order.status || order.status === "active")) {
      update.status = "placed";
      update.statusTimes = {placed: FieldValue.serverTimestamp()};
    }

    tx.set(orderRef, update, {merge: true});
    return {orderNumber, restaurantId};
  });
}

module.exports = {markOrderPaid, FIRST_ORDER_NUMBER};
