import type { DrawPhase } from "../hooks/useDrawMachine";

interface DrawControlsProps {
  phase: DrawPhase;
  canCopy: boolean;
  onDraw: () => void;
  onCopy: () => void;
  copyMessage: string;
}

export function DrawControls({
  phase,
  canCopy,
  onDraw,
  onCopy,
  copyMessage,
}: DrawControlsProps) {
  const busy = phase === "drawing" || phase === "revealing";
  const label =
    phase === "complete" ? "再来一组" : busy ? "摇号中…" : "开始摇号";

  return (
    <div className="draw-controls">
      <button
        className="draw-controls__primary"
        data-testid="start-draw"
        type="button"
        disabled={busy}
        onClick={onDraw}
      >
        <span className="draw-controls__lamp" aria-hidden="true" />
        {label}
      </button>

      <button
        className="draw-controls__copy"
        type="button"
        disabled={!canCopy}
        onClick={onCopy}
      >
        复制号码
      </button>

      <p className="draw-controls__message" role="status" aria-live="polite">
        {copyMessage}
      </p>
    </div>
  );
}
