import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { HISTORY_KEY } from "./domain/history";

describe("App", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        media: "(prefers-reduced-motion: reduce)",
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("runs a Double Color Ball draw, locks controls, and saves history", async () => {
    render(<App />);

    fireEvent.click(screen.getByTestId("start-draw"));

    expect(screen.getByTestId("start-draw")).toBeDisabled();
    expect(screen.getByRole("button", { name: "大乐透" })).toBeDisabled();

    act(() => vi.advanceTimersByTime(3200));

    expect(screen.getByTestId("start-draw")).toHaveTextContent("再来一组");
    expect(screen.getByTestId("draw-result")).toHaveTextContent("双色球");
    expect(JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]")).toHaveLength(
      1,
    );
  });

  it("switches to Super Lotto when idle", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "大乐透" }));

    expect(screen.getByText("前区")).toBeInTheDocument();
    expect(screen.getByText("后区")).toBeInTheDocument();
  });

  it("toggles sound and reduced motion preferences", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "关闭音效" }));
    fireEvent.click(screen.getByRole("button", { name: "开启减弱动效" }));

    expect(
      screen.getByRole("button", { name: "开启音效" }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(
      screen.getByRole("button", { name: "关闭减弱动效" }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});
