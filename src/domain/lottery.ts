export type GameId = "ssq" | "dlt";

export interface GameConfig {
  id: GameId;
  name: string;
  primaryLabel: string;
  specialLabel: string;
  primaryCount: number;
  primaryMin: number;
  primaryMax: number;
  specialCount: number;
  specialMin: number;
  specialMax: number;
}

export interface LotteryResult {
  id: string;
  game: GameId;
  primary: number[];
  special: number[];
  createdAt: string;
}

export const GAME_CONFIG: Record<GameId, GameConfig> = {
  ssq: {
    id: "ssq",
    name: "双色球",
    primaryLabel: "红球",
    specialLabel: "蓝球",
    primaryCount: 6,
    primaryMin: 1,
    primaryMax: 33,
    specialCount: 1,
    specialMin: 1,
    specialMax: 16,
  },
  dlt: {
    id: "dlt",
    name: "大乐透",
    primaryLabel: "前区",
    specialLabel: "后区",
    primaryCount: 5,
    primaryMin: 1,
    primaryMax: 35,
    specialCount: 2,
    specialMin: 1,
    specialMax: 12,
  },
};

const UINT32_RANGE = 0x1_0000_0000;

export function secureRandomUint32(): number {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error("当前浏览器不支持安全随机数");
  }

  const values = new Uint32Array(1);
  globalThis.crypto.getRandomValues(values);
  return values[0]!;
}

export function randomInt(
  maxExclusive: number,
  randomUint32: () => number = secureRandomUint32,
): number {
  if (
    !Number.isInteger(maxExclusive) ||
    maxExclusive <= 0 ||
    maxExclusive > UINT32_RANGE
  ) {
    throw new RangeError("maxExclusive must be between 1 and 2^32");
  }

  const limit = Math.floor(UINT32_RANGE / maxExclusive) * maxExclusive;
  let value = randomUint32();

  while (value >= limit) {
    value = randomUint32();
  }

  return value % maxExclusive;
}

function pickNumbers(
  min: number,
  max: number,
  count: number,
  randomUint32: () => number,
): number[] {
  const pool = Array.from({ length: max - min + 1 }, (_, index) => min + index);

  for (let index = 0; index < count; index += 1) {
    const swapIndex = index + randomInt(pool.length - index, randomUint32);
    [pool[index], pool[swapIndex]] = [pool[swapIndex]!, pool[index]!];
  }

  return pool.slice(0, count).sort((a, b) => a - b);
}

function secureId(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  const randomPart = [secureRandomUint32(), secureRandomUint32()]
    .map((value) => value.toString(16).padStart(8, "0"))
    .join("");
  return `${Date.now().toString(36)}-${randomPart}`;
}

export function drawLottery(
  game: GameId,
  randomUint32: () => number = secureRandomUint32,
  now: () => Date = () => new Date(),
): LotteryResult {
  const config = GAME_CONFIG[game];

  return {
    id: secureId(),
    game,
    primary: pickNumbers(
      config.primaryMin,
      config.primaryMax,
      config.primaryCount,
      randomUint32,
    ),
    special: pickNumbers(
      config.specialMin,
      config.specialMax,
      config.specialCount,
      randomUint32,
    ),
    createdAt: now().toISOString(),
  };
}

function pad(number: number): string {
  return String(number).padStart(2, "0");
}

export function formatResultText(result: LotteryResult): string {
  const config = GAME_CONFIG[result.game];
  const primary = result.primary.map(pad).join(" ");
  const special = result.special.map(pad).join(" ");
  return `${config.name}：${config.primaryLabel} ${primary}，${config.specialLabel} ${special}`;
}

function hasValidNumbers(
  values: unknown,
  count: number,
  min: number,
  max: number,
): values is number[] {
  if (!Array.isArray(values) || values.length !== count) {
    return false;
  }

  if (values.some((value) => !Number.isInteger(value) || value < min || value > max)) {
    return false;
  }

  return (
    new Set(values).size === count &&
    values.every((value, index) => index === 0 || values[index - 1] <= value)
  );
}

export function isValidResult(value: unknown): value is LotteryResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<LotteryResult>;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.createdAt !== "string" ||
    Number.isNaN(Date.parse(candidate.createdAt)) ||
    (candidate.game !== "ssq" && candidate.game !== "dlt")
  ) {
    return false;
  }

  const config = GAME_CONFIG[candidate.game];
  return (
    hasValidNumbers(
      candidate.primary,
      config.primaryCount,
      config.primaryMin,
      config.primaryMax,
    ) &&
    hasValidNumbers(
      candidate.special,
      config.specialCount,
      config.specialMin,
      config.specialMax,
    )
  );
}
