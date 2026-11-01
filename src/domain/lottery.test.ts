import { describe, expect, it, vi } from "vitest";
import {
  GAME_CONFIG,
  drawLottery,
  formatResultText,
  isValidResult,
  randomInt,
} from "./lottery";

function seededRandom(seed = 0x12345678) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value;
  };
}

function expectValidSet(
  numbers: number[],
  count: number,
  min: number,
  max: number,
) {
  expect(numbers).toHaveLength(count);
  expect(new Set(numbers).size).toBe(count);
  expect([...numbers].sort((a, b) => a - b)).toEqual(numbers);
  numbers.forEach((number) => {
    expect(Number.isInteger(number)).toBe(true);
    expect(number).toBeGreaterThanOrEqual(min);
    expect(number).toBeLessThanOrEqual(max);
  });
}

describe("randomInt", () => {
  it("rejects values outside the unbiased range", () => {
    const generator = vi
      .fn<() => number>()
      .mockReturnValueOnce(4294967295)
      .mockReturnValueOnce(5);

    expect(randomInt(3, generator)).toBe(2);
    expect(generator).toHaveBeenCalledTimes(2);
  });

  it("rejects invalid ranges", () => {
    expect(() => randomInt(0, seededRandom())).toThrow();
    expect(() => randomInt(-1, seededRandom())).toThrow();
  });
});

describe("drawLottery", () => {
  it("generates valid Double Color Ball results", () => {
    const result = drawLottery(
      "ssq",
      seededRandom(42),
      () => new Date("2026-11-01T08:00:00.000Z"),
    );
    const config = GAME_CONFIG.ssq;

    expect(result.game).toBe("ssq");
    expectValidSet(
      result.primary,
      config.primaryCount,
      config.primaryMin,
      config.primaryMax,
    );
    expectValidSet(
      result.special,
      config.specialCount,
      config.specialMin,
      config.specialMax,
    );
    expect(result.createdAt).toBe("2026-11-01T08:00:00.000Z");
  });

  it("generates valid Super Lotto results", () => {
    const config = GAME_CONFIG.dlt;

    for (let index = 0; index < 500; index += 1) {
      const result = drawLottery("dlt", seededRandom(index + 1));
      expectValidSet(
        result.primary,
        config.primaryCount,
        config.primaryMin,
        config.primaryMax,
      );
      expectValidSet(
        result.special,
        config.specialCount,
        config.specialMin,
        config.specialMax,
      );
    }
  });

  it("always produces exact counts over a large sample", () => {
    for (let index = 0; index < 1000; index += 1) {
      const result = drawLottery("ssq", seededRandom(index + 9000));
      expect(result.primary).toHaveLength(6);
      expect(result.special).toHaveLength(1);
    }
  });
});

describe("result formatting and validation", () => {
  it("formats both game names and zones consistently", () => {
    const ssq = drawLottery("ssq", seededRandom(1));
    const dlt = drawLottery("dlt", seededRandom(2));

    expect(formatResultText(ssq)).toMatch(
      /^双色球：红球 \d{2}( \d{2}){5}，蓝球 \d{2}$/,
    );
    expect(formatResultText(dlt)).toMatch(
      /^大乐透：前区 \d{2}( \d{2}){4}，后区 \d{2} \d{2}$/,
    );
  });

  it("rejects malformed or out-of-range history records", () => {
    const valid = drawLottery("ssq", seededRandom(3));

    expect(isValidResult(valid)).toBe(true);
    expect(isValidResult({ ...valid, primary: [1, 2, 3] })).toBe(false);
    expect(isValidResult({ ...valid, primary: [0, 1, 2, 3, 4, 5] })).toBe(
      false,
    );
    expect(isValidResult({ ...valid, createdAt: "not-a-date" })).toBe(false);
    expect(isValidResult(null)).toBe(false);
  });
});
