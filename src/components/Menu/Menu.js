import React from 'react';
import { MenuConfig } from './Menu.config';
import MenuItem from './MenuItem/MenuItem';

const Menu = () => {

  
  return (
    <div style={container}>
      <h1>Menu Page</h1>
      {MenuConfig.map((menuItem, index) => (
        <MenuItem  menuItem={menuItem} key={index}/>
      ))}
    </div>
  );
};

const container = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
alignItems: 'center'
}




export default Menu;
