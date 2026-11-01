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
  await expect(page.getByText("前区", { exact: true })).toBeVisible();
  await expect(page.getByText("后区", { exact: true })).toBeVisible();
  await expect(page.getByTestId("number-reel")).toHaveCount(7);

  await page.getByRole("button", { name: "复制号码" }).click();
  await expect(page.getByText("号码已复制")).toBeVisible();
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboard).toMatch(
    /^大乐透：前区 \d{2}( \d{2}){4}，后区 \d{2} \d{2}$/,
  );
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
  await expect(page.getByTestId("number-reel").last()).toBeInViewport();
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
