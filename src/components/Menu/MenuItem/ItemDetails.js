import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useCart } from '../../AddToCart/CartContext';
import CartIcon from '../../AddToCart/CartIcon';

const ItemDetails = ({ name, description, price, extras, setIsCartOpen }) => {
    const [selectedExtras, setSelectedExtras] = useState([]);
    const [totalPrice, setTotalPrice] = useState(price);
    const [cartEntry, setCartEntry] = useState(false)
    const [quantity, setQuantity] = useState(0);
    const { addToCart, toggleCart } = useCart();

    useEffect(() => {
        let extrasPrice = selectedExtras.length * 0.5; // Assuming each extra costs 0.5
        setTotalPrice(price + extrasPrice);
    }, [selectedExtras, price]);

    const handleExtraChange = (extra) => {
        if (selectedExtras.includes(extra)) {
            setSelectedExtras(prevExtras => prevExtras.filter(e => e !== extra));
        } else {
            setSelectedExtras(prevExtras => [...prevExtras, extra]);
        }
    };



    const handleAddToCart = () => {
        addToCart({ name, description, price: totalPrice, extras: selectedExtras });
        setQuantity(prevQuantity => prevQuantity + 1); // Increment the quantity
    };

    const handleCartIconClick = () => {
        toggleCart(true) // Open the cart when the cart icon is clicked
    };

    return (
        <DetailsContainer>
            <h2>{name}</h2>
            <p>{description}</p>

            <ExtrasContainer>
                {extras.map(extra => (
                    <Extra key={extra.type}>
                        <span>{extra.type}</span>
                        <Checkbox
                            type="checkbox"
                            value={extra.type}
                            checked={selectedExtras.includes(extra.type)}
                            onChange={() => handleExtraChange(extra.type)}
                        />
                    </Extra>
                ))}
            </ExtrasContainer>
            <h3>£{totalPrice.toFixed(2)}</h3>

            <ButtonContainer>
                <AddToCart onClick={handleAddToCart}>Add To Cart</AddToCart>
                <CartButtonContainer onClick={handleCartIconClick}> {/* Add onClick handler here */}
                    <CartIcon />
                    <QuantityDisplay>{quantity}</QuantityDisplay>
                </CartButtonContainer>
            </ButtonContainer>
 
         
        </DetailsContainer>
    );
};

const DetailsContainer = styled.div({
    border: '1px solid #DDDDDD',
    width: '60%',
    height: '100%',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    boxSizing: 'border-box',
});

const ExtrasContainer = styled.div({
    display: 'flex',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: '10px',
});

const Extra = styled.div({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
});

const Checkbox = styled.input({
    width: '20px',
    height: '20px',
    cursor: 'pointer',
});

const AddToCart = styled.button({
    backgroundColor: '#171717',
    borderRadius: 7,
    width: '80%',
    height: 40,
    color: 'white',
    fontWeight: 'bold'
})

const ButtonContainer = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

const CartButtonContainer = styled.button`
    display: flex;
    align-items: center;
    background-color: #171717;
    border-radius: 7px;
    height: 40px;
    color: white;
    font-weight: bold;
    padding: 0 10px;
    cursor: pointer;
`;

const QuantityDisplay = styled.span`
    margin-left: 10px;
    font-size: 1rem;
`;

export default ItemDetails;
