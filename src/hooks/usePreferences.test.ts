import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PREFERENCES_KEY, usePreferences } from "./usePreferences";

function mockReducedMotion(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockReturnValue({
      matches,
      media: "(prefers-reduced-motion: reduce)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
}

describe("usePreferences", () => {
  beforeEach(() => {
    localStorage.clear();
    mockReducedMotion(false);
  });

  it("defaults sound on and reads the system motion preference", () => {
    mockReducedMotion(true);
    const { result } = renderHook(() => usePreferences());

    expect(result.current.soundEnabled).toBe(true);
    expect(result.current.reduceMotion).toBe(true);
  });

  it("stores explicit user choices", () => {
    const { result } = renderHook(() => usePreferences());

    act(() => {
      result.current.setSoundEnabled(false);
      result.current.setReduceMotion(true);
    });

    expect(JSON.parse(localStorage.getItem(PREFERENCES_KEY) ?? "{}")).toEqual({
      soundEnabled: false,
      reduceMotion: true,
    });
  });
});
