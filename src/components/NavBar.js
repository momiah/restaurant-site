import React from 'react';
import { Link } from 'react-router-dom';



const Navbar = () => {
    return (
        <nav style={navbarStyle}>
          <Link to="/" style={navbarItemStyle}>Home</Link>
          <Link to="/about" style={navbarItemStyle}>About Us</Link>
        </nav>
      );
    
};

const navbarStyle = {
    display: 'flex',
    justifyContent: 'space-around',
    backgroundColor: '#333',
    padding: '1rem'
  };
  
  const navbarItemStyle = {
    color: 'white',
    textDecoration: 'none',
    fontSize: '1.2rem'
  };
  

export default Navbar;
