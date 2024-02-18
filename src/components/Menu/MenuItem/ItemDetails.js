import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { useCart } from "../../AddToCart/CartContext";
import CartIcon from "../../AddToCart/CartIcon";

const ItemDetails = ({
  name,
  description,
  price,
  extras,
  protein,
  secondProtein,
  thirdProtein,
  image,
}) => {
  const [selectedExtras, setSelectedExtras] = useState([]);
  // const [proteins, setProteins] = useState([])
  // const [secondProteins, setSecondProteins] = useState([])
  const [selectedProtein, setSelectedProtein] = useState(null);
  const [secondSelectedProtein, setSecondSelectedProtein] = useState(null);
  const [thirdSelectedProtein, setThirdSelectedProtein] = useState(null);

  const [totalPrice, setTotalPrice] = useState(price);
  const [quantity, setQuantity] = useState(0);
  const { addToCart, toggleCart, cartItems, setCartItems } = useCart();

  // useEffect(() => {
  //   if(!selectedExtras && !proteins && !secondProteins){
  //     setTotalPrice(price)
  //   }
  // }, [selectedExtras, proteins, secondProteins, price])

  useEffect(() => {
    let extrasPrice = 0;
    selectedExtras.forEach((extraType) => {
      const extra = extras.find((e) => e.type === extraType);
      if (extra) {
        extrasPrice += extra.price;
      }
  
    });
    setTotalPrice(price + extrasPrice);
  }, [selectedExtras, price, extras]);

  //   useEffect(() => {
  //     // Calculate the total price of all selected proteins
  //     const proteinPrices = proteins.map((protein) => protein.price || 0);
  //     // Calculate the total price including extras and protein prices
  //     const newTotalPrice = price + proteinPrices[0];
  //     setTotalPrice(newTotalPrice);
  // }, [price, proteins]);

  //   useEffect(() => {
  //     // Calculate the total price of all selected proteins
  //     const proteinPrices = secondProteins.map((protein) => protein.price || 0);

  //     // Calculate the total price including extras and protein prices
  //     const newTotalPrice = price + proteinPrices[0];
  //     setTotalPrice(newTotalPrice);
  // }, [price, secondProteins]);

  const handleExtraChange = (extraType) => {
    if (selectedExtras.includes(extraType)) {
      setSelectedExtras((prevExtras) =>
        prevExtras.filter((e) => e !== extraType)
      );
    } else {
      setSelectedExtras((prevExtras) => [...prevExtras, extraType]);
    }
  };

  const handleProtein = (selectedProteinType) => {
    setSelectedProtein(selectedProteinType);
    // const proteinType = protein.filter((p) => p.type === selectedProteinType);

    // const proteinPrices = proteinType.map((protein) => protein.price || 0);
    // const newTotalPrice = price + proteinPrices[0];
    // setTotalPrice(newTotalPrice);
  };

  const handleSecondProtein = (secondSelectedProteinType) => {
    setSecondSelectedProtein(secondSelectedProteinType);
    // const proteinType = protein.filter(p => p.type === secondSelectedProteinType)
    // setSecondProteins(proteinType)
  };
  const handlThirdProtein = (thirdSelectedProteinType) => {
    setThirdSelectedProtein(thirdSelectedProteinType);
    // const proteinType = protein.filter(p => p.type === secondSelectedProteinType)
    // setSecondProteins(proteinType)
  };

  //   const handleProteinChange = (selectedProteinType) => {
  //     const selectedProtein = protein.find((p) => p.type === selectedProteinType);
  //     if (selectedProtein) {
  //         const proteinPrice = selectedProtein.price ? selectedProtein.price : 0;
  //         if (selectedProtein.type === 'Beef') {
  //             setTotalPrice(totalPrice + proteinPrice);
  //         } else {
  //             setTotalPrice(price); // Use the initial price state here
  //         }
  //         setSelectedProtein(selectedProteinType);
  //     }
  // };

  // const handleSecondProteinChange = (selectedProteinType) => {
  //   const selectedProtein = protein.find((p) => p.type === selectedProteinType);
  //   if (selectedProtein) {
  //       const proteinPrice = selectedProtein.price ? selectedProtein.price : 0;
  //       if (selectedProtein.type === 'Beef') {
  //           // If beef is selected, add its price to the total
  //           setTotalPrice(totalPrice + proteinPrice);
  //       } else {
  //           // If another protein is selected, subtract the beef price from the total
  //           const beefPrice = protein.find((p) => p.type === 'Beef').price || 0;
  //           setTotalPrice(totalPrice - beefPrice + proteinPrice);
  //       }
  //       setSecondSelectedProtein(selectedProteinType);
  //   }
  // };

  const handleAddToCart = () => {
    const selectedExtrasWithPrice = selectedExtras.map((extraType) => {
      const extra = extras.find((e) => e.type === extraType);
      return extra;
    });

    if (protein && selectedProtein === null) {
      alert("Please select a protein");
      return
    }

    if (secondProtein && secondSelectedProtein === null) {
      alert("Please select a second protein");
      return
    }
    if (thirdProtein && thirdSelectedProtein === null) {
      alert("Please select a third protein");
      return
    }

    const existingItemIndex = cartItems.findIndex(
      (item) =>
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
        protein: selectedProtein,
        secondProtein: secondSelectedProtein,
        thirdProtein: thirdSelectedProtein,
        quantity: 1, // Set initial quantity to 1
        image,
      });
    }

    setQuantity((prevQuantity) => prevQuantity + 1);
  };

  const handleCartIconClick = () => {
    toggleCart(true); // Open the cart when the cart icon is clicked
  };

  return (
    <DetailsContainer>
      <Title>{name}</Title>
      <p>{description}</p>


      <div style={{ overflow: 'auto', height: '40vh'}}>
        {extras &&
          extras.length > 0 && ( // Check if extras exist and has data
            <ExtrasContainer>
              {extras.map((extra) => (
                <Extra key={extra.type}>
                  <div>
                    <p style={{ fontWeight: "bold", marginBottom: 10 }}>
                      {extra.type}
                    </p>
                    <p style={{ fontSize: "10px", margin: 0, color: "green" }}>
                      +£{extra.price.toFixed(2)}
                    </p>
                  </div>

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
        {protein &&
          protein.length > 0 && ( // Check if extras exist and has data
            <ExtrasContainer>
              <h3>
                {secondProtein
                  ? "Choose your first protein"
                  : "Choose your protein"}
              </h3>
              {protein.map((protein) => (
                <Extra key={protein.type}>
                  <div>
                    <p style={{ fontWeight: "bold", marginBottom: 10 }}>
                      {protein.type}
                    </p>
                    <p style={{ fontSize: "10px", margin: 0, color: "green" }}>
                      {protein.price ? `+£${protein.price?.toFixed(2)}` : null}
                    </p>
                  </div>

                  <Checkbox
                    type="radio"
                    value={protein.type}
                    checked={selectedProtein === protein.type}
                    onChange={() => handleProtein(protein.type)}
                  />
                </Extra>
              ))}
            </ExtrasContainer>
          )}
        {secondProtein &&
          secondProtein.length > 0 && ( // Check if extras exist and has data
            <ExtrasContainer>
              {secondProtein && <h3>Choose your second protein</h3>}
              {secondProtein.map((protein) => (
                <Extra key={protein.type}>
                  <div>
                    <p style={{ fontWeight: "bold", marginBottom: 10 }}>
                      {protein.type}
                    </p>
                    <p style={{ fontSize: "10px", margin: 0, color: "green" }}>
                      {protein.price ? `+£${protein.price?.toFixed(2)}` : null}
                    </p>
                  </div>

                  <Checkbox
                    type="radio"
                    value={protein.type}
                    checked={secondSelectedProtein === protein.type}
                    onChange={() => handleSecondProtein(protein.type)}
                  />
                </Extra>
              ))}
            </ExtrasContainer>
          )}
        {thirdProtein &&
          thirdProtein.length > 0 && ( // Check if extras exist and has data
            <ExtrasContainer>
              {thirdProtein && <h3>Choose your third protein</h3>}
              {thirdProtein.map((protein) => (
                <Extra key={protein.type}>
                  <div>
                    <p style={{ fontWeight: "bold", marginBottom: 10 }}>
                      {protein.type}
                    </p>
                    <p style={{ fontSize: "10px", margin: 0, color: "green" }}>
                      {protein.price ? `+£${protein.price?.toFixed(2)}` : null}
                    </p>
                  </div>

                  <Checkbox
                    type="radio"
                    value={protein.type}
                    checked={thirdSelectedProtein === protein.type}
                    onChange={() => handlThirdProtein(protein.type)}
                  />
                </Extra>
              ))}
            </ExtrasContainer>
          )}
      </div>

      <Total>£{totalPrice.toFixed(2)}</Total>

      <ButtonContainer>
        <AddToCart onClick={handleAddToCart}>Add To Cart</AddToCart>
        <CartButtonContainer onClick={handleCartIconClick}>
          {" "}
          {/* Add onClick handler here */}
          <CartIcon />
          <QuantityDisplay>{quantity}</QuantityDisplay>
        </CartButtonContainer>
      </ButtonContainer>
    </DetailsContainer>
  );
};

const Title = styled.h2({
  "@media (max-width: 480px)": {
    margin: "0",
  },
  "@media (min-width: 480px)": {
    margin: "15px 0",
  },
});

const Total = styled.h3({
  "@media (max-width: 480px)": {
    margin: "20px 0",
    marginBottom: "20px",
  },
  "@media (min-width: 480px)": {
    margin: "15px 0",
  },
});

const DetailsContainer = styled.div({
  width: "60%",
  height: "100%",
  padding: "20px",
  display: "flex",
  overflow: "scroll",
  flexDirection: "column",
  justifyContent: "space-between",
  boxSizing: "border-box",
  "@media (max-width: 480px)": {
    width: "100%",
    flexDirection: "column",
    padding: "0 10px 0 10px",
    overflow: "auto",
  },
  "@media (min-width: 480px) and (max-width: 767px)": {
    width: "100%",
    flexDirection: "column",
    padding: "0 20px 20px 20px",
  },
  "@media (min-width: 768px) and (max-width: 1024px)": {
    width: "75%",
    flexDirection: "column",
  },
  "@media (min-width: 1025px) and (max-width: 1920px)": {
    fontSize: "0.9rem", // Reduce font size slightly
    width: "50%", // Adjust width to give more space
  },
});

const ExtrasContainer = styled.div({
  display: "flex",
  justifyContent: "center",
  flexDirection: "column",
  gap: "10px",
  borderTop: "1px solid #E2E2E2",
  borderBottom: "1px solid #E2E2E2",
  "@media (max-width: 480px)": {
    padding: "10px 0 20px",
  },
  "@media (min-width: 480px)": {
    padding: "20px 0",
  },
});

const Extra = styled.div({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
});

const Checkbox = styled.input({
  width: "25px",
  height: "25px",
  cursor: "pointer",
});

const AddToCart = styled.button({
  backgroundColor: "#171717",
  borderRadius: 7,
  width: "80%",
  height: 40,
  color: "white",
  fontWeight: "bold",
  transition: "background-color 0.3s ease, transform 0.3s ease",
  "@media (max-width: 767px)": {
    width: "77%",
  },
  "@media (min-width: 768px) and (max-width: 1024px)": {
    width: "73%",
  },
  "@media (min-width: 1025px) and (max-width: 1920px)": {
    width: "75%",
  },
  "&:active": {
    backgroundColor: "#333", // Darker color when the button is clicked
    transform: "scale(0.98)", // Slightly scale down the button when clicked
  },
});

const ButtonContainer = styled.div({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
});

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
