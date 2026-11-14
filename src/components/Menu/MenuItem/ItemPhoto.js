import React, { useEffect, useState } from "react";
import styled from "styled-components";

// A menu item's photo. Items without one, or whose photo fails to load, get a
// tidy placeholder in the restaurant's colours instead of a broken-image icon.
// `className` carries the size/shape from the caller (e.g. styled(ItemPhoto)).
const ItemPhoto = ({ src, alt, className, fallback }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  const url = !failed && (src || fallback);
  if (url) {
    return (
      <img
        className={className}
        src={url}
        alt={alt || ""}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <Placeholder className={className} role="img" aria-label={alt ? `${alt} (no photo yet)` : "No photo yet"}>
      <span aria-hidden="true">🍽️</span>
    </Placeholder>
  );
};

const Placeholder = styled.div(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: `color-mix(in srgb, ${theme?.colors?.primary || "#FF8C00"} 12%, #ffffff)`,
  span: { fontSize: "2.5rem", opacity: 0.8 },
}));

export default ItemPhoto;
