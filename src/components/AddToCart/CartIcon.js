import React from 'react';
import { useCart } from './CartContext';
import { FaShoppingCart } from 'react-icons/fa';
import styled from 'styled-components';

const CartIcon = ({ size, isNavBar }) => {
    const { cartItems, toggleCart } = useCart();

    return (
        <IconContainer onClick={toggleCart}>
            <FaShoppingCart size={size} />
            {cartItems.length > 0 && isNavBar && <ItemCount>{cartItems.length}</ItemCount>}
        </IconContainer>
    );
};

const IconContainer = styled.div({  
    position: 'relative',
    cursor: 'pointer',
    color: 'white',
    fontSize: '24px',
    display: 'inline-block'
})


const ItemCount = styled.span({
    position: 'absolute',
    top: '-5px',
    right: '-10px',
    backgroundColor: 'red',
    color: 'white',
    borderRadius: '50%',
    padding: '2px 8px',
    fontSize: '12px',
    fontWeight: 'bold',
});

export default CartIcon;
