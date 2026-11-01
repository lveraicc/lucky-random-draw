# 双色球与大乐透随机摇号机 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个采用经典演播厅视觉、联排转轮动画和浏览器安全随机数的双色球/大乐透随机摇号网页。

**Architecture:** Vite + React + TypeScript 单页应用。玩法规则、随机算法、历史记录、偏好存储、动画状态和展示组件分别负责各自职责；应用完全运行在浏览器端，最终结果在动画前生成并锁定，CSS/Web Animations 只负责逐列揭晓。

**Tech Stack:** Vite、React、TypeScript、原生 CSS、Web Animations API、Vitest、React Testing Library、Playwright。

**Spec:** `docs/superpowers/specs/2026-11-01-lottery-random-draw-design.md`

## Global Constraints

- 双色球：红球 1–33 选 6，蓝球 1–16 选 1；红球升序，蓝球最后展示。
- 大乐透：前区 1–35 选 5，后区 1–12 选 2；前后区分别升序。
- 每次点击只生成一组；摇号期间锁定重复点击和玩法切换。
- 最终号码必须使用 `crypto.getRandomValues()`、拒绝采样和 Fisher–Yates；不得使用 `Math.random()`。
- 最终结果必须在动画播放前生成，动画不得重新决定号码。
- 视觉采用经典演播厅、深海军蓝舞台、暖金色灯光、深色金属和黄铜边框。
- 首屏采用沉浸单舞台；桌面聚焦机器，手机保持单列，历史通过底部入口展开。
- 动画约 3.2 秒；减少动态效果时使用 300–500ms 淡入或直接揭晓。
- 音效默认开启，仅在用户操作后播放；提供静音和减少动态效果控制。
- 历史最多保留 20 组，首屏显示最近 3 组，刷新后保留。
- 运行时不依赖后端、远程图片、远程字体、远程音频或真实购彩接口。
- 免责声明必须包含：“随机模拟 · 仅供娱乐，不代表官方开奖”。
- 红/蓝与前/后区同时使用文字标签，不只依赖颜色。
- 所有主要按钮至少 44px 高，并支持键盘操作。

---

## 文件结构

```text
index.html                         Vite 入口
package.json                       脚本与依赖
tsconfig.json                      TypeScript 严格模式
vite.config.ts                     Vite 与 Vitest 配置
playwright.config.ts               E2E 配置
src/
  main.tsx                         React 挂载
  App.tsx                          页面组合与跨模块事件
  domain/
    lottery.ts                     玩法规则、安全随机、格式化与校验
    history.ts                     历史解析、去旧与持久化常量
  hooks/
    useDrawMachine.ts              摇号状态机与动画时间线
    useHistory.ts                  本地历史状态
    usePreferences.ts              音效和动效偏好
  services/
    audio.ts                       原创机械音效
  components/
    GameSwitcher.tsx               玩法切换
    LotteryMachine.tsx             转轮舞台
    Reel.tsx                       单个数字转轮
    DrawControls.tsx               摇号和复制操作
    HistoryPanel.tsx               最近记录与完整历史
    Disclaimer.tsx                 固定免责声明
  test/
    setup.ts                       测试环境
  styles/
    global.css                     页面、布局、控件和响应式样式
    machine.css                    摇号机、转轮和动画样式
tests/
  lottery.spec.ts                  浏览器端完整流程
```

---

### Task 1: 建立可测试的 Vite 应用外壳

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/test/setup.ts`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: 无。
- Produces: 可运行的 `App` React 组件；`npm test`、`npm run build` 和 `npm run dev` 三个命令。

- [ ] **Step 1: 创建项目元数据并安装依赖**

`package.json`：

```json
{
  "name": "lucky-random-draw",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "e2e": "playwright test"
  }
}
```

Run:

```powershell
npm install react react-dom
npm install -D vite @vitejs/plugin-react typescript vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @types/react @types/react-dom @playwright/test
```

Expected: `package.json` 中出现 `dependencies` 和 `devDependencies`，`node_modules` 可正常解析。

- [ ] **Step 2: 写入构建和测试配置**

`vite.config.ts`：

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    css: true,
    restoreMocks: true,
  },
});
```

`tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "types": ["vitest/globals"]
  },
  "include": ["src", "tests", "vite.config.ts", "playwright.config.ts"]
}
```

`src/test/setup.ts`：

```ts
import "@testing-library/jest-dom/vitest";
```

`index.html`：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta
      name="description"
      content="双色球与大乐透随机模拟工具，仅供娱乐，不代表官方开奖。"
    />
    <meta name="theme-color" content="#0b1220" />
    <title>随机一注 · 双色球与大乐透随机模拟</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: 先写应用外壳的失败测试**

`src/App.test.tsx`：

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App shell", () => {
  it("renders the product title and entertainment disclaimer", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "随机一注" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("随机模拟 · 仅供娱乐，不代表官方开奖"),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: 运行测试并确认失败**

Run: `npm test -- src/App.test.tsx`

Expected: FAIL，原因是 `src/App.tsx` 尚不存在或没有对应标题。

- [ ] **Step 5: 写入最小应用外壳**

`src/App.tsx`：

```tsx
export default function App() {
  return (
    <main>
      <h1>随机一注</h1>
      <p>随机模拟 · 仅供娱乐，不代表官方开奖</p>
    </main>
  );
}
```

`src/main.tsx`：

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/global.css";
import "./styles/machine.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Missing #root element");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

先创建空文件占位样式入口：

```css
/* src/styles/global.css */
```

```css
/* src/styles/machine.css */
```

- [ ] **Step 6: 运行测试和构建**

Run:

```powershell
npm test -- src/App.test.tsx
npm run build
```

Expected: 测试 PASS；生产构建成功。

- [ ] **Step 7: Commit**

```powershell
git add package.json package-lock.json index.html tsconfig.json vite.config.ts src/main.tsx src/App.tsx src/App.test.tsx src/test/setup.ts src/styles/global.css src/styles/machine.css
git commit -m "chore: scaffold React lottery app"
```

---

### Task 2: 实现并验证安全随机玩法

**Files:**
- Create: `src/domain/lottery.ts`
- Test: `src/domain/lottery.test.ts`

**Interfaces:**
- Consumes: 浏览器全局 `crypto.getRandomValues()`。
- Produces:
  - `type GameId = "ssq" | "dlt"`
  - `interface LotteryResult { id: string; game: GameId; primary: number[]; special: number[]; createdAt: string }`
  - `interface GameConfig`
  - `GAME_CONFIG: Record<GameId, GameConfig>`
  - `randomInt(maxExclusive: number, randomUint32?: () => number): number`
  - `drawLottery(game: GameId, randomUint32?: () => number, now?: () => Date): LotteryResult`
  - `formatResultText(result: LotteryResult): string`
  - `isValidResult(value: unknown): value is LotteryResult`

- [ ] **Step 1: 写玩法与随机算法的失败测试**

`src/domain/lottery.test.ts`：

