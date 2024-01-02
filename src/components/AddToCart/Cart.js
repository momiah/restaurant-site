import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { useCart } from "./CartContext";
import CustomerForm from "./CustomerForm";
import { db } from "../../config/firebase";
import { doc, setDoc } from "firebase/firestore";
import {
  getUserLocation,
  isWithin2Miles,
} from "../../LocationVerifier/LocationVerifier";
import Popup from "../Modals/Popup";

const Cart = () => {
  const {
    cartItems,
    isCartOpen,
    toggleCart,
    increaseQuantity,
    decreaseQuantity,
  } = useCart();
  const [isCartExpanded, setIsCartExpanded] = useState(false);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [popupTitle, setPopupTitle] = useState("");
  const [popupMessage, setPopupMessage] = useState("");
  const [popupIcon, setPopupIcon] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 767);
  //const total = cartItems.reduce((acc, item) => acc + item.price, 0);

  const [total, setTotal] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    contactNumber: "",
    address: "",
    postCode: "",
    notes: "",
    total: total,
    orderType: "Collection",
  });

  useEffect(() => {
    const newTotal = cartItems.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0
    );
    setTotal(newTotal); // Update the total state
  }, [cartItems]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 767);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const handleClose = (e) => {
    toggleCart(false);
    e.stopPropagation();
  };

  const toggleCartItems = () => {
    setIsCartExpanded(!isCartExpanded);
  };

  const handleDeliverySubmit = async () => {
    if (!formData.contactNumber && !formData.address) {
      setPopup("⚠️", "No Address and Contact number", "Please add an address and Contact number");
      return;
    } else if (!formData.address) {
      setPopup("📍", "No Address", "Please add an address");
      return;
    } else if (!formData.contactNumber || formData.contactNumber.split('').length < 11) {
      setPopup("📞", "No Contact Number", "Please add a contact number");
      return;
    }

    if (!formData.postCode || formData.postCode.split('').length < 5) {
        setPopup("⚠️", "No Postcode or invalid post code", "Please add a valid postcode");
        return;
    } else if (formData.postCode) {
        // Check if the first three characters are not in the specified list
        const validPrefixes = ['EN1', 'EN2', 'EN3', 'EN7', 'EN8', 'EN9'];
        if (!validPrefixes.some(prefix => formData.postCode.startsWith(prefix))) {
          // Display the popup if the condition is not met
          setPopup("⚠️", "Not in Delivery Location", "You are not within the delivery location, please try collection instead");
          return;
        }
      }

    // setIsProcessing(true);
  
    try {
      // Check if delivery is available
      const location = await getUserLocation();
      if (location) {
        const { latitude, longitude } = location;
        const within2Miles = isWithin2Miles(latitude, longitude);
  
        if (within2Miles) {
          handlePaymentProcessing();
        } else {
          setPopup("⚠️", "Not in Delivery Location", "You are not within the delivery location, please try collection instead");
        }
      }
    } catch (error) {
      console.error(error);
      setIsProcessing(false);
    }
  };
  
  const handlePickupSubmit = async () => {
    if (!formData.contactNumber) {
      setPopup("📞", "No Contact number", "Please add Contact number");
      return;
    }
   


    if (formData.contactNumber.split('').length < 11) {
        setPopup("📞", "Incorrect contact number", "Your number must be 11 digits");
        return;
      }

    // setIsProcessing(true);
  
    try {
      handlePaymentProcessing();
    } catch (error) {
      console.error(error);
      setIsProcessing(false);
    }
  };
  
  const handlePaymentProcessing = async () => {
    setIsProcessing(true);
  
    try {
      const requestOptions = {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "http://localhost:3000",
          "Access-Control-Allow-Credentials": "true",
        },
        method: "POST",
        body: JSON.stringify({
          cartItems,
          total,
          orderType: formData.orderType,
        }),
        redirect: "follow",
      };
  
      const res = await fetch(
        "https://us-central1-tacomonster-a73fa.cloudfunctions.net/payments/stripe-session",
        requestOptions
      );
  
      const data = await res.json();
  
      if (data?.id && data?.url) {
        await setDoc(doc(db, "orders", data.id), {
          ...formData,
          orderItems: cartItems,
          id: data.id,
          payment_status: "pending",
          total,
        });
        
        window.location.href = data.url;
      } else {
        setPopup("🛒", "Your cart is empty!", "Please add items to your cart");
      }
    } catch (error) {
      console.error(error);
    }
  };
  
  const setPopup = (icon, title, message) => {
    setPopupIcon(icon);
    setPopupTitle(title);
    setPopupMessage(message);
    setIsPopupVisible(true);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
  


    if (formData.orderType === "Delivery") {
      handleDeliverySubmit();
    } else {
      handlePickupSubmit();
    }
  
    console.log("formData:", formData);
  };
  

  if (!isCartOpen) return null;

  return (
    <OuterWrapper onClick={handleClose}>
      {isPopupVisible && (
        <Popup icon={popupIcon} heading={popupTitle} text={popupMessage} setIsPopupVisible={setIsPopupVisible} />
      )}
      <CartContainer onClick={(e) => e.stopPropagation()}>
        <CloseButton onClick={handleClose}>X</CloseButton>
        <OrderExpand>
          <h2 style={{ textAlign: "left", fontSize: "1.5rem" }}>Your Order</h2>
          <h5 style={{ position: "initial" }}>{cartItems.length} Items</h5>
          {isMobile && ( // Display toggle button only on mobile
            <button
              onClick={toggleCartItems}
              style={{ fontSize: "1.5rem", width: 30, textAlign: 'center' }}
            >
              {isCartExpanded ? "-" : "+"}
            </button>
          )}
        </OrderExpand>
        <InnerContainer>
          {(isMobile ? isCartExpanded : true) && (
            <CartDetails>
              {cartItems.length > 0 ? (
                cartItems.map((item, index) => (
                  <CartItem key={index}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 10,
                      }}
                    >
                      <h3>{item.name}</h3>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <QuantityButton
                          onClick={() =>
                            decreaseQuantity(item.name, item.extras)
                          }
                        >
                          -
                        </QuantityButton>
                        <span
                          style={{
                            padding: "10px 15px",
                            margin: 10,
                            fontWeight: "bold",
                          }}
                        >
                          {item.quantity}
                        </span>{" "}
                        {/* Display the quantity here */}
                        <QuantityButton
                          onClick={() =>
                            increaseQuantity(item.name, item.extras)
                          }
                        >
                          +
                        </QuantityButton>
                      </div>
                    </div>

                    {item.extras &&
                      item.extras.map((extra, idx) => (
                        <div
                          style={{
                            flexDirection: "row",
                            display: "flex",
                            justifyContent: "space-between",
                            marginTop: "-20px",
                          }}
                        >
                          <p key={idx}>{extra.type} </p>
                          <p> £{extra.price.toFixed(2)}</p>
                        </div>
                      ))}
                    <p style={{ textAlign: "right", fontWeight: "bold" }}>
                      £{(item.price * item.quantity).toFixed(2)}{" "}
                      {/* Updated subtotal */}
                    </p>
                  </CartItem>
                ))
              ) : (
                <div style={{ textAlign: "center", marginTop: "20px" }}>
                  No items in your cart
                </div>
              )}
            </CartDetails>
          )}
          <CheckoutInfo onSubmit={handleSubmit}>
            <CustomerDetailsContainer>
              <h2
                style={{
                  textAlign: "left",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginLeft: 15,
                  fontSize: "1.5rem",
                }}
              >
                Your Details
                {!isMobile && (
                  <OrderTypeOption>
                    <input
                      type="radio"
                      id="collection"
                      name="orderType"
                      value="Collection"
                      defaultChecked
                      onChange={(e) =>
                        setFormData((prevData) => ({
                          ...prevData,
                          orderType: e.target.value,
                        }))
                      }
                    />
                    <label htmlFor="collection">Collection</label>
                    <input
                      type="radio"
                      id="delivery"
                      name="orderType"
                      value="Delivery"
                      onChange={(e) =>
                        setFormData((prevData) => ({
                          ...prevData,
                          orderType: e.target.value,
                        }))
                      }
                    />
                    <label htmlFor="delivery">Delivery</label>
                  </OrderTypeOption>
                )}
                {isMobile && (
                  <button
                    type="button"
                    onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
                    style={{ fontSize: "1.5rem", width: 30 }}
                  >
                    {isDetailsExpanded ? "-" : "+"}
                  </button>
                )}
              </h2>
              {isMobile && (
                <div
                  style={{
                    textAlign: "left",
                    marginLeft: 15,
                    marginBottom: 15,
                  }}
                >
                  <input
                    type="radio"
                    id="collection"
                    name="orderType"
                    value="Collection"
                    defaultChecked
                  
                    onChange={(e) =>
                      setFormData((prevData) => ({
                        ...prevData,
                        orderType: e.target.value,
                      }))
                    }
                  />
                  <label style={{marginRight: 20}} htmlFor="collection">Collection</label>
                  <input
                    type="radio"
                    id="delivery"
                    name="orderType"
                    value="Delivery"
                    onChange={(e) =>
                      setFormData((prevData) => ({
                        ...prevData,
                        orderType: e.target.value,
                      }))
                    }
                  />
                  <label htmlFor="delivery">Delivery</label>
                </div>
              )}
              {(isMobile ? isDetailsExpanded : true) && (
                <CustomerForm formData={formData} setFormData={setFormData} />
              )}
            </CustomerDetailsContainer>

            <Total>Total: £{total.toFixed(2)}</Total>
            <CheckoutButton type="submit" disabled={isProcessing}>
              {isProcessing ? "Processing..." : "Go To Checkout"}
            </CheckoutButton>
          </CheckoutInfo>
        </InnerContainer>
      </CartContainer>
    </OuterWrapper>
  );
};

