// Fallback theme used before the restaurant record has loaded and to fill any gaps
// in a record's theme. A restaurant's `theme` field (from Firestore) is merged over
// this, so colours/fonts/images come from config while the app never renders unstyled.
export const defaultTheme = {
  colors: {
    primary: "#FF8C00",
    secondary: "#FFC400",
    background: "#ffffff",
    text: "#0a0a0a",
    accent: "#FF8C00",
    navBar: "#333333",
    navBarText: "#ffffff",
  },
  fonts: {
    heading: "system-ui, -apple-system, 'Segoe UI', sans-serif",
    body: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  },
  logoUrl: "",
  heroImageUrl: "",
  faviconUrl: "",
  // Items without a photo show a placeholder in the restaurant colours (ItemPhoto).
  noImageUrl: "",
};

// Deep-ish merge of a restaurant's theme onto the defaults (one level into colours/fonts).
export function buildTheme(restaurantTheme = {}) {
  return {
    ...defaultTheme,
    ...restaurantTheme,
    colors: { ...defaultTheme.colors, ...(restaurantTheme.colors || {}) },
    fonts: { ...defaultTheme.fonts, ...(restaurantTheme.fonts || {}) },
  };
}