```ts
import { describe, expect, it, vi } from "vitest";
import {
  GAME_CONFIG,
  drawLottery,
  formatResultText,
  isValidResult,
  randomInt,
} from "./lottery";

function seededRandom(seed = 0x12345678) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value;
  };
}

function expectValidSet(
  numbers: number[],
  count: number,
  min: number,
  max: number,
) {
  expect(numbers).toHaveLength(count);
  expect(new Set(numbers).size).toBe(count);
  expect([...numbers].sort((a, b) => a - b)).toEqual(numbers);
  numbers.forEach((number) => {
    expect(Number.isInteger(number)).toBe(true);
    expect(number).toBeGreaterThanOrEqual(min);
    expect(number).toBeLessThanOrEqual(max);
  });
}

describe("randomInt", () => {
  it("rejects values outside the unbiased range", () => {
    const generator = vi
      .fn<() => number>()
      .mockReturnValueOnce(4294967295)
      .mockReturnValueOnce(5);

    expect(randomInt(3, generator)).toBe(2);
    expect(generator).toHaveBeenCalledTimes(2);
  });

  it("rejects invalid ranges", () => {
    expect(() => randomInt(0, seededRandom())).toThrow();
    expect(() => randomInt(-1, seededRandom())).toThrow();
  });
});

describe("drawLottery", () => {
  it("generates valid Double Color Ball results", () => {
    const result = drawLottery(
      "ssq",
      seededRandom(42),
      () => new Date("2026-11-01T08:00:00.000Z"),
    );
    const config = GAME_CONFIG.ssq;

    expect(result.game).toBe("ssq");
    expectValidSet(
      result.primary,
      config.primaryCount,
      config.primaryMin,
      config.primaryMax,
    );
    expectValidSet(
      result.special,
      config.specialCount,
      config.specialMin,
      config.specialMax,
    );
    expect(result.createdAt).toBe("2026-11-01T08:00:00.000Z");
  });

  it("generates valid Super Lotto results", () => {
    const config = GAME_CONFIG.dlt;

    for (let index = 0; index < 500; index += 1) {
      const result = drawLottery("dlt", seededRandom(index + 1));
      expectValidSet(
        result.primary,
        config.primaryCount,
        config.primaryMin,
        config.primaryMax,
      );
      expectValidSet(
        result.special,
        config.specialCount,
        config.specialMin,
        config.specialMax,
      );
    }
  });

  it("always produces the exact required counts over a large sample", () => {
    for (let index = 0; index < 1000; index += 1) {
      const result = drawLottery("ssq", seededRandom(index + 9000));
      expect(result.primary).toHaveLength(6);
      expect(result.special).toHaveLength(1);
    }
  });
});

describe("result formatting and validation", () => {
  it("formats both game names and zones consistently", () => {
    const ssq = drawLottery("ssq", seededRandom(1));
    const dlt = drawLottery("dlt", seededRandom(2));

    expect(formatResultText(ssq)).toMatch(
      /^双色球：红球 \d{2}( \d{2}){5}，蓝球 \d{2}$/,
    );
    expect(formatResultText(dlt)).toMatch(
      /^大乐透：前区 \d{2}( \d{2}){4}，后区 \d{2} \d{2}$/,
    );
  });

  it("rejects malformed or out-of-range history records", () => {
    const valid = drawLottery("ssq", seededRandom(3));

    expect(isValidResult(valid)).toBe(true);
    expect(isValidResult({ ...valid, primary: [1, 2, 3] })).toBe(false);
    expect(isValidResult({ ...valid, primary: [0, 1, 2, 3, 4, 5] })).toBe(
      false,
    );
    expect(isValidResult({ ...valid, createdAt: "not-a-date" })).toBe(false);
    expect(isValidResult(null)).toBe(false);
  });
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- src/domain/lottery.test.ts`

Expected: FAIL，原因是 `./lottery` 不存在。

- [ ] **Step 3: 实现玩法配置、无偏随机和结果校验**

`src/domain/lottery.ts`：

```ts
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
    throw new RangeError("maxExclusive must be an integer between 1 and 2^32");
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

function randomId(): string {
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
    id: randomId(),
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
  return `${config.name}：${config.primaryLabel} ${result.primary
    .map(pad)
    .join(" ")}，${config.specialLabel} ${result.special.map(pad).join(" ")}`;
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

  if (
    values.some(
      (value) =>
        !Number.isInteger(value) || value < min || value > max,
    )
  ) {
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
```

- [ ] **Step 4: 运行测试并修复实现**

Run: `npm test -- src/domain/lottery.test.ts`

Expected: PASS。若格式断言失败，只修改 `formatResultText` 的空格和中文标点，不改变规则。

- [ ] **Step 5: Commit**

```powershell
git add src/domain/lottery.ts src/domain/lottery.test.ts
git commit -m "feat: add secure lottery number generation"
```

---

### Task 3: 实现历史记录的解析、裁剪与持久化

**Files:**
- Create: `src/domain/history.ts`
- Create: `src/hooks/useHistory.ts`
- Test: `src/domain/history.test.ts`
- Test: `src/hooks/useHistory.test.ts`

**Interfaces:**
- Consumes: `LotteryResult`、`isValidResult`。
- Produces:
  - `HISTORY_KEY = "lucky-draw.history.v1"`
  - `MAX_HISTORY = 20`
  - `decodeHistory(raw: string | null, max?: number): LotteryResult[]`
  - `prependHistory(items: LotteryResult[], item: LotteryResult, max?: number): LotteryResult[]`
  - `useHistory(): { history; storageAvailable; addHistory; clearHistory }`

- [ ] **Step 1: 写历史域逻辑失败测试**

`src/domain/history.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { drawLottery } from "./lottery";
import { decodeHistory, prependHistory } from "./history";

const result = (day: number) =>
  drawLottery(
    "ssq",
    () => day,
    () => new Date(`2026-11-${String(day).padStart(2, "0")}T08:00:00Z`),
  );

describe("history domain", () => {
  it("ignores corrupt, malformed, and out-of-range records", () => {
    const valid = result(1);

    expect(decodeHistory("not json")).toEqual([]);
    expect(decodeHistory("{}")).toEqual([]);
    expect(decodeHistory(JSON.stringify([valid, { game: "ssq" }]))).toEqual([
      valid,
    ]);
  });

  it("puts the newest item first and limits history to 20", () => {
    const items = Array.from({ length: 20 }, (_, index) => result(index + 1));
    const newest = result(21);
    const next = prependHistory(items, newest);

    expect(next).toHaveLength(20);
    expect(next[0]).toBe(newest);
    expect(next.at(-1)).toBe(items[18]);
  });
});
```

- [ ] **Step 2: 运行并确认域测试失败**

Run: `npm test -- src/domain/history.test.ts`

Expected: FAIL，原因是 `./history` 不存在。

- [ ] **Step 3: 实现历史域逻辑**

`src/domain/history.ts`：

```ts
import { isValidResult, type LotteryResult } from "./lottery";

export const HISTORY_KEY = "lucky-draw.history.v1";
export const MAX_HISTORY = 20;

export function decodeHistory(raw: string | null, max = MAX_HISTORY) {
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
```

- [ ] **Step 4: 运行域测试**

Run: `npm test -- src/domain/history.test.ts`

Expected: PASS。

- [ ] **Step 5: 写本地历史 Hook 的失败测试**

`src/hooks/useHistory.test.ts`：

```ts
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { drawLottery } from "../domain/lottery";
import { HISTORY_KEY } from "../domain/history";
import { useHistory } from "./useHistory";

const sample = drawLottery(
  "ssq",
  () => 123456,
  () => new Date("2026-11-01T08:00:00Z"),
);

describe("useHistory", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("loads, appends, and clears stored history", async () => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify([sample]));
    const { result } = renderHook(() => useHistory());

    expect(result.current.history).toEqual([sample]);

    const next = drawLottery(
      "dlt",
      () => 999,
      () => new Date("2026-11-02T08:00:00Z"),
    );

    act(() => result.current.addHistory(next));

    expect(result.current.history[0]).toEqual(next);
    expect(JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]")[0]).toEqual(
      next,
    );

    act(() => result.current.clearHistory());
    await waitFor(() => {
      expect(result.current.history).toEqual([]);
      expect(JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]")).toEqual([]);
    });
  });

  it("keeps drawings usable when localStorage throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Blocked", "SecurityError");
    });

    const { result } = renderHook(() => useHistory());
    act(() => result.current.addHistory(sample));

    expect(result.current.history).toEqual([sample]);
    expect(result.current.storageAvailable).toBe(false);
  });
});
```

- [ ] **Step 6: 运行并确认 Hook 测试失败**

Run: `npm test -- src/hooks/useHistory.test.ts`

Expected: FAIL，原因是 `./useHistory` 不存在。

- [ ] **Step 7: 实现历史 Hook**

`src/hooks/useHistory.ts`：

```ts
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
```

- [ ] **Step 8: 运行历史测试**

Run:

```powershell
npm test -- src/domain/history.test.ts src/hooks/useHistory.test.ts
```

Expected: PASS。

- [ ] **Step 9: Commit**

```powershell
git add src/domain/history.ts src/domain/history.test.ts src/hooks/useHistory.ts src/hooks/useHistory.test.ts
git commit -m "feat: persist recent lottery results"
```

---

### Task 4: 实现偏好设置与原创机械音效

**Files:**
- Create: `src/hooks/usePreferences.ts`
- Create: `src/services/audio.ts`
- Test: `src/hooks/usePreferences.test.ts`

