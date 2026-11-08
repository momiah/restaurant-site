import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import Cart from "./Cart";
import { buildTheme } from "../../restaurant/defaultTheme";

const mockCart = [
  // Prices in the basket are for display only; the server prices from the menu.
  { name: "Burrito", price: 0.01, quantity: 2, extras: [{ type: "Guac", price: 1 }], protein: "Beef" },
];
jest.mock("./CartContext", () => ({
  useCart: () => ({
    cartItems: mockCart,
    isCartOpen: true,
    toggleCart: jest.fn(),
    increaseQuantity: jest.fn(),
    decreaseQuantity: jest.fn(),
  }),
}));
jest.mock("../../restaurant/RestaurantContext", () => ({
  useRestaurant: () => ({ restaurantId: "taco-monster", restaurant: { ordering: { orderTypes: ["Collection", "Delivery"] } } }),
}));

beforeEach(() => {
  delete window.location;
  window.location = { href: "" };
});

test("sends only what the customer wants and their details, then opens Stripe", async () => {
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve({ id: "cs_1", url: "https://checkout.stripe.com/pay" }) })
  );
  render(
    <ThemeProvider theme={buildTheme()}>
      <Cart />
    </ThemeProvider>
  );
  fireEvent.change(screen.getAllByPlaceholderText("Name")[0], { target: { name: "name", value: "Ann" } });
  fireEvent.change(screen.getAllByPlaceholderText("Contact Number")[0], { target: { name: "contactNumber", value: "07700900123" } });
  fireEvent.click(screen.getAllByText("Go To Checkout")[0]);

  await waitFor(() => expect(window.location.href).toBe("https://checkout.stripe.com/pay"));
  const body = JSON.parse(global.fetch.mock.calls[0][1].body);
  expect(body).toEqual({
    restaurantId: "taco-monster",
    orderType: "Collection",
    cartItems: [{ name: "Burrito", quantity: 2, extras: ["Guac"], protein: "Beef", secondProtein: null, thirdProtein: null }],
    customer: { name: "Ann", contactNumber: "07700900123", address: "", postCode: "", notes: "" },
  });
  expect(JSON.stringify(body)).not.toContain("0.01"); // no client prices are sent
});

test("shows the server's reason when the basket is refused", async () => {
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: false, json: () => Promise.resolve("Burrito is no longer available. Please remove it from your basket.") })
  );
  render(
    <ThemeProvider theme={buildTheme()}>
      <Cart />
    </ThemeProvider>
  );
  fireEvent.change(screen.getAllByPlaceholderText("Contact Number")[0], { target: { name: "contactNumber", value: "07700900123" } });
  fireEvent.click(screen.getAllByText("Go To Checkout")[0]);
  expect(await screen.findByText(/Burrito is no longer available/)).toBeInTheDocument();
  expect(window.location.href).toBe("");
});
