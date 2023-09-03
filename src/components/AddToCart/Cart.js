import React from 'react';
import styled from 'styled-components';
import { useCart } from './CartContext';

const Cart = () => {
    const { cartItems, isCartOpen, toggleCart } = useCart();

    const handleClose = (e) => {
        toggleCart(false);
        e.stopPropagation();
    };

    const total = cartItems.reduce((acc, item) => acc + item.price, 0);

    if (!isCartOpen) return null;

    return (
        <OuterWrapper onClick={handleClose}>
            <CartContainer onClick={e => e.stopPropagation()}>
                <CloseButton onClick={handleClose}>X</CloseButton>
                <h2 style={{textAlign: 'left'}}>Your Order</h2>
                <InnerContainer>
                    <CartDetails>
                        {cartItems.map((item, index) => (
                            <CartItem key={index}>
                                <h3>{item.name}</h3>
                                {item.extras && item.extras.map((extra, idx) => (
                                    <div style={{ flexDirection: 'row', display: 'flex', justifyContent: 'space-between', marginTop: '-20px' }}>
                                        <p key={idx}>{extra.type} </p>
                                        <p> £{extra.price.toFixed(2)}</p>
                                    </div>

                                ))}
                                <p style={{ textAlign: "right", fontWeight: 'bold' }}>£{item.price.toFixed(2)}</p>
                            </CartItem>
                        ))}
                    </CartDetails>
                    <CheckoutInfo>
                        <h3 >Total: £{total.toFixed(2)}</h3>
                        <CheckoutButton>Go To Checkout</CheckoutButton>
                    </CheckoutInfo>
                </InnerContainer>
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
    padding: '20px 20px 20px 20px',
    borderRadius: '10px',
    boxShadow: '0px 0px 15px rgba(0, 0, 0, 0.2)',
    position: 'fixed', // Changed from 'relative' to 'fixed'
    top: '50%', // Center vertically
    left: '50%', // Center horizontally
    transform: 'translate(-50%, -50%)', // Adjust for exact centering
    width: '40%',
    height: '540px',
    maxHeight: '80vh',
    overflowY: 'visible',
    zIndex: 1000, // Ensure it's on top of everything else
});


const CartItem = styled.div({
    borderBottom: '1px solid #DDDDDD',
    marginBottom: '10px',
    paddingBottom: '10px',
    textAlign: 'left'
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

const InnerContainer = styled.div({
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
    gap: '20px', // Add some spacing between CartDetails and CheckoutInfo
    height: '470px'  // Adjust this value based on your design preference
});

const CartDetails = styled.div({
    flex: 1, // Take up half the space of InnerContainer
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',  // Make this section scrollable

});

const CheckoutInfo = styled.div({
    flex: 1, // Take up half the space of InnerContainer
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'right',
    justifyContent: 'flex-end',
});

const CheckoutButton = styled.button({
    backgroundColor: '#171717',
    borderRadius: 7,
    marginTop: 20,
    height: 40,
    color: 'white',
    fontWeight: 'bold'
});




export default Cart;