**Interfaces:**
- Consumes: `window.localStorage`、`window.matchMedia`、Web Audio API。
- Produces:
  - `PREFERENCES_KEY = "lucky-draw.preferences.v1"`
  - `usePreferences(): { soundEnabled; reduceMotion; setSoundEnabled; setReduceMotion }`
  - `interface DrawAudioController { start(): void; tick(progress: number): void; lock(): void; stop(): void }`
  - `drawAudio: DrawAudioController`

- [ ] **Step 1: 写偏好设置失败测试**

`src/hooks/usePreferences.test.ts`：

```ts
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PREFERENCES_KEY, usePreferences } from "./usePreferences";

function mockReducedMotion(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockReturnValue({
      matches,
      media: "(prefers-reduced-motion: reduce)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
}

describe("usePreferences", () => {
  beforeEach(() => {
    localStorage.clear();
    mockReducedMotion(false);
  });

  it("defaults sound on and reads the system motion preference", () => {
    mockReducedMotion(true);
    const { result } = renderHook(() => usePreferences());

    expect(result.current.soundEnabled).toBe(true);
    expect(result.current.reduceMotion).toBe(true);
  });

  it("stores explicit user choices", () => {
    const { result } = renderHook(() => usePreferences());

    act(() => {
      result.current.setSoundEnabled(false);
      result.current.setReduceMotion(true);
    });

    expect(JSON.parse(localStorage.getItem(PREFERENCES_KEY) ?? "{}")).toEqual({
      soundEnabled: false,
      reduceMotion: true,
    });
  });
});
```

- [ ] **Step 2: 运行并确认失败**

Run: `npm test -- src/hooks/usePreferences.test.ts`

Expected: FAIL，原因是 `./usePreferences` 不存在。

- [ ] **Step 3: 实现偏好设置**

`src/hooks/usePreferences.ts`：

```ts
import { useEffect, useState } from "react";

export const PREFERENCES_KEY = "lucky-draw.preferences.v1";

interface StoredPreferences {
  soundEnabled: boolean;
  reduceMotion: boolean;
}

function systemPrefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function loadPreferences(): StoredPreferences {
  const fallback = {
    soundEnabled: true,
    reduceMotion: systemPrefersReducedMotion(),
  };

  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(PREFERENCES_KEY) ?? "null",
    );

    if (!parsed || typeof parsed !== "object") {
      return fallback;
    }

    const candidate = parsed as Partial<StoredPreferences>;
    return {
      soundEnabled:
        typeof candidate.soundEnabled === "boolean"
          ? candidate.soundEnabled
          : fallback.soundEnabled,
      reduceMotion:
        typeof candidate.reduceMotion === "boolean"
          ? candidate.reduceMotion
          : fallback.reduceMotion,
    };
  } catch {
    return fallback;
  }
}

export function usePreferences() {
  const [preferences, setPreferences] = useState(loadPreferences);

  useEffect(() => {
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    } catch {
      // Preferences are optional; a blocked storage area must not block draws.
    }
  }, [preferences]);

  return {
    ...preferences,
    setSoundEnabled: (soundEnabled: boolean) =>
      setPreferences((previous) => ({ ...previous, soundEnabled })),
    setReduceMotion: (reduceMotion: boolean) =>
      setPreferences((previous) => ({ ...previous, reduceMotion })),
  };
}
```

- [ ] **Step 4: 运行偏好测试**

Run: `npm test -- src/hooks/usePreferences.test.ts`

Expected: PASS。

- [ ] **Step 5: 实现原创 Web Audio 机械音效**

`src/services/audio.ts`：

```ts
export interface DrawAudioController {
  start(): void;
  tick(progress: number): void;
  lock(): void;
  stop(): void;
}

type AudioContextConstructor = new () => AudioContext;

class DrawAudio implements DrawAudioController {
  private context: AudioContext | null = null;
  private hum: OscillatorNode | null = null;
  private humGain: GainNode | null = null;
  private enabled = true;

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.stop();
    }
  }

  private ensureContext(): AudioContext | null {
    if (!this.enabled) {
      return null;
    }

    if (!this.context) {
      const globalWindow = window as typeof window & {
        webkitAudioContext?: AudioContextConstructor;
      };
      const Constructor =
        window.AudioContext ?? globalWindow.webkitAudioContext;

      if (!Constructor) {
        return null;
      }

      try {
        this.context = new Constructor();
      } catch {
        return null;
      }
    }

    if (this.context.state === "suspended") {
      void this.context.resume().catch(() => undefined);
    }

    return this.context;
  }

  start() {
    const context = this.ensureContext();
    if (!context || this.hum) {
      return;
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.value = 82;
    gain.gain.value = 0.012;
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    this.hum = oscillator;
    this.humGain = gain;
  }

  tick(progress: number) {
    const context = this.ensureContext();
    if (!context) {
      return;
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.type = "square";
    oscillator.frequency.value = 760 - Math.min(progress, 1) * 260;
    gain.gain.setValueAtTime(0.018, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.06);
  }

  lock() {
    const context = this.ensureContext();
    if (!context) {
      return;
    }

    const now = context.currentTime;
    [440, 660].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.035, now + index * 0.07);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + index * 0.07 + 0.18,
      );
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(now + index * 0.07);
      oscillator.stop(now + index * 0.07 + 0.19);
    });
  }

  stop() {
    if (this.hum && this.humGain && this.context) {
      const now = this.context.currentTime;
      this.humGain.gain.cancelScheduledValues(now);
      this.humGain.gain.setValueAtTime(this.humGain.gain.value, now);
      this.humGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
      this.hum.stop(now + 0.06);
    }

    this.hum = null;
    this.humGain = null;
  }
}

export const drawAudio = new DrawAudio();
```

- [ ] **Step 6: 构建并提交**

Run:

```powershell
npm test -- src/hooks/usePreferences.test.ts
npm run build
```

Expected: PASS，构建成功。

```powershell
git add src/hooks/usePreferences.ts src/hooks/usePreferences.test.ts src/services/audio.ts
git commit -m "feat: add sound and motion preferences"
```

---

### Task 5: 实现可中断的摇号状态机

**Files:**
- Create: `src/hooks/useDrawMachine.ts`
- Test: `src/hooks/useDrawMachine.test.ts`

**Interfaces:**
- Consumes: `GameId`、`LotteryResult`、`GAME_CONFIG`、`drawLottery`、`DrawAudioController`。
- Produces:
  - `type DrawPhase = "idle" | "drawing" | "revealing" | "complete"`
  - `interface DrawTiming { revealStartMs; reelStaggerMs; reelGapGrowthMs; finishTailMs; reducedMotionMs }`
  - `USE_DRAW_TIMING`
  - `useDrawMachine(options): { phase; result; revealedCount; reelCount; startDraw; reset }`

- [ ] **Step 1: 写状态机失败测试**

`src/hooks/useDrawMachine.test.ts`：

