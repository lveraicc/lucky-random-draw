import { describe, expect, it } from "vitest";
import { drawLottery } from "./lottery";
import { decodeHistory, prependHistory } from "./history";

const result = (day: number) =>
  drawLottery(
    "ssq",
    () => day,
    () => new Date(`2026-11-${String(day).padStart(2, "0")}T08:00:00Z`),
  );

describe("history domain", () => {
  it("ignores corrupt, malformed, and out-of-range records", () => {
    const valid = result(1);

    expect(decodeHistory("not json")).toEqual([]);
    expect(decodeHistory("{}")).toEqual([]);
    expect(decodeHistory(JSON.stringify([valid, { game: "ssq" }]))).toEqual([
      valid,
    ]);
  });

  it("puts the newest item first and limits history to 20", () => {
    const items = Array.from({ length: 20 }, (_, index) => result(index + 1));
    const newest = result(21);
    const next = prependHistory(items, newest);

    expect(next).toHaveLength(20);
    expect(next[0]).toBe(newest);
    expect(next.at(-1)).toBe(items[18]);
  });
});
