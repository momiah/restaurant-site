import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Navbar from './components/NavBar';
import Home from './pages/Home';
import Menu from './components/Menu/Menu';
import About from './pages/AboutUs';
import AddToCart from './components/AddToCart/AddToCart'; // Assuming you've placed it in a components folder
import { CartProvider } from './components/AddToCart/CartContext'; // Assuming you've placed CartContext in the root directory
import './App.css';

function App() {
  return (
    <CartProvider>
      <Router>
        <div className="App">
          <Navbar />
          <AddToCart />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </div>
      </Router>
    </CartProvider>
  );
}

export default App;
