import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Navbar from "./components/NavBar";
import Home from "./pages/Home";
import Menu from "./components/Menu/Menu";
import About from "./pages/AboutUs";
import Cart from "./components/AddToCart/Cart";
import { CartProvider, useCart } from "./components/AddToCart/CartContext";

import "./App.css";
import OrderSuccess from "./pages/OrderSuccess";
import OrderCancel from "./pages/OrderCancel";

function App() {
  const { isCartOpen, setIsCartOpen } = useCart();

  return (
    <Router>
      <div className="App">
        <Navbar />
        {isCartOpen && <Cart onClose={() => setIsCartOpen(false)} />}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/menu" element={<Menu />} />{" "}
          {/* Pass down the props here */}
          <Route path="/about" element={<About />} />
          <Route path="/order-success" element={<OrderSuccess />} />
          <Route path="/order-cancel" element={<OrderCancel />} />
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
