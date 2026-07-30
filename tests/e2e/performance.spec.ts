import type { BrowserContext, Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { performance as nodePerformance } from "node:perf_hooks";
import { resolve } from "node:path";
import { expect, test } from "./browser-issues";

const PERFORMANCE_BUDGETS = {
  initialSemanticReadyMs: 20_000,
  localSearchResponseMs: 3_000,
  repeatedNavigationMs: 30_000,
  heapGrowthBytes: 256 * 1024 * 1024,
} as const;

async function collectGarbage(
  context: BrowserContext,
  page: Page,
): Promise<void> {
  try {
    const session = await context.newCDPSession(page);
    await session.send("HeapProfiler.collectGarbage");
    await session.detach();
  } catch {
    // Heap collection is optional when a non-CDP Chromium channel is used.
  }
}

async function usedHeapBytes(page: Page): Promise<number | null> {
  return page.evaluate(() => {
    const memory = (
      performance as Performance & {
        memory?: { usedJSHeapSize?: number };
      }
    ).memory;
    return typeof memory?.usedJSHeapSize === "number"
      ? memory.usedJSHeapSize
      : null;
  });
}

test("@performance bounded desktop navigation and search smoke", async ({
  browserIssues,
  context,
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === "mobile",
    "The desktop Chromium run records the bounded performance sample.",
  );
  test.setTimeout(90_000);

  const initialStart = nodePerformance.now();
  const initialResponse = await page.goto("/", {
    waitUntil: "domcontentloaded",
  });
  expect(initialResponse?.ok()).toBe(true);
  await expect(page.getByTestId("explorer")).toBeVisible({
    timeout: PERFORMANCE_BUDGETS.initialSemanticReadyMs,
  });
  const settledScene = page
    .locator(
      '[data-graphics-state="ready"], [data-graphics-state="unsupported"], [data-graphics-state="failed"]',
    )
    .first();
  await expect(settledScene).toBeVisible({
    timeout: PERFORMANCE_BUDGETS.initialSemanticReadyMs,
  });
  const initialSemanticReadyMs = nodePerformance.now() - initialStart;
  const graphicsState = await settledScene.getAttribute("data-graphics-state");

  const searchStart = nodePerformance.now();
  await page.keyboard.press("/");
  const dialog = page.getByRole("dialog", { name: "Search the cosmos" });
  await dialog.getByRole("searchbox").fill("Andromeda");
  const andromeda = dialog.getByRole("option", {
    name: /Andromeda Galaxy/,
  });
  await expect(andromeda).toBeVisible({
    timeout: PERFORMANCE_BUDGETS.localSearchResponseMs,
  });
  const localSearchResponseMs = nodePerformance.now() - searchStart;
  await andromeda.click();
  await expect(page.getByTestId("object-panel")).toContainText(
    "Andromeda Galaxy",
  );

  await collectGarbage(context, page);
  const heapBeforeBytes = await usedHeapBytes(page);
  const navigationStart = nodePerformance.now();
  const rail = page.locator(".desktop-rail");
  const cycles = 3;
  for (let cycle = 0; cycle < cycles; cycle += 1) {
    await rail.locator('a[href="/catalogue"]').click();
    await expect(
      page.getByRole("heading", { name: "A navigable scientific reference" }),
    ).toBeVisible();
    await page
      .locator(".catalogue-card")
      .filter({ hasText: "Earth" })
      .first()
      .locator(".catalogue-card-main")
      .click();
    const objectPanel = page.getByTestId("object-panel");
    await expect(objectPanel).toContainText("Earth");
    await objectPanel.getByRole("button", { name: "Close" }).click();
    await rail.locator('a[href="/"]').click();
    await expect(page.getByTestId("explorer")).toBeVisible();
    await expect(
      page
        .locator(
          '[data-graphics-state="ready"], [data-graphics-state="unsupported"], [data-graphics-state="failed"]',
        )
        .first(),
    ).toBeVisible();
  }
  const repeatedNavigationMs = nodePerformance.now() - navigationStart;
  await collectGarbage(context, page);
  const heapAfterBytes = await usedHeapBytes(page);
  const heapGrowthBytes =
    heapBeforeBytes === null || heapAfterBytes === null
      ? null
      : heapAfterBytes - heapBeforeBytes;

  const report = {
    recordedAt: new Date().toISOString(),
    project: testInfo.project.name,
    browserVersion: page.context().browser()?.version() ?? "unknown",
    budgets: PERFORMANCE_BUDGETS,
    metrics: {
      initialSemanticReadyMs: Math.round(initialSemanticReadyMs),
      localSearchResponseMs: Math.round(localSearchResponseMs),
      repeatedNavigationMs: Math.round(repeatedNavigationMs),
      repeatedNavigationCycles: cycles,
      graphicsState,
      heapBeforeBytes,
      heapAfterBytes,
      heapGrowthBytes,
      browserErrorCount: browserIssues.issues.length,
    },
  };
  const outputDirectory = resolve(process.cwd(), "outputs");
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(
    resolve(outputDirectory, "performance-smoke.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );

  expect(initialSemanticReadyMs).toBeLessThanOrEqual(
    PERFORMANCE_BUDGETS.initialSemanticReadyMs,
  );
  expect(localSearchResponseMs).toBeLessThanOrEqual(
    PERFORMANCE_BUDGETS.localSearchResponseMs,
  );
  expect(repeatedNavigationMs).toBeLessThanOrEqual(
    PERFORMANCE_BUDGETS.repeatedNavigationMs,
  );
  if (heapGrowthBytes !== null) {
    expect(heapGrowthBytes).toBeLessThanOrEqual(
      PERFORMANCE_BUDGETS.heapGrowthBytes,
    );
  }
});
