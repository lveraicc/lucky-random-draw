import { useEffect, useRef } from "react";
import { GAME_CONFIG, type LotteryResult } from "../domain/lottery";

interface HistoryPanelProps {
  history: LotteryResult[];
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onClear: () => void;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function NumberSet({ result }: { result: LotteryResult }) {
  return (
    <div className="history-set" aria-label="历史号码">
      {result.primary.map((number, index) => (
        <span className="history-ball history-ball--primary" key={`p-${index}`}>
          {pad(number)}
        </span>
      ))}
      {result.special.map((number, index) => (
        <span className="history-ball history-ball--special" key={`s-${index}`}>
          {pad(number)}
        </span>
      ))}
    </div>
  );
}

export function HistoryPanel({
  history,
  open,
  onOpen,
  onClose,
  onClear,
}: HistoryPanelProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      closeButtonRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  return (
    <>
      <section className="history-summary" aria-label="最近摇号记录">
        <div className="history-summary__header">
          <span>最近记录</span>
          <button type="button" onClick={onOpen} disabled={history.length === 0}>
            查看全部 {history.length > 0 ? `(${history.length})` : ""}
          </button>
        </div>
        {history.length === 0 ? (
          <p className="history-summary__empty">第一组号码还等你摇出</p>
        ) : (
          history.slice(0, 3).map((item) => (
            <div className="history-summary__row" key={item.id}>
              <span>{GAME_CONFIG[item.game].name}</span>
              <NumberSet result={item} />
            </div>
          ))
        )}
      </section>

      {open ? (
        <div className="history-overlay" onMouseDown={onClose}>
          <section
            className="history-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="history-drawer__header">
              <div>
                <span className="eyebrow">LOCAL HISTORY</span>
                <h2 id="history-title">最近 20 组</h2>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                aria-label="关闭历史记录"
              >
                ×
              </button>
            </div>

            <div className="history-drawer__list">
              {history.map((item) => (
                <article className="history-record" key={item.id}>
                  <div>
                    <strong>{GAME_CONFIG[item.game].name}</strong>
                    <time dateTime={item.createdAt}>
                      {new Date(item.createdAt).toLocaleString("zh-CN", {
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                  <NumberSet result={item} />
                </article>
              ))}
            </div>

            <button
              className="history-drawer__clear"
              type="button"
              onClick={onClear}
            >
              清空本地记录
            </button>
          </section>
        </div>
      ) : null}
    </>
  );
}
