import React from 'react';
import styled from 'styled-components';
import { useCart } from './CartContext';

const Cart = () => {
    const { cartItems, isCartOpen, toggleCart } = useCart();

    const handleClose = (e) => {
        toggleCart(false)
        e.stopPropagation();
    };

    if (!isCartOpen) return null;

    return (
        <OuterWrapper onClick={handleClose}>
            <CartContainer onClick={e => e.stopPropagation()}>
                <CloseButton onClick={handleClose}>X</CloseButton>
                <h2>Your Cart</h2>
                {cartItems.map((item, index) => (
                    <CartItem key={index}>
                        <h3>{item.name}</h3>
                        <p>{item.description}</p>
                        <p>£{item.price.toFixed(2)}</p>
                    </CartItem>
                ))}
            </CartContainer>
        </OuterWrapper>
    );
};


const OuterWrapper = styled.div({
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // semi-transparent background
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999, // Ensure it's below the CartContainer
});

const CartContainer = styled.div({
    backgroundColor: 'white',
    padding: '60px 20px 20px 20px',
    borderRadius: '10px',
    boxShadow: '0px 0px 15px rgba(0, 0, 0, 0.2)',
    position: 'fixed', // Changed from 'relative' to 'fixed'
    top: '50%', // Center vertically
    left: '50%', // Center horizontally
    transform: 'translate(-50%, -50%)', // Adjust for exact centering
    width: '40%',
    height: '500px',
    maxHeight: '80vh',
    overflowY: 'auto',
    zIndex: 1000, // Ensure it's on top of everything else
});


const CartItem = styled.div({
    borderBottom: '1px solid #DDDDDD',
    marginBottom: '10px',
    paddingBottom: '10px',
});

const CloseButton = styled.button({
    position: 'absolute',
    top: '10px',
    right: '10px',
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
});

export default Cart;
