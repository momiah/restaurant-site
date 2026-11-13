import { fireEvent, render, screen } from "@testing-library/react";
import ItemPhoto from "./ItemPhoto";

test("shows the item's photo when it has one", () => {
  render(<ItemPhoto src="https://img.example/taco.jpg" alt="Soft Taco" />);
  expect(screen.getByAltText("Soft Taco")).toHaveAttribute("src", "https://img.example/taco.jpg");
});

test("shows a placeholder when there's no photo", () => {
  render(<ItemPhoto src="" alt="Soft Taco" />);
  expect(screen.getByRole("img", { name: "Soft Taco (no photo yet)" })).toBeInTheDocument();
});

test("swaps a photo that fails to load for the placeholder, not a broken image", () => {
  render(<ItemPhoto src="https://dead.example/gone.jpg" alt="Soft Taco" />);
  fireEvent.error(screen.getByAltText("Soft Taco"));
  expect(screen.getByRole("img", { name: "Soft Taco (no photo yet)" })).toBeInTheDocument();
  expect(screen.queryByAltText("Soft Taco")).toBeNull();
});

test("uses the restaurant's own 'no photo' image if it has one", () => {
  render(<ItemPhoto src="" fallback="https://img.example/coming-soon.jpg" alt="Soft Taco" />);
  expect(screen.getByAltText("Soft Taco")).toHaveAttribute("src", "https://img.example/coming-soon.jpg");
});
