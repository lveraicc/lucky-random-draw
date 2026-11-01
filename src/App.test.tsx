import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App shell", () => {
  it("renders the product title and entertainment disclaimer", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "随机一注" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("随机模拟 · 仅供娱乐，不代表官方开奖"),
    ).toBeInTheDocument();
  });
});
