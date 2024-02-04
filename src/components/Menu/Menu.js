import React from "react";
import { MenuConfig } from "./Menu.config";
import MenuItem from "./MenuItem/MenuItem";
import styled from "styled-components";
import { IoIosArrowDropupCircle } from "react-icons/io";



const Menu = () => {

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };


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
             {/* <CategoryImage src={menuItem.items[0].imageUrl} alt={menuItem.category} /> */}
            {menuItem.category.toUpperCase()}
          </MenuNav>
        ))}
      </MenuNavContainer>
      {MenuConfig.map((menuItem, index) => (
        <MenuItem menuItem={menuItem} key={index}  />
      ))}

<IoIosArrowDropupCircle size={60} color="#FF8C00" onClick={scrollToTop}/>
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
  "@media (min-width: 1025px) and (max-width: 1920px)": {
    
  },
};



const MenuNav = styled.a({
  display: "flex",
  flexDirection: "column",
  alignItems: 'center',
  justifyContent: 'center',
  padding: 15,
  margin: '0 10px',
  borderRadius: 10,
  cursor: 'pointer',
  background: 'linear-gradient(135deg, #FFC400 60%, #FF8C00 90%)',
  color: '#0a0a0a',

});


const MenuNavContainer = styled.div({
  display: "flex",
  flexDirection: "row",
  justifyContent: 'space-between',
  width: '100%', // Allow it to take full width
  fontWeight: 'bold',
  margin: '20px 0',

  // Fix the width of each MenuNav item
  '& > *': {
    flex: '0 0 100px',
  },

  // For mobile devices
  "@media (max-width: 600px)": {
    overflowX: 'auto',
    whiteSpace: 'nowrap',
    scrollbarWidth: 'none', // For Firefox
    msOverflowStyle: 'none', // For Internet Explorer/Edge
    '&::-webkit-scrollbar': {
      display: 'none', // For Chrome, Safari, and Opera
    },
  },
  "@media (min-width: 1025px) and (max-width: 1920px)": {
    width: '42.5%',
    padding: 0,
    justifyContent: 'center',
    // '& > *': {
    //   flex: '0 0 70px',
    // },
  },
});



const Image = styled.img({
  width: 150,
  height: 150,
});

const CategoryImage = styled.img({
  width: '100%', // Set to 100% to fill the container
  height: '100%', // Set to 100% to fill the container
  objectFit: 'contain', // Scale the image while maintaining aspect ratio
  objectPosition: 'center', // Center the image within the container,
  
});

export default Menu;
