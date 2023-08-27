import React, { useState } from 'react';
import styled from 'styled-components';
import MenuItemExpanded from './MenuItemExpanded';

const MenuItem = ({ menuItem }) => {
  const [ItemExpanded, setItemExpanded] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);


  const handleItemClick = (item) => {
    console.log('Item clicked:', item.name);
    setItemExpanded(true);
    setSelectedItem(item);
  };

  const handleClose = () => {
    setItemExpanded(false);
  };

  return (
    <MenuItemWrapper>
      <h1>{menuItem.category}</h1>
      {menuItem.items.map((items, index) => {
        return (
          <Item onClick={() => handleItemClick(items)} key={index}>
            <h3>{items.name}</h3>
            <ItemInfoContainer>
              <Description>
                <p>{items.description}</p>
              </Description>
              <ItemImage />
            </ItemInfoContainer>
          </Item>
        );
      })}
     {ItemExpanded && selectedItem && (
    <ExpandedWrapper onClick={handleClose}>
        <MenuItemExpanded item={selectedItem} onClose={handleClose} />
    </ExpandedWrapper>
)}

    </MenuItemWrapper>
  );
};



const MenuItemWrapper = styled.div({
  width: '50%',
  margin: '20px',
  border: '1px solid #DDDDDD',
  fontSize: '1.2rem',
  textAlign: 'left',
  padding: '20px',
  borderRadius: '20px',
  backgroundColor: '#F5F5F5',
  '@media (max-width: 767px)': {
    width: '60%',
    fontSize: '1rem',
    paddingLeft: '15px',
  },
  '@media (min-width: 768px)': {
    width: '40%',
    fontSize: '1.5rem',
  }
});

const Item = styled.div({
  border: '1px solid #DDDDDD',
  marginBottom: '20px',
  borderRadius: '20px',
  padding: '0 20px 0 20px',
  cursor: 'pointer',
  transition: 'background-color 0.3s ease, transform 0.3s ease',
  '&:hover': {
    backgroundColor: '#E5E5E5',
    transform: 'scale(1.01)',
  },
  '&:active': {
    backgroundColor: '#D5D5D5',
  },
});

const ItemImage = styled.div({
  border: '1px solid #DDDDDD',
  height: '150px',
  width: '150px',
  marginBottom: '25px',
  borderRadius: '25px',
});

const Description = styled.div({
  border: '1px solid #DDDDDD',
  width: '500px',
  height: '150px',
  marginBottom: '25px',
  borderRadius: '25px',
  paddingLeft: '10px',
  fontSize: '20px',
});

const ItemInfoContainer = styled.div({
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'flex-start',
  gap: '50px',
});

const ExpandedWrapper = styled.div({
  position: 'fixed',
  top: '0',
  left: '0',
  zIndex: 1000,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  width: '100vw',
  height: '100vh',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
});



export default MenuItem;
