import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { drawLottery } from "../domain/lottery";
import { LotteryMachine } from "./LotteryMachine";

describe("LotteryMachine", () => {
  it("renders seven grouped reels for Double Color Ball", () => {
    const result = drawLottery(
      "ssq",
      () => 12345,
      () => new Date("2026-11-01T08:00:00Z"),
    );
    render(
      <LotteryMachine
        game="ssq"
        phase="complete"
        result={result}
        revealedCount={7}
      />,
    );

    expect(screen.getAllByTestId("number-reel")).toHaveLength(7);
    expect(screen.getByText("红球")).toBeInTheDocument();
    expect(screen.getByText("蓝球")).toBeInTheDocument();
    expect(screen.getByTestId("draw-result")).toHaveTextContent("双色球");
  });

  it("renders five front and two back reels for Super Lotto", () => {
    const result = drawLottery(
      "dlt",
      () => 54321,
      () => new Date("2026-11-01T08:00:00Z"),
    );
    render(
      <LotteryMachine
        game="dlt"
        phase="complete"
        result={result}
        revealedCount={7}
      />,
    );

    expect(screen.getAllByTestId("number-reel")).toHaveLength(7);
    expect(screen.getByText("前区")).toBeInTheDocument();
    expect(screen.getByText("后区")).toBeInTheDocument();
    expect(screen.getByTestId("draw-result")).toHaveTextContent("大乐透");
  });
});