```ts
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DrawAudioController } from "../services/audio";
import { useDrawMachine } from "./useDrawMachine";

function createAudio(): DrawAudioController {
  return {
    start: vi.fn(),
    tick: vi.fn(),
    lock: vi.fn(),
    stop: vi.fn(),
  };
}

describe("useDrawMachine", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reveals reels in order and reports one completed result", () => {
    const audio = createAudio();
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useDrawMachine({
        soundEnabled: true,
        reduceMotion: false,
        onComplete,
        audio,
      }),
    );

    act(() => result.current.startDraw("ssq"));
    expect(result.current.phase).toBe("drawing");
    expect(result.current.result?.game).toBe("ssq");
    const lockedResult = result.current.result;

    act(() => vi.advanceTimersByTime(1100));
    expect(result.current.phase).toBe("revealing");
    expect(result.current.revealedCount).toBe(1);

    act(() => vi.advanceTimersByTime(2100));
    expect(result.current.revealedCount).toBe(7);
    expect(result.current.phase).toBe("complete");
    expect(result.current.result).toBe(lockedResult);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(audio.tick).toHaveBeenCalledTimes(7);
    expect(audio.lock).toHaveBeenCalledTimes(1);
  });

  it("ignores repeated starts while a draw is running", () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useDrawMachine({
        soundEnabled: false,
        reduceMotion: false,
        onComplete,
        audio: createAudio(),
      }),
    );

    act(() => {
      result.current.startDraw("ssq");
      result.current.startDraw("dlt");
    });

    expect(result.current.result?.game).toBe("ssq");
  });

  it("shows the locked result quickly when reduced motion is enabled", () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useDrawMachine({
        soundEnabled: true,
        reduceMotion: true,
        onComplete,
        audio: createAudio(),
      }),
    );

    act(() => result.current.startDraw("dlt"));
    act(() => vi.advanceTimersByTime(450));

    expect(result.current.phase).toBe("complete");
    expect(result.current.revealedCount).toBe(7);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("finishes immediately when the document becomes hidden", () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useDrawMachine({
        soundEnabled: false,
        reduceMotion: false,
        onComplete,
        audio: createAudio(),
      }),
    );

    act(() => result.current.startDraw("ssq"));
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    act(() => document.dispatchEvent(new Event("visibilitychange")));

    expect(result.current.phase).toBe("complete");
    expect(onComplete).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
  });

  it("reports a clear error when secure randomness is unavailable", () => {
    const { result } = renderHook(() =>
      useDrawMachine({
        soundEnabled: false,
        reduceMotion: false,
        onComplete: vi.fn(),
        audio: createAudio(),
        draw: () => {
          throw new Error("当前浏览器不支持安全随机数");
        },
      }),
    );

    act(() => result.current.startDraw("ssq"));

    expect(result.current.phase).toBe("idle");
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBe("当前浏览器不支持安全随机数");
  });
});
```

- [ ] **Step 2: 运行并确认失败**

Run: `npm test -- src/hooks/useDrawMachine.test.ts`

Expected: FAIL，原因是 `./useDrawMachine` 不存在。

- [ ] **Step 3: 实现状态机**

`src/hooks/useDrawMachine.ts`：

```ts
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

  const finish = useCallback(() => {
    if (stateRef.current.phase === "complete") {
      return;
    }

    const lockedResult = resultRef.current;
    if (!lockedResult) {
      return;
    }

    clearTimers();
    audio.stop();
    audio.lock();
    updateState({
      ...stateRef.current,
      phase: "complete",
      revealedCount: stateRef.current.reelCount,
    });
    onCompleteRef.current(lockedResult);
  }, [audio, clearTimers, updateState]);

  const reset = useCallback(() => {
    clearTimers();
    audio.stop();
    resultRef.current = null;
    updateState(INITIAL_STATE);
  }, [audio, clearTimers, updateState]);

  const startDraw = useCallback(
    (game: GameId) => {
      if (
        stateRef.current.phase !== "idle" &&
        stateRef.current.phase !== "complete"
      ) {
        return;
      }

      clearTimers();
      audio.stop();
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
          audio.lock();
          updateState({
            phase: "complete",
            result,
            revealedCount: reelCount,
            reelCount,
            error: null,
          });
          onCompleteRef.current(result);
        }, timing.reducedMotionMs);
        timersRef.current.push(fastTimer);
        return;
      }

      if (soundEnabled) {
        audio.start();
      }

      let nextStopTime = timing.revealStartMs;
      for (let index = 0; index < reelCount; index += 1) {
        if (index > 0) {
          nextStopTime +=
            timing.reelStaggerMs + index * timing.reelGapGrowthMs;
        }

        const revealTimer = window.setTimeout(() => {
          const nextPhase = index === 0 ? "revealing" : stateRef.current.phase;
          updateState({
            ...stateRef.current,
            phase: nextPhase,
            revealedCount: index + 1,
          });

          if (soundEnabled) {
            audio.tick((index + 1) / reelCount);
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
      audio.stop();
    };
  }, [audio, clearTimers, finish]);

  return {
    ...state,
    startDraw,
    reset,
  };
}
```

- [ ] **Step 4: 运行状态机测试**

Run: `npm test -- src/hooks/useDrawMachine.test.ts`

Expected: PASS。

- [ ] **Step 5: Commit**

```powershell
git add src/hooks/useDrawMachine.ts src/hooks/useDrawMachine.test.ts
git commit -m "feat: orchestrate lottery reveal animation state"
```

---

### Task 6: 实现玩法切换、转轮与操作组件

**Files:**
- Create: `src/components/GameSwitcher.tsx`
- Create: `src/components/Reel.tsx`
- Create: `src/components/LotteryMachine.tsx`
- Create: `src/components/DrawControls.tsx`
- Create: `src/components/Disclaimer.tsx`
- Test: `src/components/LotteryMachine.test.tsx`
- Test: `src/components/DrawControls.test.tsx`

**Interfaces:**
- Consumes: `GameId`、`GAME_CONFIG`、`LotteryResult`、`DrawPhase`、`formatResultText`。
- Produces:
  - `GameSwitcher({ game, disabled, onChange })`
  - `Reel({ index, value, tone, label, spinning, revealed })`
  - `LotteryMachine({ game, phase, result, revealedCount })`
  - `DrawControls({ phase, canCopy, onDraw, onCopy, copyMessage })`
  - `Disclaimer()`
- 稳定测试选择器：
  - 游戏按钮：`data-game="ssq"`、`data-game="dlt"`
  - 摇号按钮：`data-testid="start-draw"`
  - 结果区：`data-testid="draw-result"`
  - 转轮：`data-testid="number-reel"`
  - 摇号机阶段：`data-phase="idle|drawing|revealing|complete"`

- [ ] **Step 1: 写转轮和玩法展示的失败测试**

`src/components/LotteryMachine.test.tsx`：

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { drawLottery } from "../domain/lottery";
import { LotteryMachine } from "./LotteryMachine";

describe("LotteryMachine", () => {
  it("renders seven grouped reels for Double Color Ball", () => {
    const result = drawLottery(
      "ssq",
      () => 12345,
      () => new Date("2026-11-01T08:00:00Z"),
    );
    render(
      <LotteryMachine
        game="ssq"
        phase="complete"
        result={result}
        revealedCount={7}
      />,
    );

    expect(screen.getAllByTestId("number-reel")).toHaveLength(7);
    expect(screen.getByText("红球")).toBeInTheDocument();
    expect(screen.getByText("蓝球")).toBeInTheDocument();
    expect(screen.getByTestId("draw-result")).toHaveTextContent("双色球");
  });

  it("renders five front and two back reels for Super Lotto", () => {
    const result = drawLottery(
      "dlt",
      () => 54321,
      () => new Date("2026-11-01T08:00:00Z"),
    );
    render(
      <LotteryMachine
        game="dlt"
        phase="complete"
        result={result}
        revealedCount={7}
      />,
    );

    expect(screen.getAllByTestId("number-reel")).toHaveLength(7);
    expect(screen.getByText("前区")).toBeInTheDocument();
    expect(screen.getByText("后区")).toBeInTheDocument();
    expect(screen.getByTestId("draw-result")).toHaveTextContent("大乐透");
  });
});
```

- [ ] **Step 2: 写操作按钮的失败测试**

`src/components/DrawControls.test.tsx`：

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DrawControls } from "./DrawControls";

describe("DrawControls", () => {
  it("disables the draw button while drawing", () => {
    render(
      <DrawControls
        phase="drawing"
        canCopy={false}
        onDraw={vi.fn()}
        onCopy={vi.fn()}
        copyMessage=""
      />,
    );

    expect(screen.getByTestId("start-draw")).toBeDisabled();
    expect(screen.getByTestId("start-draw")).toHaveTextContent("摇号中");
  });

  it("calls draw and copy actions with keyboard-accessible buttons", async () => {
    const user = userEvent.setup();
    const onDraw = vi.fn();
    const onCopy = vi.fn();
    render(
      <DrawControls
        phase="complete"
        canCopy
        onDraw={onDraw}
        onCopy={onCopy}
        copyMessage="号码已复制"
      />,
    );

    await user.click(screen.getByTestId("start-draw"));
    await user.click(screen.getByRole("button", { name: "复制号码" }));

    expect(onDraw).toHaveBeenCalledTimes(1);
    expect(onCopy).toHaveBeenCalledTimes(1);
    expect(screen.getByText("号码已复制")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: 运行并确认失败**

Run:

```powershell
npm test -- src/components/LotteryMachine.test.tsx src/components/DrawControls.test.tsx
```

Expected: FAIL，原因是组件文件不存在。

- [ ] **Step 4: 实现玩法切换与免责声明**

`src/components/GameSwitcher.tsx`：

```tsx
import { GAME_CONFIG, type GameId } from "../domain/lottery";

