import type { Locator, Page, TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { ATLAS_STORAGE_KEY } from "../../lib/client-persistence";
import { expect, test } from "./browser-issues";

const PRINCIPAL_AXE_ROUTES = [
  "/",
  "/tours",
  "/catalogue",
  "/solar-system",
  "/stars",
  "/exoplanets",
  "/deep-sky",
  "/milky-way",
  "/galaxies",
  "/cosmic-scale",
  "/learning",
  "/saved",
  "/settings",
  "/about-data",
  "/methodology",
  "/accessibility",
  "/privacy",
  "/security",
  "/attributions",
] as const;

function requireDesktop(testInfo: TestInfo): void {
  test.skip(
    testInfo.project.name !== "desktop",
    "This renderer or hardware-keyboard contract needs one desktop Chromium run.",
  );
}

async function disableWebGL2(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // The browser method must be captured before the test replaces it.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      value(
        this: HTMLCanvasElement,
        contextId: string,
        ...argumentsList: unknown[]
      ): unknown {
        if (contextId === "webgl2") return null;
        const originalResult: unknown = Reflect.apply(
          originalGetContext,
          this,
          [contextId, ...argumentsList],
        );
        return originalResult;
      },
    });
  });
}

async function submitGlobalSearch(page: Page, query: string): Promise<void> {
  await page.keyboard.press("/");
  const dialog = page.getByRole("dialog", { name: "Search the cosmos" });
  await expect(dialog).toBeVisible();
  const searchbox = dialog.getByRole("searchbox");
  await expect(searchbox).toBeFocused();
  await searchbox.fill(query);
  await page.keyboard.press("Enter");
  await expect(dialog).not.toBeVisible();
}

async function tabUntilFocused(
  page: Page,
  target: Locator,
  maximumTabs: number,
): Promise<void> {
  for (let index = 0; index <= maximumTabs; index += 1) {
    if (
      await target.evaluate(
        (element) => element === element.ownerDocument.activeElement,
      )
    ) {
      return;
    }
    await page.keyboard.press("Tab");
  }
  await expect(
    target,
    `Expected keyboard focus to reach the target within ${maximumTabs} Tab presses.`,
  ).toBeFocused();
}

test("an explicit Earth search completes a real camera flight", async ({
  page,
}, testInfo) => {
  requireDesktop(testInfo);
  await page.goto("/");

  const scene = page.locator(".cosmos-scene");
  await expect(scene).toHaveAttribute("data-graphics-state", "ready", {
    timeout: 20_000,
  });

  await submitGlobalSearch(page, "Andromeda");
  await expect(page.getByTestId("object-panel")).toContainText(
    "Andromeda Galaxy",
  );
  await expect(scene).toHaveAttribute(
    "data-flight-object-id",
    "andromeda-galaxy",
  );
  await expect(scene).toHaveAttribute("data-flight-status", "completed", {
    timeout: 10_000,
  });
  const firstRequestId = Number(
    await scene.getAttribute("data-flight-request-id"),
  );

  await submitGlobalSearch(page, "Earth");
  await expect(page.getByTestId("object-panel")).toContainText("Earth");
  await expect(scene).toHaveAttribute("data-flight-object-id", "earth");
  await expect(scene).toHaveAttribute(
    "data-flight-requested-duration-ms",
    "1750",
  );
  await expect(scene).toHaveAttribute("data-flight-status", "completed", {
    timeout: 10_000,
  });
  const earthRequestId = Number(
    await scene.getAttribute("data-flight-request-id"),
  );
  expect(earthRequestId).toBeGreaterThan(firstRequestId);
});

