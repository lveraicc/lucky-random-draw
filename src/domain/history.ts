import { isValidResult, type LotteryResult } from "./lottery";

export const HISTORY_KEY = "lucky-draw.history.v1";
export const MAX_HISTORY = 20;

export function decodeHistory(
  raw: string | null,
  max = MAX_HISTORY,
): LotteryResult[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isValidResult).slice(0, Math.max(0, max));
  } catch {
    return [];
  }
}

export function prependHistory(
  items: LotteryResult[],
  item: LotteryResult,
  max = MAX_HISTORY,
): LotteryResult[] {
  return [item, ...items.filter((existing) => existing.id !== item.id)].slice(
    0,
    Math.max(0, max),
  );
}
