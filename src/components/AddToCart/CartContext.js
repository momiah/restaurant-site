import React, { createContext, useContext, useState } from 'react';

const CartContext = createContext();

export const useCart = () => {
    return useContext(CartContext);
};

export const CartProvider = ({ children }) => {
    const [cartItems, setCartItems] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);

    const addToCart = (item) => {
        const existingItemIndex = cartItems.findIndex(cartItem => 
            cartItem.name === item.name && 
            JSON.stringify(cartItem.extras) === JSON.stringify(item.extras)
        );
    
        if (existingItemIndex !== -1) {
            const updatedItems = [...cartItems];
            updatedItems[existingItemIndex].quantity += 1;
            setCartItems(updatedItems);
        } else {
            setCartItems(prevItems => [...prevItems, { ...item, quantity: 1 }]);
        }
    };
    

    const increaseQuantity = (itemName, extras) => {
        setCartItems(prevItems => 
            prevItems.map(item => 
                item.name === itemName && JSON.stringify(item.extras) === JSON.stringify(extras)
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            )
        );
    };

    const decreaseQuantity = (itemName, extras) => {
        setCartItems(prevItems => 
            prevItems.map(item => 
                item.name === itemName && item.quantity > 1 && JSON.stringify(item.extras) === JSON.stringify(extras)
                    ? { ...item, quantity: item.quantity - 1 }
                    : item
            )
        );
    };
    

    const toggleCart = () => {
        setIsCartOpen(!isCartOpen);
    };

    return (
        <CartContext.Provider value={{ cartItems, setCartItems, isCartOpen, toggleCart, addToCart, increaseQuantity, decreaseQuantity }}>
            {children}
        </CartContext.Provider>
    );
};
