import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import CartIcon from './AddToCart/CartIcon';
import { useRestaurant } from '../restaurant/RestaurantContext';

const Navbar = () => {
    const { restaurant } = useRestaurant();
    const logoUrl = restaurant?.theme?.logoUrl;

    return (
        <Nav>
            <Brand to="/">
                {logoUrl ? (
                    <LogoImg src={logoUrl} alt={restaurant?.name || 'Home'} />
                ) : (
                    restaurant?.name || 'Menu'
                )}
            </Brand>
            <CartIcon size={30} isNavBar/>
        </Nav>
    );
};

// Colours come from the restaurant's theme via styled-components' ThemeProvider.
const Nav = styled.nav(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: theme.colors.navBar,
    padding: '1rem',
}));

const Brand = styled(Link)(({ theme }) => ({
    color: theme.colors.navBarText,
    textDecoration: 'none',
    fontSize: '1.2rem',
    fontFamily: theme.fonts.heading,
    display: 'flex',
    alignItems: 'center',
}));

const LogoImg = styled.img({
    height: 40,
    width: 'auto',
});

export default Navbar;
