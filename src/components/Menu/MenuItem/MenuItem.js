import React, { useState } from 'react';
import styled from 'styled-components';
import MenuItemExpanded from './MenuItemExpanded';
import {NoImageAvailable} from '../Menu.config'

const MenuItem = ({ menuItem }) => {
  const [ItemExpanded, setItemExpanded] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);


  const handleItemClick = (item) => {

    setItemExpanded(true);
    setSelectedItem(item);
  };



  const handleClose = () => {
    setItemExpanded(false);
  };

  console.log('menu item =>', menuItem)
  return (
    <MenuItemWrapper  >
      <h2 id={menuItem.category} style={{ scrollMarginTop: "75px" }} >{menuItem.category.toUpperCase()}</h2>
      {menuItem.items.map((items, index) => {

        const imagePath = items.imageUrl ? items.imageUrl : NoImageAvailable
        return (
          <Item onClick={() => handleItemClick(items)} key={index}>
           
            <ItemInfoContainer>
            
              <Description>
              <h2>{items.name}</h2>
                <p>{items.description}</p>
                <h4>£{items.price.toFixed(2)}</h4>
              </Description>
              <ItemImage src={imagePath} />
             
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

  width: '40%',
  margin: '20px',
  border: '1px solid #DDDDDD',
  fontSize: '1.2rem',
  textAlign: 'left',
  padding: '20px',
  borderRadius: '20px',
  backgroundColor: '#FAFAFA',
  '@media (max-width: 767px)': {
    width: '90%',
    fontSize: '1rem',
    paddingLeft: '15px',
  },
  '@media (min-width: 768px) and (max-width: 1024px)': {
    width: '60%',
    fontSize: '1.2rem',
  },
  '@media (min-width: 1025px) (max-width: 1920px)': {
    width: '78%',
    fontSize: '1.5rem',
  }
});

const Item = styled.div({
  border: '1px solid #DDDDDD',
  
  marginBottom: '20px',
  borderRadius: '20px',
  backgroundColor: 'white',
  padding: '0 0 0 20px',
  cursor: 'pointer',
  transition: 'background-color 0.3s ease, transform 0.3s ease',
  '&:hover': {
    backgroundColor: '#F5F5F5',
    transform: 'scale(1.01)',
  },
  '&:active': {
    backgroundColor: '#D5D5D5',
  },
});

const ItemImage = styled.img({
  height: '220px',
  width: '265px',
  margin: '25px',
  borderRadius: '25px',
  '@media (max-width: 767px)': {
    height: '25%',
    width: '25%',
    margin: '15px',
  },
  '@media (min-width: 768px) and (max-width: 1024px)': {
    height: '200px',
    width: '215px',
    margin: '20px',
  }
});

const Description = styled.div({
  width: '500px',
  padding: '20px 0',
  fontSize: '20px',
  h4: {
    marginTop: '125px', // Default marginTop for larger screens
  },
  '@media (max-width: 767px)': {
    width: '70%',
    fontSize: '10px',
    padding: '10px 0',
    h4: {
      marginTop: '20px', // Adjusted marginTop for mobile screens
    },
  },
  '@media (min-width: 768px) and (max-width: 1024px)': {
    width: '80%',
    fontSize: '18px',
    h4: {
      marginTop: '80px', // Adjusted marginTop for tablet screens
    },
  }
});


const ItemInfoContainer = styled.div({
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'space-between',
  gap: '50px',
  '@media (max-width: 767px)': {

    alignItems: 'left',
    gap: '10px',
  },
  '@media (min-width: 768px) and (max-width: 1024px)': {
    gap: '30px',
  }
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
