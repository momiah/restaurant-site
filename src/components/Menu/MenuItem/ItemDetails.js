import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useCart } from '../../AddToCart/CartContext';
import CartIcon from '../../AddToCart/CartIcon';

const ItemDetails = ({ name, description, price, extras,  }) => {
    const [selectedExtras, setSelectedExtras] = useState([]);
    const [totalPrice, setTotalPrice] = useState(price);
    const [quantity, setQuantity] = useState(0);
    const { addToCart, toggleCart, cartItems, updateQuantity, setCartItems } = useCart();

    useEffect(() => {
        let extrasPrice = 0;
        selectedExtras.forEach(extraType => {
            const extra = extras.find(e => e.type === extraType);
            if (extra) {
                extrasPrice += extra.price;
            }
        });
        setTotalPrice(price + extrasPrice);
    }, [selectedExtras, price, extras]);

    const handleExtraChange = (extraType) => {
        if (selectedExtras.includes(extraType)) {
            setSelectedExtras(prevExtras => prevExtras.filter(e => e !== extraType));
        } else {
            setSelectedExtras(prevExtras => [...prevExtras, extraType]);
        }
    };

    const handleAddToCart = () => {
        const selectedExtrasWithPrice = selectedExtras.map(extraType => {
            const extra = extras.find(e => e.type === extraType);
            return extra;
        });
    
        const existingItemIndex = cartItems.findIndex(item => 
            item.name === name && 
            JSON.stringify(item.extras) === JSON.stringify(selectedExtrasWithPrice)
        );
    
        if (existingItemIndex !== -1) {
            // If the item with the same extras already exists in the cart, update its quantity
            const updatedItems = [...cartItems];
            updatedItems[existingItemIndex].quantity += 1;
            setCartItems(updatedItems);
        } else {
            // If not, add it as a new item
            addToCart({
                name,
                description,
                price: totalPrice,
                extras: selectedExtrasWithPrice,
                quantity: 1  // Set initial quantity to 1
            });
        }
    
        setQuantity(prevQuantity => prevQuantity + 1);  // Update the quantity state
    };
    
    

    const handleCartIconClick = () => {
        toggleCart(true) // Open the cart when the cart icon is clicked
    };

    return (
        <DetailsContainer>
            <h2>{name}</h2>
            <p>{description}</p>
        
            {extras && extras.length > 0 && ( // Check if extras exist and has data
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
        )}
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

    width: '60%',
    height: '100%',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    boxSizing: 'border-box',
    '@media (max-width: 767px)': {
        width: '100%',
        flexDirection: 'column',
        padding: '0 20px 20px 20px'
    },
    '@media (min-width: 768px) and (max-width: 1024px)': {
        width: '75%',
        flexDirection: 'column',
    },
    '@media (min-width: 1025px) and (max-width: 1920px)': {
        fontSize: '0.9rem', // Reduce font size slightly
        width: '50%', // Adjust width to give more space
    },
});

const ExtrasContainer = styled.div({
    display: 'flex',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: '10px',
    borderTop: '1px solid #E2E2E2',
    borderBottom: '1px solid #E2E2E2',
    padding: '20px 0',
    
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
    fontWeight: 'bold',
    '@media (max-width: 767px)': {
        width: '77%'
    },
    '@media (min-width: 768px) and (max-width: 1024px)': {
        width: '73%'
    },
    '@media (min-width: 1025px) and (max-width: 1920px)': {
        width: '75%'
    },
})

const ButtonContainer = styled.div({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  
})
  


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
