import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { drawLottery } from "../domain/lottery";
import { HISTORY_KEY } from "../domain/history";
import { useHistory } from "./useHistory";

const sample = drawLottery(
  "ssq",
  () => 123456,
  () => new Date("2026-11-01T08:00:00Z"),
);

describe("useHistory", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("loads, appends, and clears stored history", async () => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify([sample]));
    const { result } = renderHook(() => useHistory());

    expect(result.current.history).toEqual([sample]);

    const next = drawLottery(
      "dlt",
      () => 999,
      () => new Date("2026-11-02T08:00:00Z"),
    );

    act(() => result.current.addHistory(next));

    expect(result.current.history[0]).toEqual(next);
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]")[0]).toEqual(
        next,
      );
    });

    act(() => result.current.clearHistory());
    await waitFor(() => {
      expect(result.current.history).toEqual([]);
      expect(JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]")).toEqual([]);
    });
  });

  it("keeps drawings usable when localStorage throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Blocked", "SecurityError");
    });

    const { result } = renderHook(() => useHistory());
    act(() => result.current.addHistory(sample));

    expect(result.current.history).toEqual([sample]);
    expect(result.current.storageAvailable).toBe(false);
  });
});
