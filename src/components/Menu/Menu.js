import React, { useState } from "react";
import { MenuConfig } from "./Menu.config";
import MenuItem from "./MenuItem/MenuItem";
import styled from "styled-components";

const Menu = () => {

  const scrollToCategory = (category) => {
    const element = document.getElementById(category);
    console.log('elemt', element)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div style={container}>
      <Image src={require("../../images/tacomonster.png")} />
      <MenuNavContainer>
      {MenuConfig.map((menuItem) => (
          <MenuNav key={menuItem.category} onClick={() => scrollToCategory(menuItem.category)}>
            {menuItem.category}
          </MenuNav>
        ))}
      </MenuNavContainer>
      {MenuConfig.map((menuItem, index) => (
        <MenuItem menuItem={menuItem} key={index}  />
      ))}
    </div>
  );
};

const container = {
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  padding: "20px",

  // Media queries
  "@media (max-width: 600px)": {
    // For mobile devices
    padding: "10px",
  },
  "@media (min-width: 601px) and (max-width: 1024px)": {
    // For tablets
    padding: "15px",
  },
  "@media (min-width: 1025px)": {
    // For desktops and larger screens
    padding: "20px",
  },
  "@media (min-width: 1025px) and (max-width: 1920px)": {},
};

const MenuNav = styled.a({
  display: "flex",
  flexDirection: "row",

});

const MenuNavContainer = styled.div({
  display: "flex",
  flexDirection: "row",
  justifyContent: 'space-between',
  width: '95%',
  fontWeight: 'bold',
  margin: '20px 0',
  "@media (min-width: 1025px) and (max-width: 1920px)": {
  
    width: '35%',
    padding: 0,
 
  },
});

const Image = styled.img({
  width: 150,
  height: 150,
});

export default Menu;
