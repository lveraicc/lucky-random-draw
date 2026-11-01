import { useCallback, useEffect, useRef, useState } from "react";
import {
  GAME_CONFIG,
  drawLottery,
  type GameId,
  type LotteryResult,
} from "../domain/lottery";
import {
  drawAudio,
  type DrawAudioController,
} from "../services/audio";

export type DrawPhase = "idle" | "drawing" | "revealing" | "complete";

export interface DrawTiming {
  revealStartMs: number;
  reelStaggerMs: number;
  reelGapGrowthMs: number;
  finishTailMs: number;
  reducedMotionMs: number;
}

export const USE_DRAW_TIMING: DrawTiming = {
  revealStartMs: 1100,
  reelStaggerMs: 150,
  reelGapGrowthMs: 25,
  finishTailMs: 675,
  reducedMotionMs: 450,
};

interface DrawState {
  phase: DrawPhase;
  result: LotteryResult | null;
  revealedCount: number;
  reelCount: number;
  error: string | null;
}

interface UseDrawMachineOptions {
  soundEnabled: boolean;
  reduceMotion: boolean;
  onComplete: (result: LotteryResult) => void;
  audio?: DrawAudioController;
  timing?: DrawTiming;
  draw?: (game: GameId) => LotteryResult;
}

const INITIAL_STATE: DrawState = {
  phase: "idle",
  result: null,
  revealedCount: 0,
  reelCount: 0,
  error: null,
};

export function useDrawMachine({
  soundEnabled,
  reduceMotion,
  onComplete,
  audio = drawAudio,
  timing = USE_DRAW_TIMING,
  draw = drawLottery,
}: UseDrawMachineOptions) {
  const [state, setState] = useState<DrawState>(INITIAL_STATE);
  const stateRef = useRef<DrawState>(INITIAL_STATE);
  const timersRef = useRef<number[]>([]);
  const resultRef = useRef<LotteryResult | null>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const updateState = useCallback((next: DrawState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  }, []);

  const safeAudio = useCallback((operation: () => void) => {
    try {
      operation();
    } catch {
      // Audio is decorative; blocked playback must never interrupt the draw.
    }
  }, []);

  const finish = useCallback(() => {
    if (stateRef.current.phase === "complete") {
      return;
    }

    const lockedResult = resultRef.current;
    if (!lockedResult) {
      return;
    }

    clearTimers();
    safeAudio(() => audio.stop());
    updateState({
      ...stateRef.current,
      phase: "complete",
      revealedCount: stateRef.current.reelCount,
    });
    safeAudio(() => audio.lock());
    onCompleteRef.current(lockedResult);
  }, [audio, clearTimers, safeAudio, updateState]);

  const reset = useCallback(() => {
    clearTimers();
    safeAudio(() => audio.stop());
    resultRef.current = null;
    updateState(INITIAL_STATE);
  }, [audio, clearTimers, safeAudio, updateState]);

  const startDraw = useCallback(
    (game: GameId) => {
      if (
        stateRef.current.phase !== "idle" &&
        stateRef.current.phase !== "complete"
      ) {
        return;
      }

      clearTimers();
      safeAudio(() => audio.stop());
      resultRef.current = null;

      let result: LotteryResult;
      try {
        result = draw(game);
      } catch (error) {
        updateState({
          ...INITIAL_STATE,
          error:
            error instanceof Error
              ? error.message
              : "无法生成安全随机数，请更换浏览器后重试",
        });
        return;
      }

      const config = GAME_CONFIG[game];
      const reelCount = config.primaryCount + config.specialCount;
      resultRef.current = result;

      updateState({
        phase: "drawing",
        result,
        revealedCount: 0,
        reelCount,
        error: null,
      });

      if (reduceMotion) {
        const fastTimer = window.setTimeout(() => {
          updateState({
            phase: "complete",
            result,
            revealedCount: reelCount,
            reelCount,
            error: null,
          });
          safeAudio(() => audio.lock());
          onCompleteRef.current(result);
        }, timing.reducedMotionMs);
        timersRef.current.push(fastTimer);
        return;
      }

      if (soundEnabled) {
        safeAudio(() => audio.start());
      }

      let nextStopTime = timing.revealStartMs;
      for (let index = 0; index < reelCount; index += 1) {
        if (index > 0) {
          nextStopTime +=
            timing.reelStaggerMs + index * timing.reelGapGrowthMs;
        }

        const revealTimer = window.setTimeout(() => {
          updateState({
            ...stateRef.current,
            phase: index === 0 ? "revealing" : stateRef.current.phase,
            revealedCount: index + 1,
          });

          if (soundEnabled) {
            safeAudio(() => audio.tick((index + 1) / reelCount));
          }
        }, nextStopTime);
        timersRef.current.push(revealTimer);
      }

      const finishTimer = window.setTimeout(
        finish,
        nextStopTime + timing.finishTailMs,
      );
      timersRef.current.push(finishTimer);
    },
    [
      audio,
      clearTimers,
      draw,
      finish,
      reduceMotion,
      safeAudio,
      soundEnabled,
      timing.finishTailMs,
      timing.reducedMotionMs,
      timing.reelGapGrowthMs,
      timing.reelStaggerMs,
      timing.revealStartMs,
      updateState,
    ],
  );

  useEffect(() => {
    const handleVisibility = () => {
      if (
        document.visibilityState === "hidden" &&
        resultRef.current &&
        stateRef.current.phase !== "complete"
      ) {
        finish();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      clearTimers();
      safeAudio(() => audio.stop());
    };
  }, [audio, clearTimers, finish, safeAudio]);

  return {
    ...state,
    startDraw,
    reset,
  };
}
