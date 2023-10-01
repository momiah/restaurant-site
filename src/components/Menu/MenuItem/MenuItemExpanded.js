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
        <ItemImage src={item.imageUrl}/>
        <ItemDetails 
            name={item.name} 
            description={item.description} 
            price={item.price}
            extras={item.extras}
            image={item.imageUrl}
        />
        </ItemContainer>
      </ContentContainer>
    );
};



const ItemContainer = styled.div({
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: '80%', // Changed to percentage-based value
    '@media (max-width: 767px)': {
        flexDirection: 'column',
        height: 'auto', // Adjust height for mobile view
    
    },
    '@media (min-width: 768px) and (max-width: 1024px)': {
        flexDirection: 'column',
        height: 'auto', // Adjust height for tablet view
    },
    '@media (min-width: 1025px) and (max-width: 1920px)': {
        flexDirection: 'row', // Ensure layout remains horizontal
        justifyContent: 'space-between', // Space out the content
    },
});

const ContentContainer = styled.div({
    backgroundColor: 'white',
    padding: '20px 0px',
    display: 'flex',
    flexDirection: 'column', // Changed to column for consistent layout
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: '10px',
    position: 'relative',
    width: '40%',
    margin: '5% auto',
    maxHeight: '80vh',
    overflowY: 'auto',
    '@media (max-width: 767px)': {
        width: '90%',
        padding: '20px 10px',
    },
    '@media (min-width: 768px) and (max-width: 1024px)': {
        width: '75%',
        padding: '20px 10px',
    },
    '@media (min-width: 1025px) and (max-width: 1920px)': {
        width: '60%', // Adjust width to give more space
        padding: '20px 20px',
    },
});

const ItemImage = styled.img({
    marginRight: 10,
    height: 'auto', // Adjust height to maintain aspect ratio
    width: '100%', // Set width to 100% to fit container
    maxWidth: '300px', // Limit maximum width
    objectFit: 'contain', // Ensure image doesn't get cropped
    '@media (max-width: 767px)': {
        margin: '10px 0', // Add margin for mobile view
    },
    '@media (min-width: 768px) and (max-width: 1024px)': {
        margin: '10px 0', // Add margin for tablet view
    },
    '@media (min-width: 1025px) and (max-width: 1920px)': {
        width: '45%', // Adjust width to give more space to text content
        maxWidth: '400px', // Increase maximum width
        marginRight: '5%', // Add some margin for spacing
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
});
  
export default MenuItemExpanded;
