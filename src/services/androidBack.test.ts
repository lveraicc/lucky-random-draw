import { describe, expect, it, vi } from "vitest";
import {
  installAndroidBackHandler,
  type AndroidBackBridge,
} from "./androidBack";

function createBridge() {
  let callback: (() => void) | undefined;
  const remove = vi.fn();
  const exitApp = vi.fn().mockResolvedValue(undefined);
  const bridge: AndroidBackBridge = {
    addListener: vi.fn(async (_event, listener) => {
      callback = listener;
      return { remove };
    }),
    exitApp,
  };
  return {
    bridge,
    exitApp,
    remove,
    pressBack: () => callback?.(),
  };
}

describe("installAndroidBackHandler", () => {
  it("closes an open history drawer instead of exiting", async () => {
    const { bridge, exitApp, pressBack } = createBridge();
    const closeHistory = vi.fn();

    installAndroidBackHandler(bridge, {
      isHistoryOpen: () => true,
      closeHistory,
    });
    await Promise.resolve();
    pressBack();

    expect(closeHistory).toHaveBeenCalledTimes(1);
    expect(exitApp).not.toHaveBeenCalled();
  });

  it("exits when the history drawer is closed", async () => {
    const { bridge, exitApp, pressBack } = createBridge();

    installAndroidBackHandler(bridge, {
      isHistoryOpen: () => false,
      closeHistory: vi.fn(),
    });
    await Promise.resolve();
    pressBack();

    expect(exitApp).toHaveBeenCalledTimes(1);
  });

  it("removes the native listener when disposed", async () => {
    const { bridge, remove } = createBridge();
    const dispose = installAndroidBackHandler(bridge, {
      isHistoryOpen: () => false,
      closeHistory: vi.fn(),
    });

    await Promise.resolve();
    dispose();

    expect(remove).toHaveBeenCalledTimes(1);
  });
});
