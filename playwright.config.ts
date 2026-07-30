import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

const edgePath =
  process.platform === "win32"
    ? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
    : undefined;
const executablePath =
  process.env.PLAYWRIGHT_EXECUTABLE_PATH ??
  (edgePath && existsSync(edgePath) ? edgePath : undefined);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4173";

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 45_000,
  expect: {
    timeout: 8_000,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.08,
      animations: "disabled",
    },
  },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { outputFolder: "outputs/playwright-report", open: "never" }],
  ],
  outputDir: "outputs/playwright-artifacts",
  snapshotPathTemplate: "{testDir}/__screenshots__/{arg}{ext}",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // Keep the suite runnable with a system Chromium/Edge installation. Playwright
    // video capture requires its separately downloaded ffmpeg binary; traces and
    // failure screenshots provide equivalent release-debug evidence here.
    video: "off",
    launchOptions: {
      ...(executablePath ? { executablePath } : {}),
      args: ["--enable-precise-memory-info"],
    },
  },
  projects: [
    {
      name: "desktop",
      grepInvert: /@mobile-landscape/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "mobile",
      grepInvert: /@mobile-landscape/,
      use: { ...devices["Pixel 7"], viewport: { width: 412, height: 915 } },
    },
    {
      name: "mobile-landscape",
      grep: /@mobile-landscape/,
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 800, height: 430 },
      },
    },
  ],
});
