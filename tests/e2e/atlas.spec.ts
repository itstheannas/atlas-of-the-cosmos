import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  ATLAS_STORAGE_KEY,
  defaultAtlasPreferences,
} from "../../lib/client-persistence";
import { guidedTours } from "../../lib/cosmos-data";
import { expect, test } from "./browser-issues";

const DARK_MASK = "#07100f";

interface StoredTourProgress {
  readonly schemaVersion: number;
  readonly tourId: string;
  readonly tourVersion: string;
  readonly lastCompletedChapterId?: string;
  readonly reducedMotion: boolean;
}

interface StoredAtlasState {
  readonly version: number;
  readonly tourProgress: Readonly<Record<string, StoredTourProgress>>;
}

async function readStoredAtlasState(
  page: Page,
): Promise<StoredAtlasState | null> {
  const serialized = await page.evaluate(
    (storageKey) => window.localStorage.getItem(storageKey),
    ATLAS_STORAGE_KEY,
  );
  return serialized ? (JSON.parse(serialized) as StoredAtlasState) : null;
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

test("built Worker serves its linked CSS and JavaScript assets", async ({
  request,
}) => {
  const document = await request.get("/");
  expect(document.status()).toBe(200);
  const html = await document.text();
  const assetPaths = [
    ...html.matchAll(/(?:href|src)="(\/assets\/[^"]+\.(?:css|js))"/g),
  ].map((match) => match[1]);
  const css = assetPaths.find((path) => path.endsWith(".css"));
  const javascript = assetPaths.find((path) => path.endsWith(".js"));
  expect(css, "server HTML must link a built stylesheet").toBeTruthy();
  expect(
    javascript,
    "server HTML must link a built JavaScript module",
  ).toBeTruthy();

  for (const path of [css, javascript]) {
    const asset = await request.get(path!);
    expect(asset.status(), `${path} must be served by the ASSETS binding`).toBe(
      200,
    );
    expect(asset.headers()["content-type"]).toMatch(
      path!.endsWith(".css") ? /^text\/css\b/ : /javascript/,
    );
    expect((await asset.body()).byteLength).toBeGreaterThan(100);
  }
});

test("critical explorer, search, layer, and time flow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("ATLAS / COSMOS")).toBeVisible();
  await expect(page.getByTestId("explorer")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("canvas[role='application']")).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByTestId("object-panel")).toContainText("Earth");

  await page.keyboard.press("/");
  const dialog = page.getByRole("dialog", { name: "Search the cosmos" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("searchbox").fill("Andromeda");
  await dialog.getByRole("option", { name: /Andromeda Galaxy/ }).click();
  await expect(page.getByTestId("object-panel")).toContainText(
    "Andromeda Galaxy",
  );

  await page.getByRole("button", { name: "Layers", exact: true }).click();
  const layerManager = page.locator(".layer-manager");
  await expect(
    layerManager.getByRole("heading", { name: "Layers" }),
  ).toBeVisible();
  const proceduralToggle = layerManager
    .locator(".layer-toggle")
    .filter({ hasText: "Procedural background" });
  const procedural = proceduralToggle.getByRole("checkbox");
  await proceduralToggle.click();
  await expect(procedural).not.toBeChecked();
  await layerManager.getByRole("button", { name: "Close" }).click();
  const objectPanel = page.getByTestId("object-panel");
  await expect(objectPanel).not.toBeVisible();

  await page.getByRole("button", { name: "Time", exact: true }).click();
  const timeController = page.locator(
    "section.time-controller[aria-label='Time']",
  );
  await expect(timeController).toBeVisible();
  await timeController.getByRole("button", { name: "Play" }).click();
  await expect(
    timeController.getByRole("button", { name: "Pause" }),
  ).toBeVisible();
});