test("quality choices persist and resolve in the renderer", async ({
  page,
}, testInfo) => {
  requireDesktop(testInfo);

  await page.goto("/settings");
  await page.getByRole("radio", { name: "Low", exact: true }).check();
  await expect
    .poll(() =>
      page.evaluate((storageKey) => {
        const serialized = localStorage.getItem(storageKey);
        return serialized
          ? (
              JSON.parse(serialized) as {
                preferences?: { quality?: string };
              }
            ).preferences?.quality
          : undefined;
      }, ATLAS_STORAGE_KEY),
    )
    .toBe("low");

  await page.goto("/");
  let scene = page.locator(".cosmos-scene");
  await expect(scene).toHaveAttribute("data-cosmos-quality", "low");
  await expect(scene).toHaveAttribute("data-graphics-state", "ready", {
    timeout: 20_000,
  });

  await page.goto("/settings");
  await page.getByRole("radio", { name: "Scientific", exact: true }).check();
  await expect
    .poll(() =>
      page.evaluate((storageKey) => {
        const serialized = localStorage.getItem(storageKey);
        if (!serialized) return null;
        const state = JSON.parse(serialized) as {
          preferences?: {
            quality?: string;
            coordinateGrid?: boolean;
            orbitPaths?: boolean;
          };
        };
        return state.preferences ?? null;
      }, ATLAS_STORAGE_KEY),
    )
    .toMatchObject({
      quality: "scientific",
      coordinateGrid: true,
      orbitPaths: true,
    });

  await page.goto("/");
  scene = page.locator(".cosmos-scene");
  await expect(scene).toHaveAttribute("data-cosmos-quality", "scientific");
  await expect(scene).toHaveAttribute("data-graphics-state", "ready", {
    timeout: 20_000,
  });
});

test("UTC date, Julian date, direction, speed, event, and reset controls agree", async ({
  page,
}, testInfo) => {
  requireDesktop(testInfo);
  await disableWebGL2(page);
  await page.clock.install({ time: new Date("2026-07-30T00:00:00.000Z") });
  await page.goto("/");
  await page.clock.runFor(1);

  await page.getByRole("button", { name: "Time", exact: true }).click();
  const controller = page.locator("section.time-controller[aria-label='Time']");
  await expect(controller).toBeVisible();

  const utcDateTime = controller.getByLabel("UTC date and time");
  await utcDateTime.fill("2024-04-08T18:18");
  await expect(utcDateTime).toHaveValue("2024-04-08T18:18");
  await expect(
    controller.getByText("2,460,409.26250", { exact: true }),
  ).toBeVisible();

  await controller
    .getByRole("button", { name: "1 day/s", exact: true })
    .click();
  await controller.getByRole("button", { name: "Play" }).click();
  await page.clock.fastForward(1_000);
  await expect(utcDateTime).toHaveValue("2024-04-09T18:18");
  await controller.getByRole("button", { name: "Pause" }).click();

  await controller
    .getByLabel("Historical astronomical event")
    .selectOption("gw150914");
  await expect(utcDateTime).toHaveValue("2015-09-14T09:50");
  await expect(controller.getByRole("button", { name: "Play" })).toBeVisible();

  await controller.getByRole("button", { name: /Now/ }).click();
  await expect(utcDateTime).toHaveValue("2026-07-30T00:00");
  await expect(
    controller.locator(".time-speed-row button[aria-pressed='true']"),
  ).toHaveAttribute("aria-pressed", "true");
});

test("system reduced-motion preference makes travel an immediate completed cut", async ({
  page,
}, testInfo) => {
  requireDesktop(testInfo);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const scene = page.locator(".cosmos-scene");
  await expect(scene).toHaveAttribute("data-graphics-state", "ready", {
    timeout: 20_000,
  });
  await submitGlobalSearch(page, "Mars");
  await expect(page.getByTestId("object-panel")).toContainText("Mars");
  await expect(scene).toHaveAttribute("data-flight-object-id", "mars");
  await expect(scene).toHaveAttribute("data-flight-requested-duration-ms", "0");
  await expect(scene).toHaveAttribute("data-flight-status", "completed");
});

