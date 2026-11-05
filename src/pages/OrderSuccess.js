import React, { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebase";
import styled from "styled-components";
import { useCart } from "../components/AddToCart/CartContext";
import { useRestaurant } from "../restaurant/RestaurantContext";
import OrderTracker from "../orders/OrderTracker";
import { isDelivery, orderReference } from "../orders/orderStatus";
import "../index.css";

const formatMoney = (amount, currency = "GBP") => {
  const value = Number(amount);
  if (!Number.isFinite(value)) return "-";
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency: currency.toUpperCase() }).format(value);
  } catch {
    return `£${value.toFixed(2)}`;
  }
};

const OrderDetails = ({ order, orderId, phone }) => (
  <OrderDetailsContainer>
    <Details>
      <strong>Order number:</strong> <span data-testid="order-ref">{orderReference(order, orderId)}</span>
    </Details>
    <Details>
      <strong>Name:</strong> {order.name || "-"}
    </Details>
    {isDelivery(order) && order.address && (
      <Details>
        <strong>Delivering to:</strong> {order.address}
      </Details>
    )}
    <Details>
      <strong>Contact number:</strong> {order.contactNumber || "-"}
    </Details>
    <Details>
      <strong>Total:</strong> {formatMoney(order.total, order.currency || undefined)}
    </Details>
    <Note>
      A receipt has been sent to your email. Keep this page open to follow your
      order — it updates by itself.
      {phone && <> Any questions? Call us on <a href={`tel:${phone.replace(/\s/g, "")}`}>{phone}</a>.</>}
    </Note>
  </OrderDetailsContainer>
);

const OrderSuccess = () => {
  const [order, setOrder] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const { setCartItems } = useCart();
  const { restaurant } = useRestaurant();
  const orderId = new URLSearchParams(window.location.search).get("session_id");
  const collectionAddress =
    restaurant?.ordering?.collectionAddress ||
    restaurant?.address?.formatted ||
    "";
  const phone = restaurant?.contact?.phone;
  const instagramHandle = restaurant?.contact?.instagram;
  const instagramUrl = instagramHandle
    ? `https://www.instagram.com/${instagramHandle}/`
    : null;
  const paid = order?.payment_status === "paid";

  useEffect(() => {
    if (paid) setCartItems([]);
  }, [paid, setCartItems]);

  // Follow the order live: the payment webhook confirms it, then the kitchen moves it on.
  useEffect(() => {
    if (!orderId) {
      setNotFound(true);
      return undefined;
    }
    return onSnapshot(
      doc(db, "orders", orderId),
      (snap) => {
        setNotFound(!snap.exists());
        if (snap.exists()) setOrder({ id: snap.id, ...snap.data() });
      },
      (error) => {
        console.error(error);
        setNotFound(true);
      }
    );
  }, [orderId]);

  if (notFound) {
    return (
      <SuccessPage>
        <SuccessContainer>
          <SuccessHeading>We couldn't find that order</SuccessHeading>
          <Note>
            If you've paid, your receipt email has your order details.
            {phone && <> Call us on <a href={`tel:${phone.replace(/\s/g, "")}`}>{phone}</a> and we'll help.</>}
          </Note>
        </SuccessContainer>
      </SuccessPage>
    );
  }

  if (!order) {
    return (
      <SuccessPage>
        <SuccessContainer>
          <SuccessHeading>Loading your order…</SuccessHeading>
        </SuccessContainer>
      </SuccessPage>
    );
  }

  return (
    <SuccessPage>
      <SuccessContainer>
        {paid && <PartyHat>🎉</PartyHat>}
        <SuccessHeading>{paid ? "Thanks for your order!" : "Almost there"}</SuccessHeading>
        <OrderTracker order={order} />
        <OrderDetails order={order} orderId={orderId} phone={phone} />
        {!isDelivery(order) && collectionAddress && (
          <CollectionContainer>
            <CollectionDetails>Collect your order from:</CollectionDetails>
            <CollectionDetails>
              <strong>{collectionAddress}</strong>
            </CollectionDetails>
          </CollectionContainer>
        )}
      </SuccessContainer>

      {instagramUrl && (
        <ImageContainer>
          <ImageHeader>Follow us on instagram!</ImageHeader>
          <a href={instagramUrl}>
            <Image
              src={require("../images/instagram-logo-gradient-transparent.png")}
              alt="Instagram"
            />
          </a>
        </ImageContainer>
      )}
    </SuccessPage>
  );
};

const SuccessPage = styled.div({
  width: "100%",
  minHeight: "100vh",
  display: "flex",
  justifyContent: "flex-start",
  alignItems: "center",
  flexDirection: "column",
  marginTop: 25,
});

const SuccessContainer = styled.div({
  width: "40%",
  margin: "20px",
  border: "1px solid #DDDDDD",
  textAlign: "center",
  padding: "24px",
  borderRadius: "20px",
  backgroundColor: "#FAFAFA",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  boxSizing: "border-box",
  "@media (max-width: 767px)": {
    width: "calc(100% - 32px)",
    margin: "16px",
    padding: "16px",
  },
  "@media (min-width: 768px) and (max-width: 1024px)": {
    width: "70%",
  },
});

const CollectionContainer = styled.div({
  width: "100%",
  marginTop: 16,
  border: "1px solid #DDDDDD",
  textAlign: "center",
  padding: "12px",
  borderRadius: "12px",
  backgroundColor: "#FFFFFF",
  boxSizing: "border-box",
});

const PartyHat = styled.div({
  fontSize: "3.5rem",
  lineHeight: 1,
});

const SuccessHeading = styled.h1({
  margin: "8px 0 16px",
  fontSize: "1.4rem",
});

const OrderDetailsContainer = styled.div({
  width: "100%",
  backgroundColor: "#E4E4E4",
  borderRadius: 10,
  textAlign: "left",
  marginTop: 24,
  padding: "12px 0",
  boxSizing: "border-box",
});

const Details = styled.p({
  fontSize: "0.95rem",
  margin: "10px 20px",
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
});

const Note = styled.p({
  fontSize: "0.85rem",
  margin: "14px 20px 6px",
  color: "#444",
});

const CollectionDetails = styled.p({
  fontSize: "0.95rem",
  margin: 4,
});

const ImageContainer = styled.div({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  "@media (min-width: 1025px)": {
    flexDirection: "row",
    gap: 16,
  },
});

const ImageHeader = styled.h3({
  fontWeight: "lighter",
  fontFamily: "Pacifico",
  fontSize: "1.5rem",
});

const Image = styled.img({
  width: 70,
  height: 50,
});

export default OrderSuccess;
