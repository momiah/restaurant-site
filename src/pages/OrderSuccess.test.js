import { act, render, screen } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import OrderSuccess from "./OrderSuccess";
import { buildTheme } from "../restaurant/defaultTheme";

let mockEmit;
const mockUnsubscribe = jest.fn();
jest.mock("firebase/firestore", () => ({
  doc: (_db, col, id) => ({ path: `${col}/${id}` }),
  onSnapshot: (_ref, next) => {
    mockEmit = next;
    return mockUnsubscribe;
  },
}));
jest.mock("../config/firebase", () => ({ db: {} }));
const mockSetCartItems = jest.fn();
jest.mock("../components/AddToCart/CartContext", () => ({ useCart: () => ({ setCartItems: mockSetCartItems }) }));
jest.mock("../restaurant/RestaurantContext", () => ({
  useRestaurant: () => ({
    restaurant: { contact: { phone: "020 7946 0000" }, ordering: { collectionAddress: "1 High St" } },
  }),
}));

const snapshot = (data) => ({ id: "cs_test_abc123", exists: () => !!data, data: () => data });

beforeEach(() => {
  window.history.pushState({}, "", "/order-success/?session_id=cs_test_abc123");
  mockSetCartItems.mockClear();
});

const renderPage = () =>
  render(
    <ThemeProvider theme={buildTheme()}>
      <OrderSuccess />
    </ThemeProvider>
  );

test("waits for the payment to be confirmed, then shows the order number live", () => {
  renderPage();
  act(() => mockEmit(snapshot({ payment_status: "pending", orderType: "Collection", total: 9.5, name: "Ann" })));
  expect(screen.getByTestId("order-status")).toHaveTextContent("Confirming your payment");
  expect(mockSetCartItems).not.toHaveBeenCalled();

  act(() => mockEmit(snapshot({ payment_status: "paid", status: "placed", orderNumber: 1004, orderType: "Collection", total: 9.5, name: "Ann" })));
  expect(screen.getByTestId("order-status")).toHaveTextContent("Order received");
  expect(screen.getByTestId("order-ref")).toHaveTextContent("#1004");
  expect(screen.getByText("1 High St")).toBeInTheDocument();
  expect(mockSetCartItems).toHaveBeenCalledWith([]);
});

test("follows a delivery through to delivered", () => {
  renderPage();
  const order = { payment_status: "paid", orderNumber: 1005, orderType: "Delivery", address: "2 Low Rd", total: 20 };
  act(() => mockEmit(snapshot({ ...order, status: "ready" })));
  expect(screen.getByTestId("order-status")).toHaveTextContent("Out for delivery");
  expect(screen.queryByText("1 High St")).not.toBeInTheDocument();
  act(() => mockEmit(snapshot({ ...order, status: "completed" })));
  expect(screen.getByTestId("order-status")).toHaveTextContent("Delivered");
});

test("uses the restaurant's own phone number, not a hard-coded one", () => {
  renderPage();
  act(() => mockEmit(snapshot({ payment_status: "paid", orderType: "Collection", total: 5 })));
  expect(screen.getByRole("link", { name: "020 7946 0000" })).toHaveAttribute("href", "tel:02079460000");
  expect(screen.queryByText(/0207 1234 5678/)).not.toBeInTheDocument();
});

test("explains when the order can't be found", () => {
  renderPage();
  act(() => mockEmit(snapshot(null)));
  expect(screen.getByText("We couldn't find that order")).toBeInTheDocument();
});
