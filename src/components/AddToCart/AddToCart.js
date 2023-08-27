// AddToCart.js
import React from 'react';
import styled from 'styled-components';
import { useCart } from './CartContext';

const AddToCart = () => {
    const { cartItems } = useCart();

    return (
        <CartContainer>
            <h2>Your Cart</h2>
            {cartItems.map((item, index) => (
                <CartItem key={index}>
                    <h3>{item.name}</h3>
                    <p>{item.description}</p>
                    <p>£{item.price.toFixed(2)}</p>
                </CartItem>
            ))}
        </CartContainer>
    );
};

const CartContainer = styled.div({
    padding: '20px',
    border: '1px solid #DDDDDD',
    borderRadius: '10px',
    width: '300px',
    maxHeight: '400px',
    overflowY: 'auto',
});

const CartItem = styled.div({
    borderBottom: '1px solid #DDDDDD',
    marginBottom: '10px',
    paddingBottom: '10px',
});

export default AddToCart;
