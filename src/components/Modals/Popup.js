import React from "react";
import styled from "styled-components";

const Popup = ({ heading, icon, text, setIsPopupVisible }) => {

    const handleClose = (e) => {
        setIsPopupVisible(false); 
        e.stopPropagation();
      };


  return (
    <OuterWrapper onClick={handleClose}>
    <PopupContainer >
      <Icon>{icon}</Icon>
      <h1>{heading}</h1>
      <p>{text}</p>
    </PopupContainer>
    </OuterWrapper>
  );
};

const OuterWrapper = styled.div({
    position: "absolute",
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
  

const PopupContainer = styled.div({
    backgroundColor: "white",
    padding: 25,
    borderRadius: 10,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    "@media (max-width: 767px)": {
        margin: 15
      },
    "@media (min-width: 1025px) and (max-width: 1920px)": {
width: '20%'
      },
})

const Icon = styled.div({
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
      fontSize: "3rem",
      padding: 0,
      margin: 0,
    },
})

export default Popup