test("guided tour can start, pause, resume, navigate, and exit", async ({
  page,
}) => {
  await page.goto("/tours");
  await expect(
    page.getByRole("heading", {
      name: "Guided journeys through evidence and scale",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Start tour" }).first().click();
  await expect(
    page.getByRole("heading", { name: "Our Cosmic Address" }),
  ).toBeVisible();
  await expect(page.locator(".tour-stage canvas")).toBeVisible();
  await page.getByRole("button", { name: "Pause" }).click();
  await expect(page.getByRole("button", { name: "Resume" })).toBeVisible();

  const chapterSelector = page.getByLabel("Select tour chapter");
  await chapterSelector.selectOption("2");
  await expect(chapterSelector).toHaveValue("2");
  await expect(page).toHaveURL(/tour=our-cosmic-address.*chapter=3/);

  await page.getByRole("button", { name: "Resume" }).click();
  const canvas = page.locator(".tour-stage canvas");
  const bounds = await canvas.boundingBox();
  expect(bounds).not.toBeNull();
  if (bounds) {
    await page.mouse.move(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      bounds.x + bounds.width / 2 + 24,
      bounds.y + bounds.height / 2,
    );
    await page.mouse.up();
  }
  await expect(page.getByText(/paused for manual exploration/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Resume" })).toBeVisible();

  await page.getByRole("button", { name: "Next chapter" }).click();
  await expect(page.getByText(/4 \/ 6/)).toBeVisible();
  await page.getByRole("button", { name: /Exit tour/ }).click();
  await expect(
    page.getByRole("heading", {
      name: "Guided journeys through evidence and scale",
    }),
  ).toBeVisible();
});

test("genuine tour completion persists versioned contiguous progress and reload resumes", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === "mobile",
    "One deterministic clock-controlled persistence flow is sufficient.",
  );
  test.setTimeout(90_000);
  await disableWebGL2(page);
  await page.clock.install({ time: new Date("2026-07-30T00:00:00Z") });

  const tour = guidedTours[0];
  await page.goto("/tours");
  const initialCard = page.locator(".tour-card").filter({
    has: page.getByRole("heading", { name: tour.title, exact: true }),
  });
  await initialCard.getByRole("button", { name: "Start tour" }).click();
  let chapterSelector = page.getByLabel("Select tour chapter");
  await expect(chapterSelector).toHaveValue("0");
  await page.getByRole("button", { name: "Pause" }).click();

  await chapterSelector.selectOption("2");
  await expect(chapterSelector).toHaveValue("2");
  await page.clock.runFor(100);
  await expect
    .poll(async () => {
      const state = await readStoredAtlasState(page);
      return state?.tourProgress[tour.id] ?? null;
    })
    .toBeNull();

  await chapterSelector.selectOption("0");
  await page.getByRole("button", { name: "Resume" }).click();
  await page.clock.fastForward((tour.chapters[0].duration.value + 0.25) * 1000);
  await page.clock.runFor(100);

  await expect(chapterSelector).toHaveValue("1");
  await expect(page.getByRole("button", { name: "Resume" })).toBeVisible();
  await expect
    .poll(async () => {
      const state = await readStoredAtlasState(page);
      return {
        version: state?.version,
        progress: state?.tourProgress[tour.id],
      };
    })
    .toEqual({
      version: 2,
      progress: {
        schemaVersion: 1,
        tourId: tour.id,
        tourVersion: tour.version,
        lastCompletedChapterId: tour.chapters[0].id,
        reducedMotion: false,
      },
    });

  await page.evaluate(() => {
    window.history.replaceState({}, "", "/tours");
  });
  await page.reload();
  await page.clock.runFor(250);
  const resumedCard = page.locator(".tour-card").filter({
    has: page.getByRole("heading", { name: tour.title, exact: true }),
  });
  await resumedCard.getByRole("button", { name: "Resume" }).click();
  chapterSelector = page.getByLabel("Select tour chapter");
  await expect(chapterSelector).toHaveValue("1");

  for (
    let chapterIndex = 1;
    chapterIndex < tour.chapters.length;
    chapterIndex += 1
  ) {
    const chapter = tour.chapters[chapterIndex];
    await page.clock.fastForward((chapter.duration.value + 0.25) * 1000);
    await page.clock.runFor(100);
    await expect
      .poll(async () => {
        const state = await readStoredAtlasState(page);
        return state?.tourProgress[tour.id]?.lastCompletedChapterId;
      })
      .toBe(chapter.id);

    if (chapterIndex < tour.chapters.length - 1) {
      await expect(chapterSelector).toHaveValue(String(chapterIndex + 1));
      await expect(page.getByRole("button", { name: "Resume" })).toBeVisible();
      await page.getByRole("button", { name: "Resume" }).click();
    }
  }

  await expect(page.getByText("Tour complete.")).toBeVisible();
  await expect(chapterSelector).toHaveValue(String(tour.chapters.length - 1));
});

test("all bundled tour chapters render through the deterministic fallback", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === "mobile",
    "Desktop performs the bounded all-tour chapter smoke.",
  );
  test.setTimeout(180_000);
  await disableWebGL2(page);

  for (const tour of guidedTours) {
    await page.goto(`/tours?tour=${tour.id}&chapter=1`);
    const chapterSelector = page.getByLabel("Select tour chapter");
    await expect(chapterSelector).toBeVisible({ timeout: 20_000 });
    await expect(
      page.locator('.tour-stage [data-graphics-state="unsupported"]'),
    ).toBeVisible({ timeout: 20_000 });

    for (
      let chapterIndex = 0;
      chapterIndex < tour.chapters.length;
      chapterIndex += 1
    ) {
      if (chapterIndex > 0) {
        await chapterSelector.selectOption(String(chapterIndex));
      }
      await expect(chapterSelector).toHaveValue(String(chapterIndex));
      await expect(page.locator("#tour-chapter-title")).toHaveText(
        tour.chapters[chapterIndex].title,
      );
    }
  }
});

test("catalogue, settings, and local bookmark flow", async ({ page }) => {
  await page.goto("/catalogue");
  await expect(
    page.getByRole("heading", { name: "A navigable scientific reference" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Earth/ }).first().click();
  await page.getByRole("button", { name: "Save object" }).click();
  await page.goto("/saved");
  await expect(
    page.locator(".saved-object-main").filter({ hasText: "Earth" }),
  ).toBeVisible();

  await page.goto("/settings");
  const reducedMotion = page.getByLabel("Reduce motion");
  await reducedMotion.check();
  await expect(reducedMotion).toBeChecked();
  await page.getByLabel("High contrast").check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "contrast");
  await page.reload();
  await expect(page.getByLabel("Reduce motion")).toBeChecked();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "contrast");
});