interface GameSwitcherProps {
  game: GameId;
  disabled: boolean;
  onChange: (game: GameId) => void;
}

const GAMES: GameId[] = ["ssq", "dlt"];

export function GameSwitcher({
  game,
  disabled,
  onChange,
}: GameSwitcherProps) {
  return (
    <div className="game-switcher" role="group" aria-label="选择玩法">
      {GAMES.map((gameId) => (
        <button
          className="game-switcher__button"
          data-game={gameId}
          type="button"
          aria-pressed={game === gameId}
          disabled={disabled}
          onClick={() => onChange(gameId)}
          key={gameId}
        >
          {GAME_CONFIG[gameId].name}
        </button>
      ))}
    </div>
  );
}
```

`src/components/Disclaimer.tsx`：

```tsx
export function Disclaimer() {
  return (
    <footer className="disclaimer">
      <span>随机模拟 · 仅供娱乐，不代表官方开奖</span>
      <span>请理性看待随机结果</span>
    </footer>
  );
}
```

- [ ] **Step 5: 实现单个转轮**

`src/components/Reel.tsx`：

```tsx
interface ReelProps {
  index: number;
  value: number | null;
  tone: "primary" | "special";
  label: string;
  spinning: boolean;
  revealed: boolean;
}

const STRIP_VALUES = [
  "03",
  "17",
  "29",
  "08",
  "34",
  "11",
  "26",
  "05",
  "31",
  "14",
  "22",
  "09",
];

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function Reel({
  index,
  value,
  tone,
  label,
  spinning,
  revealed,
}: ReelProps) {
  const display = revealed && value !== null ? pad(value) : "--";
  const accessibleValue = revealed && value !== null ? pad(value) : "待揭晓";

  return (
    <div
      className={[
        "reel",
        `reel--${tone}`,
        spinning ? "reel--spinning" : "",
        revealed ? "reel--revealed" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-testid="number-reel"
      data-tone={tone}
      data-reel-index={index}
      role="img"
      aria-label={`${label} ${index + 1}：${accessibleValue}`}
    >
      <div className="reel__glass" aria-hidden="true">
        <div
          className="reel__strip"
          style={{ animationDelay: `${index * -23}ms` }}
        >
          {[...STRIP_VALUES, ...STRIP_VALUES].map((symbol, symbolIndex) => (
            <span key={`${symbol}-${symbolIndex}`}>{symbol}</span>
          ))}
        </div>
      </div>
      <span className="reel__value" aria-hidden="true">
        {display}
      </span>
    </div>
  );
}
```

- [ ] **Step 6: 实现转轮舞台**

`src/components/LotteryMachine.tsx`：

```tsx
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
  const template = `minmax(0, 1fr)`.repeat(config.primaryCount);
  const specialTemplate = `minmax(0, 1fr)`.repeat(config.specialCount);
  const gridTemplateColumns = `${template} 12px ${specialTemplate}`;
  const isDrawing = phase === "drawing" || phase === "revealing";
  const primaryOffset = 0;
  const specialOffset = config.primaryCount;
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

        <div
          className="machine__labels"
          style={{ gridTemplateColumns }}
        >
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

        <div
          className="machine__reels"
          style={{ gridTemplateColumns }}
        >
          {Array.from({ length: config.primaryCount }, (_, index) => (
            <Reel
              key={`primary-${index}`}
              index={index + primaryOffset}
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
              index={index + specialOffset}
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
```

- [ ] **Step 7: 实现主要操作**

`src/components/DrawControls.tsx`：

```tsx
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
```

- [ ] **Step 8: 运行组件测试和构建**

Run:

```powershell
npm test -- src/components/LotteryMachine.test.tsx src/components/DrawControls.test.tsx
npm run build
```

Expected: PASS，构建成功。

- [ ] **Step 9: Commit**

```powershell
git add src/components/GameSwitcher.tsx src/components/Reel.tsx src/components/LotteryMachine.tsx src/components/DrawControls.tsx src/components/Disclaimer.tsx src/components/LotteryMachine.test.tsx src/components/DrawControls.test.tsx
git commit -m "feat: add lottery machine and draw controls"
```

---

### Task 7: 组装历史、复制、偏好和完整应用流程

**Files:**
- Create: `src/components/HistoryPanel.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: `GameSwitcher`、`LotteryMachine`、`DrawControls`、`Disclaimer`、`useHistory`、`usePreferences`、`useDrawMachine`、`drawAudio`、`formatResultText`。
- Produces: 完整可交互单页；所有状态在一个页面内闭环。

- [ ] **Step 1: 把应用测试扩展为完整流程失败测试**

`src/App.test.tsx`：

```tsx
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { HISTORY_KEY } from "./domain/history";

describe("App", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        media: "(prefers-reduced-motion: reduce)",
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("runs a Double Color Ball draw, locks controls, and saves history", async () => {
    const user = userEvent.setup({
      advanceTimers: (milliseconds) => vi.advanceTimersByTime(milliseconds),
    });
    render(<App />);

    await user.click(screen.getByTestId("start-draw"));

    expect(screen.getByTestId("start-draw")).toBeDisabled();
    expect(screen.getByRole("button", { name: "大乐透" })).toBeDisabled();

    act(() => vi.advanceTimersByTime(3200));

    await waitFor(() => {
      expect(screen.getByTestId("start-draw")).toHaveTextContent("再来一组");
    });
    expect(screen.getByTestId("draw-result")).toHaveTextContent("双色球");
    expect(JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]")).toHaveLength(
      1,
    );
  });

  it("switches to Super Lotto when idle", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "大乐透" }));

    expect(screen.getByTestId("draw-result").parentElement).not.toHaveAttribute(
      "data-phase",
      "drawing",
    );
    expect(screen.getByText("前区")).toBeInTheDocument();
    expect(screen.getByText("后区")).toBeInTheDocument();
  });

  it("toggles sound and reduced motion preferences", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "关闭音效" }));
    await user.click(screen.getByRole("button", { name: "开启减弱动效" }));

    expect(
      screen.getByRole("button", { name: "开启音效" }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(
      screen.getByRole("button", { name: "关闭减弱动效" }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});
```

- [ ] **Step 2: 运行并确认失败**

Run: `npm test -- src/App.test.tsx`

Expected: FAIL，原因是 App 尚未包含完整界面和历史持久化。

- [ ] **Step 3: 实现历史摘要和完整历史抽屉**

`src/components/HistoryPanel.tsx`：

```tsx
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
        <span
          className="history-ball history-ball--primary"
          key={`primary-${index}`}
        >
          {pad(number)}
        </span>
      ))}
      {result.special.map((number, index) => (
        <span
          className="history-ball history-ball--special"
          key={`special-${index}`}
        >
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
```

- [ ] **Step 4: 组装完整 App**

`src/App.tsx`：

```tsx
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
  const {
    history,
    storageAvailable,
    addHistory,
    clearHistory,
  } = useHistory();
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

  const {
    phase,
    result,
    revealedCount,
    error: drawError,
    startDraw,
    reset,
  } = useDrawMachine({
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

    const copied = await copyText(formatResultText(result));
    setCopyMessage(copied ? "号码已复制" : "复制失败，请手动选择号码");
  };

  const busy = phase === "drawing" || phase === "revealing";
  const latestForGame = history.find((item) => item.game === game) ?? null;
  const displayResult = result ?? latestForGame;
  const displayPhase = result ? phase : "idle";
  const currentConfig = GAME_CONFIG[game];
  const displayRevealedCount = result
    ? revealedCount
    : latestForGame
      ? currentConfig.primaryCount + currentConfig.specialCount
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
        {drawError ? (
          <p className="draw-error" role="alert">
            {drawError}
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
```

- [ ] **Step 5: 运行应用测试**

Run: `npm test -- src/App.test.tsx`

Expected: PASS。如果 fake timer 与 user-event 卡住，仅把 `userEvent` 的配置改为 `advanceTimers: vi.advanceTimersByTime`，不要移除状态锁定断言。

- [ ] **Step 6: 运行全部单元与组件测试**

Run: `npm test`

Expected: 所有测试 PASS。

- [ ] **Step 7: Commit**

```powershell
git add src/components/HistoryPanel.tsx src/App.tsx src/App.test.tsx
git commit -m "feat: connect complete lottery drawing experience"
```

---

### Task 8: 完成经典演播厅视觉和响应式布局

**Files:**
- Modify: `src/styles/global.css`
- Modify: `src/styles/machine.css`
- Create: `tests/lottery.spec.ts`
- Create: `playwright.config.ts`

**Interfaces:**
- Consumes: Task 6–7 中的稳定选择器和语义结构。
- Produces: 桌面/手机可用的最终视觉；Playwright 可检查无横向滚动。

- [ ] **Step 1: 写响应式布局的失败 E2E**

`playwright.config.ts`：

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
  },
});
```

`tests/lottery.spec.ts`：

```ts
import { expect, test } from "@playwright/test";

test("the page fits the viewport without horizontal scrolling", async ({
  page,
}) => {
  await page.goto("/");

  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));

  expect(dimensions.scrollWidth).toBeLessThanOrEqual(
    dimensions.clientWidth + 1,
  );
  await expect(page.getByTestId("start-draw")).toBeVisible();
  await expect(page.getByTestId("number-reel").last()).toBeInViewport();
  await expect(
    page.getByText("随机模拟 · 仅供娱乐，不代表官方开奖"),
  ).toBeVisible();
});
```

- [ ] **Step 2: 运行并确认视觉测试失败**

Run: `npx playwright install chromium; npm run e2e -- tests/lottery.spec.ts`

Expected: 页面可打开，但首个测试可能 FAIL，因为尚未布局时按钮或页脚不可见，或页面出现横向溢出。

- [ ] **Step 3: 写入全局页面与布局样式**

`src/styles/global.css`：

```css
:root {
  font-family:
    Inter, "Noto Sans SC", "Microsoft YaHei", system-ui, sans-serif;
  color: #fff8e8;
  background: #080e18;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  --ink: #fff8e8;
  --muted: #93a0b4;
  --gold: #e5b85c;
  --gold-bright: #ffd77b;
  --navy: #0b1422;
  --panel: #111b2b;
  --red: #b94337;
  --blue: #3d87b0;
}

