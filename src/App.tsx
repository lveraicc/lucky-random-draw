import { useCallback, useEffect, useState } from "react";
import { Disclaimer } from "./components/Disclaimer";
import { DrawControls } from "./components/DrawControls";
import { GameSwitcher } from "./components/GameSwitcher";
import { HistoryPanel } from "./components/HistoryPanel";
import { LotteryMachine } from "./components/LotteryMachine";
import {
  GAME_CONFIG,
  formatResultText,
  type GameId,
  type LotteryResult,
} from "./domain/lottery";
import { useDrawMachine } from "./hooks/useDrawMachine";
import { useHistory } from "./hooks/useHistory";
import { usePreferences } from "./hooks/usePreferences";
import { drawAudio } from "./services/audio";

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the local textarea fallback.
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    return copied;
  } catch {
    return false;
  }
}

export default function App() {
  const [game, setGame] = useState<GameId>("ssq");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");
  const { history, storageAvailable, addHistory, clearHistory } = useHistory();
  const {
    soundEnabled,
    reduceMotion,
    setSoundEnabled,
    setReduceMotion,
  } = usePreferences();

  const handleComplete = useCallback(
    (result: LotteryResult) => addHistory(result),
    [addHistory],
  );
  const { phase, result, revealedCount, error, startDraw, reset } =
    useDrawMachine({
      soundEnabled,
      reduceMotion,
      onComplete: handleComplete,
    });

  useEffect(() => {
    drawAudio.setEnabled(soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    reset();
  }, [game, reset]);

  useEffect(() => {
    if (!copyMessage) {
      return;
    }
    const timer = window.setTimeout(() => setCopyMessage(""), 1800);
    return () => window.clearTimeout(timer);
  }, [copyMessage]);

  const handleDraw = () => {
    setCopyMessage("");
    startDraw(game);
  };

  const handleCopy = async () => {
    if (!result) {
      return;
    }
    setCopyMessage(
      (await copyText(formatResultText(result)))
        ? "号码已复制"
        : "复制失败，请手动选择号码",
    );
  };

  const busy = phase === "drawing" || phase === "revealing";
  const latestForGame = history.find((item) => item.game === game) ?? null;
  const displayResult = result ?? latestForGame;
  const displayPhase = result ? phase : "idle";
  const config = GAME_CONFIG[game];
  const displayRevealedCount = result
    ? revealedCount
    : latestForGame
      ? config.primaryCount + config.specialCount
      : 0;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">
            L
          </span>
          <div>
            <span className="eyebrow">RANDOM DRAW · 随机模拟</span>
            <h1>随机一注</h1>
          </div>
        </div>

        <GameSwitcher game={game} disabled={busy} onChange={setGame} />

        <div className="preference-controls" aria-label="体验设置">
          <button
            type="button"
            aria-pressed={soundEnabled}
            aria-label={soundEnabled ? "关闭音效" : "开启音效"}
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            {soundEnabled ? "音效 开" : "音效 关"}
          </button>
          <button
            type="button"
            aria-pressed={reduceMotion}
            aria-label={reduceMotion ? "关闭减弱动效" : "开启减弱动效"}
            onClick={() => setReduceMotion(!reduceMotion)}
          >
            {reduceMotion ? "减弱动效 开" : "减弱动效 关"}
          </button>
        </div>
      </header>

      <main>
        {!storageAvailable ? (
          <p className="storage-warning" role="status">
            浏览器未允许本地存储，本次记录刷新后可能丢失。
          </p>
        ) : null}
        {error ? (
          <p className="draw-error" role="alert">
            {error}
          </p>
        ) : null}

        <LotteryMachine
          game={game}
          phase={displayPhase}
          result={displayResult}
          revealedCount={displayRevealedCount}
        />

        <DrawControls
          phase={phase}
          canCopy={phase === "complete" && result !== null}
          onDraw={handleDraw}
          onCopy={handleCopy}
          copyMessage={copyMessage}
        />

        <HistoryPanel
          history={history}
          open={historyOpen}
          onOpen={() => setHistoryOpen(true)}
          onClose={() => setHistoryOpen(false)}
          onClear={clearHistory}
        />
      </main>

      <Disclaimer />
    </div>
  );
}