const Total = styled.h3({
  fontSize: "25px",
  "@media (max-width: 767px)": {
    margin: "40px 10px",
    fontSize: "20px",
  },
});

const OuterWrapper = styled.div({
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999,
  overflowY: "scroll",
});

const OrderExpand = styled.div({
  display: "flex",
  width: "46.5%",
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",

  "@media (max-width: 767px)": {
    margin: "50px 10px 20px 0",
    border: "1px solid #ccc",
    padding: "0 10px",
    borderRadius: 10,
    width: "93.5%",
  },
  "@media (min-width: 768px) and (max-width: 1024px)": {
    margin: "50px 10px 20px",
    border: "1px solid #ccc",
    padding: "0 10px",
    width: "90%",
    borderRadius: 10,
  },
  "@media (min-width: 1025px) and (max-width: 1920px)": {
    margin: "50px 10px 20px",
    border: "1px solid #ccc",
    padding: "0 10px",
    borderRadius: 10,
    width: "90%",
  },
});

const OrderTypeOption = styled.div({
  display: "flex",
  alignItems: "center",
  fontSize: "1rem" /* Adjust the font size as needed */,
  label: {
    margin: "0 10px",
  },
  "@media (max-width: 767px)": {
    marginBottom: 10,
  },
});

const QuantityButton = styled.button({
  height: "25px",
  width: "25px",
  border: "1px solid black",
  backgroundColor: "#171717",
  color: "white",
  fontSize: 20,
  "&:active": {
    backgroundColor: "#333", // Darker color when the button is clicked
    transform: "scale(0.98)", // Slightly scale down the button when clicked
  },
});