* {
  box-sizing: border-box;
}

html {
  min-width: 320px;
  min-height: 100%;
  background: #080e18;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
  overflow-x: hidden;
}

button {
  min-height: 44px;
  font: inherit;
}

button:focus-visible {
  outline: 3px solid #ffe19a;
  outline-offset: 3px;
}

.app-shell {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% -10%, rgba(230, 174, 70, 0.2), transparent 38%),
    repeating-linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.014) 0 1px,
      transparent 1px 24px
    ),
    linear-gradient(180deg, #111c2c, #080e18 70%);
}

.app-shell::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(circle at center, transparent 35%, #03060c 110%);
}

.app-header {
  position: relative;
  z-index: 5;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 20px;
  width: min(1180px, calc(100% - 40px));
  margin: 0 auto;
  padding: 22px 0 12px;
  border-bottom: 1px solid rgba(235, 196, 116, 0.16);
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand h1 {
  margin: 2px 0 0;
  font-family: Georgia, "Noto Serif SC", serif;
  font-size: clamp(20px, 2vw, 28px);
  font-weight: 600;
  letter-spacing: 0.06em;
}

.brand__mark {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border: 1px solid rgba(231, 188, 104, 0.5);
  border-radius: 50%;
  background: rgba(229, 184, 92, 0.08);
  color: var(--gold-bright);
  font-family: Georgia, serif;
  font-size: 20px;
}

.eyebrow,
.label {
  color: var(--gold);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.16em;
}

.game-switcher {
  display: flex;
  gap: 4px;
  padding: 4px;
  border: 1px solid rgba(238, 200, 124, 0.2);
  border-radius: 999px;
  background: rgba(5, 10, 17, 0.45);
}

.game-switcher__button {
  min-width: 92px;
  padding: 9px 18px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
}

.game-switcher__button[aria-pressed="true"] {
  background: linear-gradient(180deg, #ffd778, #d7a33c);
  color: #201508;
  box-shadow: 0 4px 16px rgba(230, 175, 66, 0.25);
}

.game-switcher__button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.preference-controls {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.preference-controls button {
  padding: 9px 12px;
  border: 1px solid rgba(238, 200, 124, 0.18);
  border-radius: 999px;
  background: rgba(10, 17, 27, 0.58);
  color: #abb6c7;
  font-size: 12px;
  cursor: pointer;
}

.preference-controls button[aria-pressed="true"] {
  border-color: rgba(238, 200, 124, 0.45);
  color: var(--gold-bright);
}

main {
  position: relative;
  z-index: 2;
  width: min(1120px, calc(100% - 40px));
  margin: 0 auto;
  padding: 24px 0 30px;
}

.storage-warning {
  max-width: 720px;
  margin: 0 auto 16px;
  padding: 10px 14px;
  border: 1px solid rgba(231, 184, 91, 0.32);
  border-radius: 9px;
  background: rgba(91, 62, 16, 0.35);
  color: #f2d89e;
  text-align: center;
  font-size: 13px;
}

.draw-error {
  max-width: 720px;
  margin: 0 auto 16px;
  padding: 10px 14px;
  border: 1px solid rgba(213, 104, 88, 0.42);
  border-radius: 9px;
  background: rgba(103, 36, 28, 0.32);
  color: #f1beb6;
  text-align: center;
  font-size: 13px;
}

.draw-controls {
  position: relative;
  z-index: 3;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin: -15px auto 24px;
}

.draw-controls__primary {
  min-width: 190px;
  padding: 14px 28px;
  border: 1px solid #ffd77c;
  border-radius: 999px;
  background: linear-gradient(180deg, #ffdb80, #dca332);
  color: #1d1305;
  font-weight: 900;
  letter-spacing: 0.08em;
  box-shadow: 0 7px 0 #85581a, 0 13px 26px rgba(0, 0, 0, 0.38);
  cursor: pointer;
  transition: transform 120ms ease, box-shadow 120ms ease;
}

.draw-controls__primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 9px 0 #85581a, 0 16px 30px rgba(0, 0, 0, 0.4);
}

.draw-controls__primary:active:not(:disabled) {
  transform: translateY(5px);
  box-shadow: 0 2px 0 #85581a;
}

.draw-controls__primary:disabled {
  cursor: wait;
  filter: saturate(0.5);
  opacity: 0.72;
}

.draw-controls__lamp {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-right: 8px;
  border-radius: 50%;
  background: #fff4ca;
  box-shadow: 0 0 12px #fff0a5;
}

.draw-controls__copy {
  padding: 10px 18px;
  border: 1px solid rgba(235, 198, 120, 0.25);
  border-radius: 999px;
  background: rgba(9, 16, 27, 0.72);
  color: #d9c292;
  cursor: pointer;
}

.draw-controls__copy:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.draw-controls__message {
  flex-basis: 100%;
  min-height: 18px;
  margin: 0;
  color: #d9bd82;
  font-size: 12px;
  text-align: center;
}

.history-summary {
  max-width: 850px;
  margin: 0 auto;
  padding: 12px 15px;
  border: 1px solid rgba(231, 192, 114, 0.15);
  border-radius: 12px;
  background: rgba(7, 13, 22, 0.5);
}

.history-summary__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  color: var(--gold);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.history-summary__header button {
  border: 0;
  background: transparent;
  color: #9ba8bb;
  font-size: 11px;
  cursor: pointer;
}

.history-summary__empty {
  margin: 8px 0 2px;
  color: #7f8da1;
  text-align: center;
  font-size: 12px;
}

.history-summary__row {
  display: grid;
  grid-template-columns: 62px 1fr;
  align-items: center;
  gap: 8px;
  padding: 7px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  color: #96a4b7;
  font-size: 10px;
}

.history-set {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.history-ball {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-size: 9px;
  font-weight: 900;
}

.history-ball--primary {
  background: #57332d;
  color: #ffd4c9;
}

.history-ball--special {
  background: #25465a;
  color: #caefff;
}

.history-overlay {
  position: fixed;
  z-index: 20;
  inset: 0;
  display: flex;
  justify-content: flex-end;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(5px);
}

.history-drawer {
  width: min(440px, 100%);
  height: 100%;
  padding: 22px;
  overflow-y: auto;
  border-left: 1px solid rgba(229, 184, 92, 0.25);
  background: #0c1522;
  box-shadow: -20px 0 60px rgba(0, 0, 0, 0.45);
}

.history-drawer__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20px;
}

.history-drawer__header h2 {
  margin: 5px 0 0;
  font-family: Georgia, "Noto Serif SC", serif;
}

.history-drawer__header button {
  width: 44px;
  border: 1px solid rgba(231, 192, 114, 0.2);
  border-radius: 50%;
  background: transparent;
  color: var(--ink);
  font-size: 24px;
  cursor: pointer;
}

.history-record {
  padding: 14px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
}

.history-record > div:first-child {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.history-record time {
  color: #6f7f94;
  font-size: 11px;
}

.history-drawer__clear {
  width: 100%;
  margin-top: 18px;
  border: 1px solid rgba(197, 91, 74, 0.4);
  border-radius: 8px;
  background: rgba(105, 36, 28, 0.2);
  color: #e9b3a9;
  cursor: pointer;
}

.disclaimer {
  position: relative;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px 20px;
  padding: 16px 20px 24px;
  color: #66758a;
  font-size: 11px;
  text-align: center;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 860px) {
  .app-header {
    grid-template-columns: 1fr auto;
    width: min(100% - 24px, 720px);
    padding-top: 14px;
  }

  .game-switcher {
    grid-column: 1 / -1;
    grid-row: 2;
    justify-self: center;
  }

  .preference-controls {
    gap: 5px;
  }

  .preference-controls button {
    padding-inline: 9px;
    font-size: 10px;
  }

  main {
    width: min(100% - 24px, 720px);
    padding-top: 18px;
  }

  .history-summary {
    margin-top: 4px;
  }
}

@media (max-width: 520px) {
  .app-header {
    align-items: flex-start;
  }

  .brand__mark {
    width: 36px;
    height: 36px;
  }

  .brand h1 {
    font-size: 20px;
  }

  .eyebrow {
    font-size: 8px;
  }

  .preference-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .preference-controls button {
    min-height: 32px;
  }

  .game-switcher {
    width: 100%;
  }

  .game-switcher__button {
    flex: 1;
    min-width: 0;
  }

  .draw-controls {
    flex-direction: column;
    margin-top: -5px;
  }

  .draw-controls__primary,
  .draw-controls__copy {
    width: min(100%, 300px);
  }

  .history-summary__row {
    grid-template-columns: 1fr;
  }

  .history-ball {
    width: 22px;
    height: 22px;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
  }

  .reel--spinning .reel__strip {
    animation: none;
  }
}
```

- [ ] **Step 4: 写入摇号机和转轮样式**

`src/styles/machine.css`：

```css
.machine-stage {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 385px;
  padding: 30px 20px 34px;
}

.machine-stage__beam {
  position: absolute;
  top: -80px;
  width: min(680px, 80vw);
  height: 470px;
  pointer-events: none;
  background: linear-gradient(
    180deg,
    rgba(255, 203, 102, 0.2),
    rgba(255, 190, 69, 0.035) 68%,
    transparent
  );
  clip-path: polygon(40% 0, 60% 0, 100% 100%, 0 100%);
  filter: blur(10px);
}

.machine {
  position: relative;
  z-index: 1;
  width: min(920px, 100%);
  padding: 0 12px 12px;
  border: 2px solid #a87b38;
  border-radius: 20px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.055), transparent 22%),
    linear-gradient(180deg, #222b38, #0d131d);
  box-shadow:
    inset 0 0 0 6px #121924,
    inset 0 0 0 7px rgba(239, 197, 113, 0.24),
    0 32px 70px rgba(0, 0, 0, 0.55),
    0 0 60px rgba(225, 169, 59, 0.09);
}

.machine::before,
.machine::after {
  content: "";
  position: absolute;
  top: 68px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f8ce71;
  box-shadow: 0 0 10px #e4a935;
}

.machine::before {
  left: 12px;
}

.machine::after {
  right: 12px;
}

.machine__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 14px;
  color: #e9c56f;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.17em;
}

.machine__lights {
  color: #ffc95c;
  letter-spacing: 5px;
  text-shadow: 0 0 9px #efad32;
}

.machine__labels,
.machine__reels {
  display: grid;
  gap: 9px;
}

.machine__labels {
  padding: 0 15px 7px;
}

.machine__zone-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.machine__zone-label--primary {
  color: #d66a5d;
}

.machine__zone-label--special {
  color: #71b8db;
  text-align: right;
}

.machine__reels {
  padding: 15px;
  border: 1px solid rgba(230, 189, 104, 0.2);
  border-radius: 12px;
  background:
    repeating-linear-gradient(
      0deg,
      rgba(255, 255, 255, 0.02) 0 17px,
      transparent 17px 34px
    ),
    #080e17;
  box-shadow:
    inset 0 0 30px rgba(0, 0, 0, 0.8),
    0 1px rgba(255, 233, 181, 0.08);
}

.machine__divider {
  border-left: 1px solid rgba(230, 189, 104, 0.28);
  box-shadow: -4px 0 12px rgba(230, 189, 104, 0.05);
}

.reel {
  position: relative;
  display: grid;
  place-items: center;
  min-width: 0;
  aspect-ratio: 0.71;
  overflow: hidden;
  border: 2px solid #c49a50;
  border-radius: 9px;
  background: #151b22;
  box-shadow:
    inset 0 0 0 3px #090e15,
    0 8px 16px rgba(0, 0, 0, 0.45);
}

.reel--primary {
  border-color: #bd8d49;
}

.reel--special {
  border-color: #6297b5;
}

.reel__glass {
  position: absolute;
  inset: 5px;
  overflow: hidden;
  border-radius: 5px;
  background:
    linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.22),
      transparent 20%,
      transparent 76%,
      rgba(0, 0, 0, 0.2)
    ),
    linear-gradient(#f6e8bd, #c4a05c);
}

.reel--special .reel__glass {
  background:
    linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.3),
      transparent 24%,
      transparent 75%,
      rgba(0, 0, 0, 0.18)
    ),
    linear-gradient(#bce8fa, #5197bf);
}

