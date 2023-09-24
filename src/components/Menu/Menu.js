import React from 'react';
import { MenuConfig } from './Menu.config';
import MenuItem from './MenuItem/MenuItem';
import styled from 'styled-components';

const Menu = () => {

  
  return (
    <div style={container}>
      <h1>Menu Page</h1>
      {MenuConfig.map((menuItem, index) => (
        <MenuItem menuItem={menuItem} key={index}/>
      ))}
    </div>
  );
};

const container = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '20px',
  
  // Media queries
  '@media (max-width: 600px)': { // For mobile devices
    padding: '10px',
  },
  '@media (min-width: 601px) and (max-width: 1024px)': { // For tablets
    padding: '15px',
  },
  '@media (min-width: 1025px)': { // For desktops and larger screens
    padding: '20px',
  },
  '@media (min-width: 1025px) and (max-width: 1920px)': {

},
}





export default Menu;
