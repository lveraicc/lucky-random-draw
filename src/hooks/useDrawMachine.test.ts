import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DrawAudioController } from "../services/audio";
import { useDrawMachine } from "./useDrawMachine";

function createAudio(): DrawAudioController {
  return {
    start: vi.fn(),
    tick: vi.fn(),
    lock: vi.fn(),
    stop: vi.fn(),
  };
}

describe("useDrawMachine", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
  });

  it("reveals reels in order and reports one completed result", () => {
    const audio = createAudio();
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useDrawMachine({
        soundEnabled: true,
        reduceMotion: false,
        onComplete,
        audio,
      }),
    );

    act(() => result.current.startDraw("ssq"));
    expect(result.current.phase).toBe("drawing");
    expect(result.current.result?.game).toBe("ssq");
    const lockedResult = result.current.result;

    act(() => vi.advanceTimersByTime(1100));
    expect(result.current.phase).toBe("revealing");
    expect(result.current.revealedCount).toBe(1);

    act(() => vi.advanceTimersByTime(2100));
    expect(result.current.revealedCount).toBe(7);
    expect(result.current.phase).toBe("complete");
    expect(result.current.result).toBe(lockedResult);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(audio.tick).toHaveBeenCalledTimes(7);
    expect(audio.lock).toHaveBeenCalledTimes(1);
  });

  it("ignores repeated starts while a draw is running", () => {
    const { result } = renderHook(() =>
      useDrawMachine({
        soundEnabled: false,
        reduceMotion: false,
        onComplete: vi.fn(),
        audio: createAudio(),
      }),
    );

    act(() => {
      result.current.startDraw("ssq");
      result.current.startDraw("dlt");
    });

    expect(result.current.result?.game).toBe("ssq");
  });

  it("shows the locked result quickly when reduced motion is enabled", () => {
    const onComplete = vi.fn();
    const audio = createAudio();
    const { result } = renderHook(() =>
      useDrawMachine({
        soundEnabled: true,
        reduceMotion: true,
        onComplete,
        audio,
      }),
    );

    act(() => result.current.startDraw("dlt"));
    act(() => vi.advanceTimersByTime(450));

    expect(result.current.phase).toBe("complete");
    expect(result.current.revealedCount).toBe(7);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("finishes immediately when the document becomes hidden", () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useDrawMachine({
        soundEnabled: false,
        reduceMotion: false,
        onComplete,
        audio: createAudio(),
      }),
    );

    act(() => result.current.startDraw("ssq"));
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    act(() => document.dispatchEvent(new Event("visibilitychange")));

    expect(result.current.phase).toBe("complete");
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("reports a clear error when secure randomness is unavailable", () => {
    const { result } = renderHook(() =>
      useDrawMachine({
        soundEnabled: false,
        reduceMotion: false,
        onComplete: vi.fn(),
        audio: createAudio(),
        draw: () => {
          throw new Error("当前浏览器不支持安全随机数");
        },
      }),
    );

    act(() => result.current.startDraw("ssq"));

    expect(result.current.phase).toBe("idle");
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBe("当前浏览器不支持安全随机数");
  });

  it("continues the draw when audio playback is blocked", () => {
    const blockedAudio: DrawAudioController = {
      start: vi.fn(() => {
        throw new Error("Audio blocked");
      }),
      tick: vi.fn(() => {
        throw new Error("Audio blocked");
      }),
      lock: vi.fn(() => {
        throw new Error("Audio blocked");
      }),
      stop: vi.fn(() => {
        throw new Error("Audio blocked");
      }),
    };
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useDrawMachine({
        soundEnabled: true,
        reduceMotion: false,
        onComplete,
        audio: blockedAudio,
      }),
    );

    act(() => result.current.startDraw("ssq"));
    expect(result.current.phase).toBe("drawing");
    act(() => vi.advanceTimersByTime(3200));

    expect(result.current.phase).toBe("complete");
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
