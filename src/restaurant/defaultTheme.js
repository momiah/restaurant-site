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
  noImageUrl:
    "https://firebasestorage.googleapis.com/v0/b/tacomonster-a73fa.appspot.com/o/Products%2Fcoming-soon-photo.jpg?alt=media&token=c917b0d8-4f97-4824-9b07-ed51759c8b31",
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
