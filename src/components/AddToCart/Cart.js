import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useCart } from './CartContext';
import CustomerForm from './CustomerForm';

const Cart = () => {
    const { cartItems, isCartOpen, toggleCart } = useCart();
    const [isCartExpanded, setIsCartExpanded] = useState(false);
    const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 767);
    const total = cartItems.reduce((acc, item) => acc + item.price, 0);
    const [formData, setFormData] = useState({
        name: '',
        contactNumber: '',
        address: '',
        notes: '',
        total: total
    });

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 767);
        };
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    const handleClose = (e) => {
        toggleCart(false);
        e.stopPropagation();
    };

    const toggleCartItems = () => {
        setIsCartExpanded(!isCartExpanded);
    };

    if (!isCartOpen) return null;

    return (
        <OuterWrapper onClick={handleClose}>
            <CartContainer onClick={e => e.stopPropagation()}>
                <CloseButton onClick={handleClose}>X</CloseButton>
                <OrderExpand>
                    <h2 style={{ textAlign: 'left', fontSize: '1.5rem'  }}>Your Order</h2>
                    <h5 style={{ position: 'initial' }}>{cartItems.length} Items</h5>
                    {isMobile && ( // Display toggle button only on mobile
                        <button onClick={toggleCartItems} style={{ fontSize: '1.5rem', width: 30  }}>{isCartExpanded ? '-' : '+'}</button>
                    )}
                </OrderExpand>
                <InnerContainer>
                    {(isMobile ? isCartExpanded : true) && (
                        <CartDetails>
                            {cartItems.length > 0 ? (
                                cartItems.map((item, index) => (
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
                                ))
                            ) : (
                                <div style={{ textAlign: 'center', marginTop: '20px' }}>No items in your cart</div>
                            )}
                        </CartDetails>
                    )}
                    <CheckoutInfo>
                        <CustomerDetailsContainer>
                            <h2 style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginLeft: 10, fontSize: '1.5rem'  }}>
                                Your Details
                                {isMobile && (
                                    <button onClick={() => setIsDetailsExpanded(!isDetailsExpanded)} style={{ fontSize: '1.5rem', width: 30 }}>
                                        {isDetailsExpanded ? '-' : '+'}
                                    </button>
                                )}
                            </h2>
                            {(isMobile ? isDetailsExpanded : true) && <CustomerForm formData={formData} setFormData={setFormData} />}
                        </CustomerDetailsContainer>
                        <Total>Total: £{total.toFixed(2)}</Total>
                        <CheckoutButton type="submit" >Go To Checkout</CheckoutButton>
                    </CheckoutInfo>
                </InnerContainer>
            </CartContainer>
        </OuterWrapper>
    );
};

const Total = styled.h3({
    '@media (max-width: 767px)': {
        margin: '40px 10px',
        fontSize: '20px'
    }
})

const OuterWrapper = styled.div({
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    overflowY: 'scroll',
 
});

const OrderExpand = styled.div({
    display: 'flex',
    width: '46.5%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',

    '@media (max-width: 767px)': {
        margin: '50px 10px 20px 0',
        border: '1px solid #ccc',
        padding: '0 10px',
        borderRadius: 10,
        width: '93.5%',
    },
    '@media (min-width: 768px) and (max-width: 1024px)': {
        margin: '50px 10px 20px',
        border: '1px solid #ccc',
        padding: '0 10px',
        width: '90%',
        borderRadius: 10,
    },
    '@media (min-width: 1025px) and (max-width: 1920px)': {
        margin: '50px 10px 20px',
        border: '1px solid #ccc',
        padding: '0 10px',
        borderRadius: 10,
        width: '90%'
    },

}
)

