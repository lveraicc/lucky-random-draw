import { useCallback, useEffect, useState } from "react";
import {
  HISTORY_KEY,
  decodeHistory,
  prependHistory,
} from "../domain/history";
import type { LotteryResult } from "../domain/lottery";

interface HistoryState {
  history: LotteryResult[];
  storageAvailable: boolean;
  hydrated: boolean;
}

export function useHistory() {
  const [state, setState] = useState<HistoryState>({
    history: [],
    storageAvailable: true,
    hydrated: false,
  });

  useEffect(() => {
    try {
      const history = decodeHistory(localStorage.getItem(HISTORY_KEY));
      setState({ history, storageAvailable: true, hydrated: true });
    } catch {
      setState({ history: [], storageAvailable: false, hydrated: true });
    }
  }, []);

  useEffect(() => {
    if (!state.hydrated) {
      return;
    }

    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(state.history));
      setState((previous) =>
        previous.storageAvailable
          ? previous
          : { ...previous, storageAvailable: true },
      );
    } catch {
      setState((previous) =>
        previous.storageAvailable
          ? { ...previous, storageAvailable: false }
          : previous,
      );
    }
  }, [state.history, state.hydrated]);

  const addHistory = useCallback((item: LotteryResult) => {
    setState((previous) => ({
      ...previous,
      history: prependHistory(previous.history, item),
    }));
  }, []);

  const clearHistory = useCallback(() => {
    setState((previous) => ({ ...previous, history: [] }));
  }, []);

  return {
    history: state.history,
    storageAvailable: state.storageAvailable,
    addHistory,
    clearHistory,
  };
}
