import {
  GAME_CONFIG,
  formatResultText,
  type GameId,
  type LotteryResult,
} from "../domain/lottery";
import type { DrawPhase } from "../hooks/useDrawMachine";
import { Reel } from "./Reel";

interface LotteryMachineProps {
  game: GameId;
  phase: DrawPhase;
  result: LotteryResult | null;
  revealedCount: number;
}

export function LotteryMachine({
  game,
  phase,
  result,
  revealedCount,
}: LotteryMachineProps) {
  const config = GAME_CONFIG[game];
  const primaryValues = result?.primary ?? [];
  const specialValues = result?.special ?? [];
  const gridTemplateColumns = `${"minmax(0, 1fr) ".repeat(
    config.primaryCount,
  )}12px ${"minmax(0, 1fr) ".repeat(config.specialCount)}`.trim();
  const isDrawing = phase === "drawing" || phase === "revealing";
  const status =
    result && (phase === "complete" || phase === "idle")
      ? formatResultText(result)
      : phase === "idle"
        ? "等待摇号"
        : "正在摇号";

  return (
    <section
      className="machine-stage"
      data-phase={phase}
      aria-label="随机摇号机"
    >
      <div className="machine-stage__beam" aria-hidden="true" />
      <div className="machine">
        <div className="machine__top">
          <span>{config.name} · 随机一注</span>
          <span className="machine__lights" aria-hidden="true">
            • • • • • •
          </span>
        </div>

        <div className="machine__labels" style={{ gridTemplateColumns }}>
          <span
            className="machine__zone-label machine__zone-label--primary"
            style={{ gridColumn: `1 / span ${config.primaryCount}` }}
          >
            {config.primaryLabel}
          </span>
          <span
            className="machine__zone-label machine__zone-label--special"
            style={{
              gridColumn: `${config.primaryCount + 2} / span ${config.specialCount}`,
            }}
          >
            {config.specialLabel}
          </span>
        </div>

        <div className="machine__reels" style={{ gridTemplateColumns }}>
          {Array.from({ length: config.primaryCount }, (_, index) => (
            <Reel
              key={`primary-${index}`}
              index={index}
              value={primaryValues[index] ?? null}
              tone="primary"
              label={config.primaryLabel}
              spinning={isDrawing && index >= revealedCount}
              revealed={index < revealedCount}
            />
          ))}
          <span className="machine__divider" aria-hidden="true" />
          {Array.from({ length: config.specialCount }, (_, index) => (
            <Reel
              key={`special-${index}`}
              index={config.primaryCount + index}
              value={specialValues[index] ?? null}
              tone="special"
              label={config.specialLabel}
              spinning={
                isDrawing && config.primaryCount + index >= revealedCount
              }
              revealed={config.primaryCount + index < revealedCount}
            />
          ))}
        </div>

        <div className="machine__footer">
          <span>{phase === "complete" ? "结果已锁定" : "安全随机 · 本地生成"}</span>
          <span>{isDrawing ? "转动中" : "READY"}</span>
        </div>
      </div>

      <p className="machine-stage__status" data-testid="draw-result">
        {status}
      </p>
      <p className="sr-only" aria-live="polite">
        {phase === "drawing" ? "正在摇号" : ""}
        {phase === "complete" && result ? status : ""}
      </p>
    </section>
  );
}