test("principal routes have no serious or critical automated axe findings", async ({
  page,
}, testInfo) => {
  requireDesktop(testInfo);
  await disableWebGL2(page);
  const blockingFindings: Array<{
    readonly route: string;
    readonly id: string;
    readonly impact: string | null;
    readonly targets: readonly string[];
  }> = [];

  for (const route of PRINCIPAL_AXE_ROUTES) {
    await page.goto(route);
    await expect(page.locator("#main-content")).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    results.violations
      .filter(
        (violation) =>
          violation.impact === "critical" || violation.impact === "serious",
      )
      .forEach((violation) => {
        blockingFindings.push({
          route,
          id: violation.id,
          impact: violation.impact ?? null,
          targets: violation.nodes.map((node) => JSON.stringify(node.target)),
        });
      });
  }

  expect(blockingFindings).toEqual([]);
});

test("a principal search, navigation, catalogue, and object-tab flow is keyboard-only", async ({
  page,
}, testInfo) => {
  requireDesktop(testInfo);
  await disableWebGL2(page);
  await page.goto("/");
  await expect(
    page.locator('.cosmos-scene[data-graphics-state="unsupported"]'),
  ).toBeVisible();

  const navigationTrigger = page.getByRole("button", {
    name: "Open navigation",
  });
  await tabUntilFocused(page, navigationTrigger, 12);
  await page.keyboard.press("Enter");
  const drawer = page.getByRole("dialog", { name: "Atlas of the Cosmos" });
  const catalogueLink = drawer.locator('a[href="/catalogue"]');
  await tabUntilFocused(page, catalogueLink, 8);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/catalogue$/);

  const catalogueSearch = page.locator(".catalogue-search input");
  await tabUntilFocused(page, catalogueSearch, 12);
  await catalogueSearch.pressSequentially("Earth");
  const earthCard = page.locator(".catalogue-card-main").filter({
    hasText: "Earth",
  });
  await expect(earthCard).toBeVisible();
  await tabUntilFocused(page, earthCard, 8);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("object-panel")).toContainText("Earth");

  const overviewTab = page
    .getByTestId("object-panel")
    .getByRole("tab", { name: "Overview" });
  const dataTab = page
    .getByTestId("object-panel")
    .getByRole("tab", { name: "Data" });
  await tabUntilFocused(page, overviewTab, 40);
  await page.keyboard.press("ArrowRight");
  await expect(dataTab).toBeFocused();
  await expect(dataTab).toHaveAttribute("aria-selected", "true");

  await page.keyboard.press("/");
  const dialog = page.getByRole("dialog", { name: "Search the cosmos" });
  const globalSearch = dialog.getByRole("searchbox");
  await expect(globalSearch).toBeFocused();
  await globalSearch.pressSequentially("Earth");
  await page.keyboard.press("Enter");
  await expect(dialog).not.toBeVisible();
  await expect(page.getByTestId("object-panel")).toContainText("Earth");
});

test("an uncached navigation falls back to the warm shell during network loss", async ({
  browserIssues,
  context,
  page,
}, testInfo) => {
  requireDesktop(testInfo);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);
  await page.waitForLoadState("networkidle");

  const cacheState = await page.evaluate(async () => {
    const uncachedURL = new URL("/privacy", location.origin).href;
    for (const cacheName of await caches.keys()) {
      if (!cacheName.startsWith("atlas-cosmos-")) continue;
      const cache = await caches.open(cacheName);
      await cache.delete(uncachedURL);
    }
    return {
      uncachedRoutePresent: Boolean(await caches.match(uncachedURL)),
      shellPresent: Boolean(
        await caches.match(new URL("/", location.origin).href),
      ),
    };
  });
  expect(cacheState).toEqual({
    uncachedRoutePresent: false,
    shellPresent: true,
  });

  await context.setOffline(true);
  try {
    await page.goto("/privacy?partial-cache-check=1", {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByText("ATLAS / COSMOS")).toBeVisible();
    await expect(page.getByTestId("explorer")).toBeVisible({
      timeout: 20_000,
    });
    // Request-level offline emulation does not reliably force
    // `navigator.onLine` to false inside a service-worker-served document,
    // so the indicator is asserted through the browser's own offline event
    // contract that the application subscribes to.
    await page.evaluate(() => {
      Object.defineProperty(navigator, "onLine", {
        configurable: true,
        get: () => false,
      });
      window.dispatchEvent(new Event("offline"));
    });
    await expect(page.locator(".network-status")).toContainText("Offline");
  } finally {
    await context.setOffline(false);
  }
  browserIssues.acknowledgeExpectedOfflineNavigationFailures();
});

