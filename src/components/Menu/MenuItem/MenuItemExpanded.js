import React, { useEffect } from "react";
import styled from "styled-components";
import ItemDetails from "./ItemDetails";
import ItemPhoto from "./ItemPhoto";
import { useRestaurant } from "../../../restaurant/RestaurantContext";
import { defaultTheme } from "../../../restaurant/defaultTheme";
import { IoMdCloseCircleOutline } from "react-icons/io";

const MenuItemExpanded = ({ item, onClose }) => {
  const { restaurant } = useRestaurant();
  const noImageUrl = restaurant?.theme?.noImageUrl || defaultTheme.noImageUrl;
  useLockPageScroll();
  const handleContentClick = (e) => {
    e.stopPropagation();
  };

  return (
    <ContentContainer onClick={handleContentClick}>
      {/* Sticky, so it stays reachable while the popup scrolls on phones. */}
      <CloseButton type="button" onClick={onClose} aria-label="Close">
        <IoMdCloseCircleOutline />
      </CloseButton>

      <ItemContainer>
        <ItemImage src={item.imageUrl} fallback={noImageUrl} alt={item.name} />
        <ItemDetails
          name={item.name}
          description={item.description}
          price={item.price}
          extras={item.extras}
          protein={item.protein}
          secondProtein={item.secondProtein}
          thirdProtein={item.thirdProtein}

          image={item.imageUrl}
        />
      </ItemContainer>
    </ContentContainer>
  );
};

// While the popup is open, the page behind it mustn't scroll; swipes scroll the
// popup instead. Pinning the body (position: fixed) is what works on iOS Safari,
// where overflow: hidden on the body alone is ignored for touch scrolling.
function useLockPageScroll() {
  useEffect(() => {
    const { body } = document;
    const scrollY = window.scrollY;
    const previous = { position: body.style.position, top: body.style.top, width: body.style.width, overflow: body.style.overflow };
    Object.assign(body.style, { position: "fixed", top: `-${scrollY}px`, width: "100%", overflow: "hidden" });
    return () => {
      Object.assign(body.style, previous);
      window.scrollTo(0, scrollY);
    };
  }, []);
}

// Photo and options side by side on desktop (photo centred vertically); stacked
// on smaller screens (photo centred horizontally).
const ItemContainer = styled.div({
  width: "100%",
  display: "flex",
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  "@media (max-width: 767px)": {
    flexDirection: "column",
    height: "auto", // Adjust height for mobile view
  },
  "@media (min-width: 768px) and (max-width: 1024px)": {
    flexDirection: "column",
    height: "auto", // Adjust height for tablet view
  },
  "@media (min-width: 1025px) and (max-width: 1920px)": {
    flexDirection: "row", // Ensure layout remains horizontal
    justifyContent: "space-between", // Space out the content
  },
});

const CloseButton = styled.button({
  position: "sticky",
  top: 0,
  alignSelf: "flex-end",
  zIndex: 2,
  marginRight: 10,
  marginBottom: -40,
  width: 40,
  height: 40,
  padding: 0,
  border: "none",
  borderRadius: "50%",
  background: "rgba(255, 255, 255, 0.9)",
  color: "#949494",
  fontSize: "2rem",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
});

const ContentContainer = styled.div({
  backgroundColor: "white",
  padding: "10px 0px",
  display: "flex",
  flexDirection: "column", // Changed to column for consistent layout
  justifyContent: "flex-start",
  alignItems: "center",
  borderRadius: "10px",
  position: "relative",
  width: "40%",
  margin: "5% auto",
  maxHeight: "90vh",
  overflowY: "auto",
  overscrollBehavior: "contain",
  WebkitOverflowScrolling: "touch",
  "@supports (max-height: 90dvh)": { maxHeight: "90dvh" },
  "@media (max-width: 767px)": {
    width: "90%",
    padding: "10px 10px 20px",
  },
  "@media (min-width: 768px) and (max-width: 1024px)": {
    width: "75%",
    padding: "20px 10px",
  },
  "@media (min-width: 1025px) and (max-width: 1920px)": {
    width: "45%", // Adjust width to give more space
    padding: "20px 20px",
  },
});

const ItemImage = styled(ItemPhoto)({
  alignSelf: "center",
  marginRight: 10,
  borderRadius: 16,
  aspectRatio: "4 / 3",
  objectFit: "cover",
  flexShrink: 0,
  height: "auto", // Adjust height to maintain aspect ratio
  width: "100%", // Set width to 100% to fit container
  maxWidth: "300px", // Limit maximum width
  "@media (max-width: 480px)": {
    margin: "0", // Add margin for mobile view
  },
  "@media (min-width: 480px) and (max-width: 767px)": {
    margin: "10px 0", // Add margin for mobile view
  },
  "@media (min-width: 768px) and (max-width: 1024px)": {
    margin: "10px 0", // Add margin for tablet view
  },
  "@media (min-width: 1025px) and (max-width: 1920px)": {
    width: "45%", // Adjust width to give more space to text content
    maxWidth: "400px", // Increase maximum width
    marginRight: "5%", // Add some margin for spacing
  },
});



export default MenuItemExpanded;