const CartContainer = styled.div({
    backgroundColor: 'white',
    padding: '60px 20px 20px 20px',
    borderRadius: '10px',
    boxShadow: '0px 0px 15px rgba(0, 0, 0, 0.2)',
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '50%',
    height: '750px',
    maxHeight: '80vh',
    overflowY: 'visible',
    zIndex: 1000,
    '@media (max-width: 767px)': {
        width: '90%',
        padding: '10px',
        height: 'auto',
        maxHeight: '90vh',
        overflowY: 'scroll',
        overflowX: 'hidden',
    },
    '@media (min-width: 768px) and (max-width: 1024px)': {
        width: '75%',
        padding: '15px',
        height: 'auto',
        maxHeight: '85vh',
        overflowY: 'scroll',

    },
    '@media (min-width: 1025px) and (max-width: 1920px)': {
        width: '50%',
        padding: '20px',
        height: 'auto',
        maxHeight: '80vh',
        overflowY: 'scroll',
    },
});


const CartItem = styled.div({
    borderBottom: '1px solid #DDDDDD',
    marginBottom: '10px',
    paddingBottom: '10px',
    width: '93%',
    textAlign: 'left',
    '@media (max-width: 767px)': {
        fontSize: '0.8rem',
        margin: '0 10px',
    },
    '@media (min-width: 768px) and (max-width: 1024px)': {
        fontSize: '0.9rem',
        width: '90%'
    },
    '@media (min-width: 1025px) and (max-width: 1920px)': {
        fontSize: '0.7rem',
        width: '90%',
        marginLeft: 20
    },
});

const CloseButton = styled.button({
    position: 'absolute',
    top: '10px',
    right: '10px',
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    '@media (max-width: 767px)': {
        fontSize: '1.2rem',
    },
});

const InnerContainer = styled.div({
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
    gap: '20px',
    height: '650px',
    '@media (max-width: 767px)': {
        flexDirection: 'column',
        height: 'auto',

    },
    '@media (min-width: 768px) and (max-width: 1024px)': {
        flexDirection: 'column',
        height: 'auto',

    },
    '@media (min-width: 1025px) and (max-width: 1920px)': {
        flexDirection: 'column',
        height: 'auto',
    },
});

const CartDetails = styled.div({
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  
    overflowY: 'auto',
    '@media (max-width: 767px)': {
        marginBottom: '10px',
        
    },
    '@media (min-width: 768px) and (max-width: 1024px)': {
        alignItems: 'center'
    }, '@media (min-width: 1025px) and (max-width: 1920px)': {
        flexDirection: 'column',
        height: 'auto',
    },
});

const CheckoutInfo = styled.div({
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'right',
    marginBottom: 30,
    justifyContent: 'flex-start', // Align content to the top
    overflow: 'none', 
    '@media (max-width: 767px)': {
        fontSize: '0.8rem',
    },
    '@media (min-width: 768px) and (max-width: 1024px)': {
        fontSize: '0.9rem',
    },
});



const CustomerDetailsContainer = styled.div({
    flex: 1,
    padding: '0 10px 0 0',
    marginTop: '-70px', // Adjust the top margin
    
    borderRadius: 10,
    border: '1px solid #ccc',
    '@media (max-width: 767px)': {
        borderRadius: 10,
        border: '1px solid #ccc',
        marginTop: '10px', // Adjust the top margin
    },
    '@media (min-width: 768px) and (max-width: 1024px)': {
        margin: '20px 10px 20px', // Adjusted margin
        padding: '0 10px',
        width: '90%',
        borderRadius: 10,
        border: '1px solid #ccc',
    },
    '@media (min-width: 1025px) and (max-width: 1920px)': {
        paddingRight: 80,
        margin: '30px 10px 20px', // Adjusted margin
        padding: '0 10px',
        width: '90%'
    },
});




const CheckoutButton = styled.button({
    backgroundColor: '#171717',
    borderRadius: 7,
   
    color: 'white',
    fontWeight: 'bold',
    '@media (max-width: 767px)': {
        height: '50px',
        fontSize: '0.8rem',
    },
    '@media (min-width: 768px) and (max-width: 1024px)': {
        height: '55px',
        fontSize: '0.9rem',
    },
    '@media (min-width: 1025px)': {
        height: '60px', // Explicitly setting the height for screens larger than 1025px
    }
});







export default Cart;