test("WebGL context loss after initialisation exposes fallback and then recovers", async ({
  page,
}, testInfo) => {
  requireDesktop(testInfo);
  await page.goto("/");

  const scene = page.locator(".cosmos-scene");
  const canvas = scene.locator("canvas[role='application']");
  await expect(scene).toHaveAttribute("data-graphics-state", "ready", {
    timeout: 20_000,
  });
  const supportsContextControl = await canvas.evaluate((element) => {
    const controlledCanvas = element as HTMLCanvasElement & {
      __atlasContextControl?: WEBGL_lose_context;
    };
    const context = controlledCanvas.getContext("webgl2");
    const extension = context?.getExtension("WEBGL_lose_context") ?? undefined;
    controlledCanvas.__atlasContextControl = extension;
    return Boolean(extension);
  });
  test.skip(
    !supportsContextControl,
    "The active WebGL implementation does not expose WEBGL_lose_context.",
  );

  await canvas.evaluate((element) => {
    (
      element as HTMLCanvasElement & {
        __atlasContextControl?: WEBGL_lose_context;
      }
    ).__atlasContextControl?.loseContext();
  });
  await expect(scene).toHaveAttribute("data-graphics-state", "context-lost");
  await expect(scene.getByRole("status")).toContainText(
    "attempting to restore",
  );
  await expect(page.getByTestId("object-panel")).toContainText("Earth");

  await canvas.evaluate((element) => {
    (
      element as HTMLCanvasElement & {
        __atlasContextControl?: WEBGL_lose_context;
      }
    ).__atlasContextControl?.restoreContext();
  });
  await expect(scene).toHaveAttribute("data-graphics-state", "ready", {
    timeout: 15_000,
  });
  await expect(scene.getByRole("status")).not.toBeVisible();
  await expect(canvas).toBeVisible();
});

test("@mobile-landscape mobile navigation and explorer tools remain usable in landscape", async ({
  page,
}) => {
  await disableWebGL2(page);
  await page.goto("/");

  expect(page.viewportSize()).toEqual({ width: 800, height: 430 });
  await expect(page.getByTestId("explorer")).toBeVisible();
  await expect(page.locator(".mobile-tabs")).toBeVisible();
  await expect(page.locator(".desktop-rail")).not.toBeVisible();

  const toolbarButtons = page.locator(".explorer-toolbar button");
  await expect(toolbarButtons).toHaveCount(6);
  for (let index = 0; index < (await toolbarButtons.count()); index += 1) {
    const bounds = await toolbarButtons.nth(index).boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.width).toBeGreaterThanOrEqual(44);
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(800);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(430);
  }

  await page.getByRole("button", { name: "Layers", exact: true }).click();
  const layerManager = page.locator(".layer-manager");
  await expect(
    layerManager.getByRole("heading", { name: "Layers" }),
  ).toBeVisible();
  const layerBounds = await layerManager.boundingBox();
  expect(layerBounds).not.toBeNull();
  expect(layerBounds!.x).toBeGreaterThanOrEqual(0);
  expect(layerBounds!.x + layerBounds!.width).toBeLessThanOrEqual(800);
  await layerManager.getByRole("button", { name: "Close" }).click();

  await page.getByRole("button", { name: "Time", exact: true }).click();
  const timeController = page.locator(
    "section.time-controller[aria-label='Time']",
  );
  await expect(timeController).toBeVisible();
  await expect(
    timeController.getByRole("button", { name: "Play" }),
  ).toBeVisible();

  const horizontalExtent = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(horizontalExtent.document).toBeLessThanOrEqual(
    horizontalExtent.viewport,
  );

  await page.locator(".mobile-tabs").locator('a[href="/catalogue"]').click();
  await expect(
    page.getByRole("heading", { name: "A navigable scientific reference" }),
  ).toBeVisible();
});
