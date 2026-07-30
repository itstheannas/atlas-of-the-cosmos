import type { FullConfig } from "@playwright/test";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  type WriteStream,
} from "node:fs";
import { resolve } from "node:path";

const DEFAULT_BASE_URL = "http://127.0.0.1:4173";
const HEALTH_PATH = "/api/v1/health";
const START_TIMEOUT_MS = 120_000;
const STOP_TIMEOUT_MS = 5_000;

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolveDelay) => {
    setTimeout(resolveDelay, milliseconds);
  });
}

async function isHealthy(baseURL: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseURL}${HEALTH_PATH}`);
    return response.ok;
  } catch {
    return false;
  }
}

function stopProcessTree(child: ChildProcess): void {
  if (!child.pid || child.exitCode !== null) return;
  if (process.platform === "win32") {
    spawnSync("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }
  child.kill("SIGINT");
}

async function awaitExit(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null) return;
  await Promise.race([
    new Promise<void>((resolveExit) => {
      child.once("exit", () => resolveExit());
    }),
    delay(STOP_TIMEOUT_MS),
  ]);
  if (child.exitCode === null) child.kill("SIGKILL");
}

function closeLog(log: WriteStream): Promise<void> {
  return new Promise((resolveClose) => {
    log.end(resolveClose);
  });
}

export default async function globalSetup(
  _config: FullConfig,
): Promise<() => Promise<void>> {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? DEFAULT_BASE_URL;
  if (await isHealthy(baseURL)) {
    return async () => {};
  }

  const workspace = process.cwd();
  const wranglerCli = resolve(
    workspace,
    "node_modules/wrangler/bin/wrangler.js",
  );
  const wranglerConfig = resolve(workspace, "dist/server/wrangler.json");
  if (!existsSync(wranglerCli) || !existsSync(wranglerConfig)) {
    throw new Error(
      "Built Worker prerequisites are missing. Run `npm run build` before Playwright.",
    );
  }

  const outputs = resolve(workspace, "outputs");
  const wranglerState = resolve(workspace, ".wrangler");
  for (const directory of [
    outputs,
    resolve(wranglerState, "qa-cache"),
    resolve(wranglerState, "qa-config"),
    resolve(wranglerState, "qa-logs"),
    resolve(wranglerState, "qa-registry"),
  ]) {
    mkdirSync(directory, { recursive: true });
  }

  const logPath = resolve(outputs, "wrangler-qa.log");
  const log = createWriteStream(logPath, { flags: "w" });
  const child = spawn(
    process.execPath,
    [
      wranglerCli,
      "dev",
      "--config",
      wranglerConfig,
      "--ip",
      "127.0.0.1",
      "--port",
      new URL(baseURL).port || "4173",
    ],
    {
      cwd: workspace,
      env: {
        ...process.env,
        MINIFLARE_REGISTRY_PATH: resolve(wranglerState, "qa-registry"),
        WRANGLER_LOG_PATH: resolve(wranglerState, "qa-logs"),
        WRANGLER_SEND_METRICS: "false",
        XDG_CACHE_HOME: resolve(wranglerState, "qa-cache"),
        XDG_CONFIG_HOME: resolve(wranglerState, "qa-config"),
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );
  child.stdout?.pipe(log, { end: false });
  child.stderr?.pipe(log, { end: false });

  let spawnError: Error | undefined;
  child.once("error", (error) => {
    spawnError = error;
  });

  const deadline = Date.now() + START_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (spawnError) {
      await closeLog(log);
      throw spawnError;
    }
    if (child.exitCode !== null) {
      await closeLog(log);
      const output = readFileSync(logPath, "utf8");
      throw new Error(
        `Wrangler preview exited with code ${child.exitCode}.\n${output}`,
      );
    }
    if (await isHealthy(baseURL)) {
      return async () => {
        stopProcessTree(child);
        await awaitExit(child);
        await closeLog(log);
      };
    }
    await delay(250);
  }

  stopProcessTree(child);
  await awaitExit(child);
  await closeLog(log);
  const output = readFileSync(logPath, "utf8");
  throw new Error(
    `Wrangler preview did not become healthy within ${START_TIMEOUT_MS} ms.\n${output}`,
  );
}
