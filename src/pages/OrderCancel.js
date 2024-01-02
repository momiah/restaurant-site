import React from "react";
import styled from "styled-components";

const OrderSuccess = () => {
  return (
    <CancelPage>
      <CancelContainer>
        <CancelIcon>🚫</CancelIcon>
        <CancelHeading>Order Cancelled</CancelHeading>
        <BackButton href="/">Back to menu</BackButton>
      </CancelContainer>
      <ImageContainer>
        <ImageHeader>Follow us on instagram!</ImageHeader>
        <a href="https://www.instagram.com/tacomonsteruk/">
        <Image
          src={require("../images/instagram-logo-gradient-transparent.png")}

        />
        </a>
      </ImageContainer>
    </CancelPage>
  );
};

const CancelPage = styled.div({
  width: "100%",
  height: "100vh", // Take up full height of the viewport
  display: "flex",
  flexDirection: 'column',
  alignItems: "center",
  marginTop: 50,
});

const CancelContainer = styled.div({
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
    paddingLeft: "15px",
  },
  "@media (min-width: 768px) and (max-width: 1024px)": {
    width: "60%",
    fontSize: "1.2rem",
  },
  "@media (min-width: 1025px) and (max-width: 1920px)": {
    width: "40%",
    fontSize: "1.5rem",
    height: "25%",
  },
});

const CancelIcon = styled.h1({
  "@media (max-width: 767px)": {
    width: "90%",
    fontSize: "4rem",
    padding: 0,
    margin: 0
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

const CancelHeading = styled.h2({
  margin: 5,
  padding: 0,
});

const BackButton = styled.a({
  margin: 10,
  padding: 15,
  border: "1px solid #D1D1D1",
  borderRadius: 10,
  backgroundColor: "#E4E4E4",
  fontSize: '1rem',
  textDecoration: 'none'
});

const ImageContainer = styled.div({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  width: '50%',
  "@media (max-width: 767px)": {
    flexDirection: 'column',
    width: '70%',
  },
})

const ImageHeader = styled.h3({
  fontWeight: 'lighter',
  fontFamily: 'Pacifico',
  fontSize: '1.5rem'
})

const Image = styled.img({
  width: 65,
  height: 50,
  "@media (max-width: 767px)": {
    width: 140,
    height: 110
  },
});

export default OrderSuccess;
