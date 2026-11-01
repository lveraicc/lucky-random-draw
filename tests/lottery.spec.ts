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
