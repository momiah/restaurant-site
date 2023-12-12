import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Navbar from './components/NavBar';
import Home from './pages/Home';
import Menu from './components/Menu/Menu';
import About from './pages/AboutUs';
import Cart from './components/AddToCart/Cart';
import { CartProvider, useCart } from './components/AddToCart/CartContext';

import './App.css';
import { Toaster } from 'react-hot-toast';

const toasterProps = {
  position: "top-right",
  reverseOrder: false,
  gutter: 8,
  containerClassName: "",
  containerStyle: {},
  toastOptions: {
    // Define default options
    className: '',
    duration: 5000,
    style: {
      background: '#363636',
      color: '#fff',
    },

    // Default options for specific types
    success: {
      duration: 3000,
      theme: {
        primary: 'green',
        secondary: 'black',
      },
    },
  },
}

function App() {
  const { isCartOpen, setIsCartOpen } = useCart();

  return (
    <Router>
        <div className="App">
          <Toaster {...toasterProps} />
          <Navbar/>
          {isCartOpen && <Cart onClose={() => setIsCartOpen(false)} />}
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/menu" element={<Menu/>} /> {/* Pass down the props here */}
            <Route path="/about" element={<About />} />
          </Routes>
        </div>
      </Router>
  );
}

function AppWrapper() {
  return (
    <CartProvider>
      <App />
    </CartProvider>
  );
}

export default AppWrapper;