test("reset removes persisted state and only Atlas-owned caches", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === "mobile",
    "Storage and Cache Storage semantics need one Chromium context.",
  );

  const seededState = {
    version: 2,
    preferences: {
      ...defaultAtlasPreferences,
      theme: "light",
      reducedMotion: true,
    },
    bookmarks: ["earth"],
    recentObjects: ["mars"],
    recentSearches: ["Andromeda"],
    tourProgress: {},
    layerVisibility: { "coordinate-grids": true },
  };
  await page.addInitScript(
    ({ storageKey, state }) => {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    },
    { storageKey: ATLAS_STORAGE_KEY, state: seededState },
  );

  await page.goto("/settings");
  await expect(page.getByLabel("Reduce motion")).toBeChecked();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    const owned = await caches.open("atlas-cosmos-e2e-reset");
    await owned.put("/e2e-owned", new Response("owned"));
    const unrelated = await caches.open("unrelated-e2e-reset");
    await unrelated.put("/e2e-unrelated", new Response("unrelated"));
  });

  await page.getByRole("button", { name: /Reset all local data/ }).click();
  await expect(
    page.getByText("Local Atlas data has been reset."),
  ).toBeVisible();
  await page.waitForTimeout(350);

  const resetResult = await page.evaluate((storageKey) => {
    return Promise.all([
      Promise.resolve(window.localStorage.getItem(storageKey)),
      caches.keys(),
    ]).then(([stored, cacheNames]) => ({ stored, cacheNames }));
  }, ATLAS_STORAGE_KEY);
  expect(resetResult.stored).toBeNull();
  expect(
    resetResult.cacheNames.some((name) => name.startsWith("atlas-cosmos-")),
  ).toBe(false);
  expect(resetResult.cacheNames).toContain("unrelated-e2e-reset");
});

