import React, { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import styled from "styled-components";
import { useCart } from "../components/AddToCart/CartContext";
import "../index.css";

const OrderDetails = ({ data }) => {
  const collectionMessage =
    "A full receipt has been sent to your email, please allow up to 45 minutes to receive your order. Our address is ";

  return (
    <OrderDetailsContainer>
      <Details>
        <strong>Order ID:</strong>{" "}
        {(data.id && data.id.slice(-5).toUpperCase()) || "-"}
      </Details>
      <Details>
        <strong>Customer Name:</strong> {data.name || "-"}
      </Details>
      {data.address && (
        <Details>
          <strong>Address:</strong> {data.address || "-"}
        </Details>
      )}
      <Details>
        <strong>Contact Number:</strong> {data.contactNumber || "-"}
      </Details>
      <Details>
        <strong>Total:</strong> £{data.total}
      </Details>
      <Details>
        A full receipt has been sent to your email, please allow up to 45
        minutes to receive your order. If it has been more than 45 minutes feel
        free to call us on 0207 1234 5678
      </Details>
    </OrderDetailsContainer>
  );
};

const OrderSuccess = () => {
  const [data, setData] = useState({});
  const { setCartItems } = useCart();
  // get session_id from the URL
  const urlParams = new URLSearchParams(window.location.search);
  const session_id = urlParams.get("session_id");
  const collectionAddress = "cloud kitchen, 644 Hertford Rd, Enfield EN3 6LZ";
  console.log("data:", data);

  useEffect(() => {
    if (data.payment_status === "paid") {
      setCartItems([]);
    }
  }, [data]);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        const query = await getDoc(doc(db, "orders", session_id));
        setData(query.data());
      } catch (error) {
        console.error(error);
      }
    };

    fetchOrderDetails();
  }, [session_id]);

  return (
    <SuccessPage>
      <SuccessContainer>
        <PartyHat>🎉</PartyHat>
        <SuccessHeading>Order Success!</SuccessHeading>
        <DetailsHeading>Here is your order details</DetailsHeading>
        <OrderDetails data={data} />
        {data.orderType === "Collection" && (
          <CollectionContainer>
            <CollectionDetails>
              Please collect your order from the address below:
            </CollectionDetails>
            <CollectionDetails>
              <strong>{collectionAddress}</strong>
            </CollectionDetails>
          </CollectionContainer>
        )}
      </SuccessContainer>

      <ImageContainer>
        <ImageHeader>Follow us on instagram!</ImageHeader>
        <a href="https://www.instagram.com/tacomonsteruk/">
          <Image
            src={require("../images/instagram-logo-gradient-transparent.png")}
          />
        </a>
      </ImageContainer>
    </SuccessPage>
  );
};

const SuccessPage = styled.div({
  width: "100%",
  height: "100vh", // Take up full height of the viewport
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
  fontSize: "1.2rem",
  textAlign: "center",
  padding: "20px",
  borderRadius: "20px",
  backgroundColor: "#FAFAFA",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  "@media (max-width: 767px)": {
    width: "80%",
    fontSize: "1rem",
  },
  "@media (min-width: 768px) and (max-width: 1024px)": {
    width: "60%",
    fontSize: "1.2rem",
  },
  "@media (min-width: 1025px) and (max-width: 1920px)": {
    width: "40%",
    fontSize: "1.5rem",
    // height: "70%",
  },
});

const CollectionContainer = styled.div({
  margin: "20px",
  border: "1px solid #DDDDDD",
  fontSize: "1.2rem",
  textAlign: "center",
  padding: "20px",
  borderRadius: "20px",
  backgroundColor: "#FAFAFA",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  "@media (max-width: 767px)": {
    width: "90%",
    fontSize: "1rem",
  },
  "@media (min-width: 768px) and (max-width: 1024px)": {
    width: "60%",
    fontSize: "1.2rem",
  },
  "@media (min-width: 1025px) and (max-width: 1920px)": {
    width: "75%",
    fontSize: "1.5rem",
    // height: "5%",
  },
});

const PartyHat = styled.h1({
  "@media (max-width: 767px)": {
    width: "90%",
    fontSize: "4rem",
    padding: 0,
    margin: 0,
  },
  "@media (min-width: 768px) and (max-width: 1024px)": {
    width: "60%",
    fontSize: "1.2rem",
  },
  "@media (min-width: 1025px) and (max-width: 1920px)": {
    fontSize: "4.5rem",
    padding: 0,
    margin: 0,
  },
});

const SuccessHeading = styled.h2({
  margin: 5,
  padding: 0,
});

const DetailsHeading = styled.h5({
  margin: 0,
  padding: 0,
});

const OrderDetailsContainer = styled.div({
  width: "95%",
  height: "80%",
  backgroundColor: "#E4E4E4",
  borderRadius: 10,
  textAlign: "left",
  marginTop: 20,
  padding: "25px 0",
  "@media (min-width: 1025px) and (max-width: 1920px)": {
    fontSize: "4.5rem",
    padding: 30,
    margin: 0,
    marginTop: 20,
    height: "60%",
    width: "75%",
  },
});

const Details = styled.p({
  fontSize: "0.75rem",
  margin: "20px 30px",
  display: "flex",
  justifyContent: "space-between",
  "@media (min-width: 1025px) and (max-width: 1920px)": {
    padding: 20,
    margin: 0,
    fontSize: "1rem",
  },
});

const CollectionDetails = styled.p({
  fontSize: "0.75rem",

  "@media (min-width: 1025px) and (max-width: 1920px)": {
    padding: 5,
    margin: 0,
    fontSize: "1rem",
  },
});

const ImageContainer = styled.div({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  width: "full",
  "@media (min-width: 1025px) and (max-width: 1920px)": {
    flexDirection: "row",
  },
});

const ImageHeader = styled.h3({
  fontWeight: "lighter",
  fontFamily: "Pacifico",
  fontSize: "1.5rem",
});

const Image = styled.img({
  width: 140,
  height: 100,
  "@media (min-width: 1025px) and (max-width: 1920px)": {
    width: 70,
    height: 50,
  },
});

export default OrderSuccess;
