// CartContext.js
import React, { createContext, useContext, useState } from 'react';

const CartContext = createContext();

export const useCart = () => {
    return useContext(CartContext);
};

export const CartProvider = ({ children }) => {
    const [cartItems, setCartItems] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);

    const addToCart = (item) => {
        setCartItems(prevItems => [...prevItems, item]);
    };

    const toggleCart = () => {
        setIsCartOpen(!isCartOpen);
        console.log('toggleCart clicked', isCartOpen)
    };

    return (
        <CartContext.Provider value={{ cartItems, setCartItems, isCartOpen, toggleCart, addToCart }}>
            {children}
        </CartContext.Provider>
    );
};