test("automated WCAG AA smoke audit", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name === "mobile",
    "One axe pass is sufficient; mobile layout has separate interaction coverage.",
  );
  await page.goto("/catalogue");
  await expect(
    page.getByRole("heading", { name: "A navigable scientific reference" }),
  ).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const blocking = results.violations.filter(
    (violation) =>
      violation.impact === "critical" || violation.impact === "serious",
  );
  expect(blocking).toEqual([]);
});

test("a warm catalogue route remains available offline", async ({
  browserIssues,
  context,
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === "mobile",
    "One service-worker lifecycle check is sufficient across Chromium viewports.",
  );
  await page.goto("/catalogue");
  await expect(
    page.getByRole("heading", { name: "A navigable scientific reference" }),
  ).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);

  await context.setOffline(true);
  try {
    await page.goto("/catalogue?offline-check=1", {
      waitUntil: "domcontentloaded",
    });
    await expect(
      page.getByRole("heading", { name: "A navigable scientific reference" }),
    ).toBeVisible();
    // Let hydration fetches settle while the network is still offline so
    // every expected RSC failure is observable before review.
    await page.waitForLoadState("networkidle");
  } finally {
    await context.setOffline(false);
  }
  // Whether the service-worker-served document issues RSC hydration fetches
  // while offline is browser-timing-dependent, so no minimum count is
  // asserted. Review strips only the reviewed same-origin RSC failure
  // signature; the automatic fixture still fails the test on any issue that
  // remains unreviewed.
  browserIssues.acknowledgeExpectedOfflineNavigationFailures();
});

test("keyboard canvas controls survive repeated client navigation", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === "mobile",
    "Desktop covers hardware-keyboard input; mobile interaction runs in the critical flow.",
  );
  await page.goto("/");
  const rail = page.locator(".desktop-rail");
  for (let cycle = 0; cycle < 2; cycle += 1) {
    const canvas = page.locator("canvas[role='application']");
    await expect(canvas).toBeVisible({ timeout: 20_000 });
    await canvas.focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("w");
    await expect(canvas).toBeFocused();

    await rail.locator('a[href="/catalogue"]').click();
    await expect(
      page.getByRole("heading", { name: "A navigable scientific reference" }),
    ).toBeVisible();
    await rail.locator('a[href="/"]').click();
    await expect(page.getByTestId("explorer")).toBeVisible({
      timeout: 20_000,
    });
  }
});

test("keyboard focus is contained and object tabs follow the ARIA pattern", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === "mobile",
    "Desktop covers the hardware-keyboard focus contract.",
  );

  await page.goto("/");
  await expect(page.getByTestId("explorer")).toBeVisible({ timeout: 20_000 });
  const navigationTrigger = page.getByRole("button", {
    name: "Open navigation",
  });
  await navigationTrigger.focus();
  await page.keyboard.press("Enter");

  const drawer = page.getByRole("dialog", { name: "Atlas of the Cosmos" });
  const closeNavigation = drawer.getByRole("button", {
    name: "Close navigation",
  });
  await expect(closeNavigation).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  expect(
    await drawer.evaluate((element) =>
      element.contains(document.activeElement),
    ),
  ).toBe(true);
  await page.keyboard.press("Tab");
  await expect(closeNavigation).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(navigationTrigger).toBeFocused();

  const objectPanel = page.getByTestId("object-panel");
  const overviewTab = objectPanel.getByRole("tab", { name: "Overview" });
  const dataTab = objectPanel.getByRole("tab", { name: "Data" });
  await overviewTab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(dataTab).toBeFocused();
  await expect(dataTab).toHaveAttribute("aria-selected", "true");

  const tabPanel = objectPanel.getByRole("tabpanel");
  const tabPanelId = await tabPanel.getAttribute("id");
  const dataTabId = await dataTab.getAttribute("id");
  expect(tabPanelId).toBeTruthy();
  expect(dataTabId).toBeTruthy();
  await expect(dataTab).toHaveAttribute("aria-controls", tabPanelId!);
  await expect(tabPanel).toHaveAttribute("aria-labelledby", dataTabId!);
});

