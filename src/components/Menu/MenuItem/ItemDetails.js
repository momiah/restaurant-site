import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const ItemDetails = ({ name, description, price, extras }) => {
    const [selectedExtras, setSelectedExtras] = useState([]);
    const [totalPrice, setTotalPrice] = useState(price);

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
            <AddToCart>Add To Cart</AddToCart>
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
height: 40,
color: 'white',
fontWeight: 'bold'
})

export default ItemDetails;
