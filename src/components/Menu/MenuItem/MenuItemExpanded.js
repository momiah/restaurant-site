import React from 'react';
import styled from 'styled-components';
import ItemDetails from './ItemDetails';

const MenuItemExpanded = ({ item, onClose }) => {
    const handleContentClick = (e) => {
      e.stopPropagation();
    };
  

    return (
      <ContentContainer onClick={handleContentClick}>
        <CloseButton onClick={onClose}>X</CloseButton>
        <ItemContainer>
            <ItemImage/>
            <ItemDetails 
                name={item.name} 
                description={item.description} 
                price={item.price}
                extras={item.extras}

                />
             </ItemContainer>
      </ContentContainer>
    );
};


const ContentContainer = styled.div({
    backgroundColor: 'white',

    padding: '60px 20px 20px 20px',
    borderRadius: '10px',
    boxShadow: '0px 0px 15px rgba(0, 0, 0, 0.2)',
    position: 'relative',
    width: '40%',
    height: '500px',
    maxHeight: '80vh',
    overflowY: 'auto',
});

const ItemContainer = styled.div({
   
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    border: '1px solid #DDDDDD',
    height: 450,    
})

const ItemImage = styled.img({
    border: '1px solid #DDDDDD',
    height: '100%',
    width: '40%'
})

const CloseButton = styled.button({
    position: 'absolute',
    top: '10px',
    right: '10px',
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
});
  
export default MenuItemExpanded;