.reel__strip {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: rgba(78, 45, 20, 0.32);
  font-family: "Arial Black", sans-serif;
  font-size: clamp(13px, 2.5vw, 28px);
  line-height: 1.15;
  opacity: 0;
}

.reel--special .reel__strip {
  color: rgba(13, 64, 91, 0.35);
}

.reel__strip span {
  display: grid;
  place-items: center;
  height: 1.15em;
}

.reel--spinning .reel__strip {
  opacity: 1;
  animation: reel-roll 170ms linear infinite;
}

.reel--spinning .reel__value {
  opacity: 0;
}

.reel__value {
  position: relative;
  z-index: 2;
  color: #982d27;
  font-family: "Arial Black", sans-serif;
  font-size: clamp(16px, 3vw, 34px);
  line-height: 1;
  text-shadow: 0 1px rgba(255, 255, 255, 0.45);
}

.reel--special .reel__value {
  color: #144c70;
}

.reel--revealed .reel__value {
  animation: reel-lock 280ms cubic-bezier(0.2, 1.45, 0.35, 1);
}

.machine__footer {
  display: flex;
  justify-content: space-between;
  padding: 13px 20px 4px;
  color: #8794a6;
  font-size: 9px;
  letter-spacing: 0.08em;
}

.machine-stage__status {
  position: relative;
  z-index: 2;
  min-height: 22px;
  margin: 18px 0 0;
  color: #d5bc86;
  font-size: 12px;
  letter-spacing: 0.04em;
  text-align: center;
}

@keyframes reel-roll {
  to {
    transform: translateY(-50%);
  }
}

