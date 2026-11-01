export interface AndroidBackSubscription {
  remove: () => void | Promise<void>;
}

export interface AndroidBackBridge {
  addListener: (
    event: "backButton",
    listener: () => void,
  ) => Promise<AndroidBackSubscription>;
  exitApp: () => Promise<void>;
}

export interface AndroidBackHandlers {
  isHistoryOpen: () => boolean;
  closeHistory: () => void;
}

export function installAndroidBackHandler(
  bridge: AndroidBackBridge,
  handlers: AndroidBackHandlers,
): () => void {
  let disposed = false;
  let subscription: AndroidBackSubscription | null = null;

  void bridge
    .addListener("backButton", () => {
      if (handlers.isHistoryOpen()) {
        handlers.closeHistory();
        return;
      }

      void bridge.exitApp();
    })
    .then((value) => {
      if (disposed) {
        void value.remove();
      } else {
        subscription = value;
      }
    })
    .catch(() => undefined);

  return () => {
    disposed = true;
    if (subscription) {
      void subscription.remove();
      subscription = null;
    }
  };
}