test("WebGL 2 failure exposes the synchronised non-3D fallback", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === "mobile",
    "The graphics fallback is renderer-level and needs one Chromium execution.",
  );
  await disableWebGL2(page);

  await page.goto("/");
  const scene = page.locator('[data-graphics-state="unsupported"]');
  await expect(scene).toBeVisible({ timeout: 20_000 });
  await expect(scene.getByRole("status")).toContainText(
    "does not expose WebGL 2",
  );
  await expect(page.getByTestId("object-panel")).toContainText("Earth");
  await expect(
    page.locator(".desktop-rail").locator('a[href="/catalogue"]'),
  ).toBeVisible();
});

test("@visual desktop catalogue major page", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name === "mobile",
    "Desktop baseline is the deterministic visual reference.",
  );
  await page.goto("/catalogue");
  await expect(
    page.getByRole("heading", { name: "A navigable scientific reference" }),
  ).toBeVisible();
  await expect(page).toHaveScreenshot("catalogue.png", {
    fullPage: true,
    mask: [page.locator(".network-status")],
    maskColor: DARK_MASK,
  });
});

test("@visual explorer object panel, layer manager, and fallback", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === "mobile",
    "The mobile layout has a dedicated visual baseline.",
  );
  await disableWebGL2(page);
  await page.goto("/");
  await expect(
    page.locator('[data-graphics-state="unsupported"]'),
  ).toBeVisible();
  await expect(page.getByTestId("object-panel")).toContainText("Earth");
  await page.getByRole("button", { name: "Layers", exact: true }).click();
  await expect(
    page.locator(".layer-manager").getByRole("heading", { name: "Layers" }),
  ).toBeVisible();
  await expect(page).toHaveScreenshot("explorer-panels-fallback.png", {
    fullPage: false,
    mask: [page.locator(".network-status")],
    maskColor: DARK_MASK,
  });
});

test("@visual guided-tour controls with deterministic fallback", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === "mobile",
    "The mobile layout has a dedicated visual baseline.",
  );
  await disableWebGL2(page);
  await page.goto("/tours");
  await page.getByRole("button", { name: "Start tour" }).first().click();
  await expect(
    page.getByRole("heading", { name: "Our Cosmic Address" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pause" }).click();
  await expect(page.getByRole("button", { name: "Resume" })).toBeVisible();
  await expect(
    page.locator('.tour-stage [data-graphics-state="unsupported"]'),
  ).toBeVisible();
  await expect(page).toHaveScreenshot("tour-controls-fallback.png", {
    fullPage: false,
    mask: [page.locator(".network-status"), page.locator(".tour-timeline")],
    maskColor: DARK_MASK,
  });
});

test("@visual high-contrast and reduced-motion settings", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === "mobile",
    "The mobile layout has a dedicated visual baseline.",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/settings");
  await page.getByLabel("Reduce motion").check();
  await page.getByLabel("High contrast").check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "contrast");
  await expect(page.getByLabel("Reduce motion")).toBeChecked();
  await expect(page).toHaveScreenshot("settings-accessibility-modes.png", {
    fullPage: true,
    mask: [page.locator(".network-status")],
    maskColor: "#000000",
  });
});

test("@visual mobile catalogue layout", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== "mobile",
    "The mobile project owns this responsive baseline.",
  );
  await page.goto("/catalogue");
  await expect(
    page.getByRole("heading", { name: "A navigable scientific reference" }),
  ).toBeVisible();
  await expect(page).toHaveScreenshot("mobile-catalogue.png", {
    fullPage: false,
    mask: [page.locator(".network-status")],
    maskColor: DARK_MASK,
  });
});