@keyframes reel-lock {
  0% {
    transform: translateY(-14px) scale(0.8);
    opacity: 0.2;
  }
  100% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

@media (max-width: 860px) {
  .machine-stage {
    min-height: 340px;
    padding-inline: 5px;
  }

  .machine {
    border-radius: 15px;
    padding-inline: 7px;
  }

  .machine__reels,
  .machine__labels {
    gap: 6px;
  }

  .machine__reels {
    padding: 11px;
  }

  .machine__top {
    padding-inline: 14px;
  }
}

@media (max-width: 520px) {
  .machine-stage {
    min-height: 275px;
    padding-top: 22px;
    padding-bottom: 26px;
  }

  .machine {
    border-width: 1px;
    box-shadow:
      inset 0 0 0 3px #121924,
      0 20px 42px rgba(0, 0, 0, 0.5);
  }

  .machine__top {
    padding: 13px 11px 10px;
    font-size: 9px;
    letter-spacing: 0.09em;
  }

  .machine__lights {
    display: none;
  }

  .machine__labels {
    padding-inline: 9px;
  }

  .machine__reels {
    gap: 3px;
    padding: 8px 6px;
  }

  .machine__divider {
    display: none;
  }

  .reel {
    border-width: 1px;
    border-radius: 5px;
  }

  .reel__glass {
    inset: 3px;
  }

  .reel__value {
    font-size: 16px;
  }

  .machine__footer {
    padding: 10px 11px 2px;
    font-size: 7px;
  }

  .machine-stage__status {
    margin-top: 12px;
    font-size: 10px;
  }
}
```

- [ ] **Step 5: 运行响应式测试并修复溢出**

Run: `npm run e2e -- tests/lottery.spec.ts`

Expected: desktop 和 mobile 两个项目都 PASS。若手机端溢出，保持 `.machine-stage` 左右 padding 为 5px、`.machine__reels` 的 gap 为 3px，并确认 `.reel` 使用 `min-width: 0`；不得隐藏任何号码。

- [ ] **Step 6: 运行全部单元测试和构建**

Run:

```powershell
npm test
npm run build
```

Expected: 全部 PASS，构建成功。

- [ ] **Step 7: Commit**

```powershell
git add src/styles/global.css src/styles/machine.css tests/lottery.spec.ts playwright.config.ts
git commit -m "feat: add studio lottery visual design"
```

---

### Task 9: 完成端到端验收和部署检查

**Files:**
- Modify: `tests/lottery.spec.ts`
- Create: `README.md`

**Interfaces:**
- Consumes: 完整应用及其稳定测试选择器。
- Produces: 可重复的浏览器验收流程和部署说明。

- [ ] **Step 1: 扩展端到端测试，覆盖两种玩法、复制、历史与减弱动效**

将 `tests/lottery.spec.ts` 替换为：

```ts
import { expect, test } from "@playwright/test";

test("Double Color Ball draw locks controls and persists history", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("start-draw").click();

  await expect(page.getByTestId("start-draw")).toBeDisabled();
  await expect(page.getByRole("button", { name: "大乐透" })).toBeDisabled();
  await expect(page.locator('[data-phase="complete"]')).toBeVisible({
    timeout: 5000,
  });
  await expect(page.getByTestId("draw-result")).toContainText("双色球");
  await expect(page.getByTestId("number-reel")).toHaveCount(7);

  await page.reload();
  await expect(page.getByText("最近记录")).toBeVisible();
  await expect(page.getByText("双色球").first()).toBeVisible();
  await expect(page.getByText("查看全部 (1)")).toBeVisible();
});

test("Super Lotto draw shows five front and two back numbers", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await page.getByRole("button", { name: "大乐透" }).click();
  await page.getByTestId("start-draw").click();

  await expect(page.locator('[data-phase="complete"]')).toBeVisible({
    timeout: 5000,
  });
  await expect(page.getByText("前区")).toBeVisible();
  await expect(page.getByText("后区")).toBeVisible();
  await expect(page.getByTestId("number-reel")).toHaveCount(7);

  await page.getByRole("button", { name: "复制号码" }).click();
  await expect(page.getByText("号码已复制")).toBeVisible();
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboard).toMatch(/^大乐透：前区 \d{2}( \d{2}){4}，后区 \d{2} \d{2}$/);
});

test("the page fits desktop and mobile without horizontal scrolling", async ({
  page,
}) => {
  await page.goto("/");

  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));

  expect(dimensions.scrollWidth).toBeLessThanOrEqual(
    dimensions.clientWidth + 1,
  );
  await expect(page.getByTestId("start-draw")).toBeVisible();
  await expect(
    page.getByText("随机模拟 · 仅供娱乐，不代表官方开奖"),
  ).toBeVisible();
});

test("reduced motion reaches the locked result quickly", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "关闭减弱动效" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "开始摇号" }).click();

  await expect(page.locator('[data-phase="complete"]')).toBeVisible({
    timeout: 1000,
  });
});

test("Space starts a draw from the focused primary action", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("start-draw").focus();
  await page.keyboard.press("Space");

  await expect(page.getByTestId("start-draw")).toBeDisabled();
  await expect(page.locator('[data-phase="complete"]')).toBeVisible({
    timeout: 5000,
  });
});
```

- [ ] **Step 2: 运行端到端测试**

Run: `npm run e2e`

Expected:

- desktop 和 mobile 两个项目都 PASS。
- 两种玩法均完成 7 个转轮揭晓。
- 历史在刷新后存在。
- 复制文本格式正确。
- 减弱动效在 1 秒内进入 `complete`。
- 空格键可启动摇号。

- [ ] **Step 3: 运行最终质量门禁**

Run:

```powershell
npm test
npm run build
npm run e2e
git diff --check
```

Expected: 三条命令均成功；`git diff --check` 无输出。

- [ ] **Step 4: 检查真实浏览器**

Run: `npm run dev -- --host 127.0.0.1`

在浏览器中手动检查：

- 1440×900：机器、按钮、历史摘要和免责声明均无需横向滚动。
- 390×844：7 个转轮完整可见，按钮至少 44px 高，历史抽屉可打开和关闭。
- 双色球切到大乐透后，标签变为“前区/后区”，且不显示上一玩法结果。
- 转轮依次停止，最后特别号码停止后播放锁定音。
- 关闭音效后刷新，仍保持关闭。
- 历史达到 20 组后，新记录进入顶部，最旧记录被移除。
- 历史抽屉按 Escape 可关闭。

- [ ] **Step 5: 编写 README**

`README.md`：

```markdown
# 随机一注

双色球与大乐透随机模拟网页，使用老虎机式联排转轮揭晓安全随机结果。

**随机模拟 · 仅供娱乐，不代表官方开奖。**

## 本地运行

```bash
npm install
npm run dev
```

## 验证

```bash
npm test
npm run build
npm run e2e
```

## 技术说明

- 最终号码在动画前通过 Web Crypto 生成。
- 使用拒绝采样和 Fisher–Yates 避免偏差。
- 历史最多保存 20 组，仅存于当前浏览器。
- 无后端、无账号、无真实购彩接口。

## 部署

运行 `npm run build` 后，将 `dist/` 部署到任意静态托管平台。托管平台需将未匹配路径回退到 `index.html`。
```

- [ ] **Step 6: 最终 Commit**

```powershell
git add tests/lottery.spec.ts README.md
git commit -m "test: verify lottery draw end to end"
```

---

## 计划自检

- 玩法范围、数量、顺序、去重：Task 2。
- Web Crypto、拒绝采样、Fisher–Yates：Task 2。
- 最终结果先锁定、逐列停止、重复点击锁定：Task 5。
- 经典演播厅、联排转轮、沉浸单舞台：Task 6、Task 8。
- 音效、静音和减弱动效：Task 4、Task 5、Task 7。
- 最近 3 组、最多 20 组、刷新后保留：Task 3、Task 7。
- 复制、再次摇号、键盘操作：Task 6、Task 7、Task 9。
- 历史损坏、存储失败、音效阻止、后台返回：Task 3、Task 4、Task 5、Task 7。
- 无障碍标签、红蓝/前后文字、屏幕阅读器播报：Task 6、Task 8。
- 桌面和手机无横向滚动：Task 8、Task 9。
- 免责声明、无后端、无远程运行时资源：Task 1、Task 6、Task 9。
- 单元测试、组件测试、E2E、生产构建：Task 2–Task 9。