const CartContainer = styled.div({
  backgroundColor: "white",
  padding: "60px 20px 20px 20px",
  borderRadius: "10px",
  boxShadow: "0px 0px 15px rgba(0, 0, 0, 0.2)",
  position: "fixed",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "50%",
  height: "750px",
  maxHeight: "80vh",
  overflowY: "visible",
  zIndex: 1000,
  "@media (max-width: 767px)": {
    width: "90%",
    padding: "10px",
    height: "auto",
    maxHeight: "90vh",
    overflowY: "scroll",
    overflowX: "hidden",
  },
  "@media (min-width: 768px) and (max-width: 1024px)": {
    width: "75%",
    padding: "15px",
    height: "auto",
    maxHeight: "85vh",
    overflowY: "scroll",
  },
  "@media (min-width: 1025px) and (max-width: 1920px)": {
    width: "50%",
    padding: "20px",
    height: "auto",
    maxHeight: "80vh",
    overflowY: "scroll",
  },
});

const CartItem = styled.div({
  borderBottom: "1px solid #DDDDDD",
  marginBottom: "10px",
  paddingBottom: "10px",
  width: "93%",
  textAlign: "left",
  "@media (max-width: 767px)": {
    fontSize: "0.8rem",
    margin: "0 10px",
  },
  "@media (min-width: 768px) and (max-width: 1024px)": {
    fontSize: "0.9rem",
    width: "90%",
  },
  "@media (min-width: 1025px) and (max-width: 1920px)": {
    fontSize: "0.7rem",
    width: "90%",
    marginLeft: 20,
  },
});

const CloseButton = styled.button({
  position: "absolute",
  top: "10px",
  right: "10px",
  background: "none",
  border: "none",
  fontSize: "1.5rem",
  cursor: "pointer",
  "@media (max-width: 767px)": {
    fontSize: "1.2rem",
  },
  "&:active": {
    backgroundColor: "#333", // Darker color when the button is clicked
    transform: "scale(0.98)", // Slightly scale down the button when clicked
  },
});

const InnerContainer = styled.div({
  display: "flex",
  flexDirection: "row",
  width: "100%",
  gap: "20px",
  height: "650px",
  "@media (max-width: 767px)": {
    flexDirection: "column",
    height: "auto",
  },
  "@media (min-width: 768px) and (max-width: 1024px)": {
    flexDirection: "column",
    height: "auto",
  },
  "@media (min-width: 1025px) and (max-width: 1920px)": {
    flexDirection: "column",
    height: "auto",
  },
});

const CartDetails = styled.div({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  overflowY: "auto",
  "@media (max-width: 767px)": {
    marginBottom: "10px",
  },
  "@media (min-width: 768px) and (max-width: 1024px)": {
    alignItems: "center",
  },
  "@media (min-width: 1025px) and (max-width: 1920px)": {
    flexDirection: "column",
    height: "auto",
  },
});

const CheckoutInfo = styled.form({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  textAlign: "right",
  marginBottom: 30,
  justifyContent: "flex-start", // Align content to the top
  overflow: "none",
  "@media (max-width: 767px)": {
    fontSize: "0.8rem",
  },
  "@media (min-width: 768px) and (max-width: 1024px)": {
    fontSize: "0.9rem",
  },
});

const CustomerDetailsContainer = styled.div({
  flex: 1,
  padding: "0 10px 0 0",
  marginTop: "-70px", // Adjust the top margin
  borderRadius: 10,
  border: "1px solid #ccc",
  "@media (max-width: 767px)": {
    borderRadius: 10,
    border: "1px solid #ccc",
    marginTop: "10px", // Adjust the top margin
  },
  "@media (min-width: 768px) and (max-width: 1024px)": {
    margin: "20px 10px 20px", // Adjusted margin
    padding: "0 10px",
    width: "90%",
    borderRadius: 10,
    border: "1px solid #ccc",
  },
  "@media (min-width: 1025px) and (max-width: 1920px)": {
    paddingRight: 80,
    margin: "30px 10px 20px", // Adjusted margin
    padding: "0 10px",
    width: "90%",
  },
});

const CheckoutButton = styled.button({
  cursor: "pointer",
  backgroundColor: "#171717",
  borderRadius: 7,
  height: 20,
  padding: 20,
  color: "white",
  fontWeight: "bold",
  "@media (max-width: 767px)": {
    height: "50px",
    fontSize: "0.8rem",
  },
  "@media (min-width: 768px) and (max-width: 1024px)": {
    height: "55px",
    fontSize: "0.9rem",
  },
  "@media (min-width: 1025px)": {
    height: "60px", // Explicitly setting the height for screens larger than 1025px
  },
  "&:active": {
    backgroundColor: "#333", // Darker color when the button is clicked
    transform: "scale(0.98)", // Slightly scale down the button when clicked
  },
});

export default Cart;
