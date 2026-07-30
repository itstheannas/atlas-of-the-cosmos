import {
  expect,
  test as base,
  type ConsoleMessage,
  type Page,
  type Request,
  type Response,
  type TestInfo,
} from "@playwright/test";

export type BrowserIssueKind =
  "console.error" | "pageerror" | "requestfailed" | "http-error";

export interface BrowserIssue {
  readonly kind: BrowserIssueKind;
  readonly detail: string;
  readonly url?: string;
}

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4173";
const applicationOrigin = new URL(baseURL).origin;

/**
 * Browser-engine diagnostics are ignored only when the full stable message
 * matches. Application errors, partial matches, and unfamiliar variants remain
 * release-blocking issues.
 */
const reviewedNonApplicationConsoleErrors = [
  /^\[GroupMarkerNotSet\(crbug\.com\/242999\)![^\]]+\]Automatic fallback to software WebGL has been deprecated\. Please use the --enable-unsafe-swiftshader \(about:flags#enable-unsafe-swiftshader\) flag to opt in to lower security guarantees for trusted content\.$/,
] as const;

function sameOrigin(url: string): boolean {
  try {
    return new URL(url).origin === applicationOrigin;
  } catch {
    return false;
  }
}

function isReviewedConsoleDiagnostic(detail: string): boolean {
  return reviewedNonApplicationConsoleErrors.some((pattern) =>
    pattern.test(detail),
  );
}

export class BrowserIssueCollector {
  readonly #issues: BrowserIssue[] = [];
  readonly #page: Page;

  readonly #onConsole = (message: ConsoleMessage): void => {
    if (message.type() === "error") {
      const detail = message.text();
      if (!isReviewedConsoleDiagnostic(detail)) {
        this.#issues.push({
          kind: "console.error",
          detail,
          ...(message.location().url ? { url: message.location().url } : {}),
        });
      }
    }
  };

  readonly #onPageError = (error: Error): void => {
    this.#issues.push({
      kind: "pageerror",
      detail: `${error.name}: ${error.message}`,
    });
  };

  readonly #onRequestFailed = (request: Request): void => {
    const failure = request.failure();
    this.#issues.push({
      kind: "requestfailed",
      detail: `${request.method()} ${failure?.errorText ?? "request failed"}`,
      url: request.url(),
    });
  };

  readonly #onResponse = (response: Response): void => {
    if (!sameOrigin(response.url()) || response.status() < 400) {
      return;
    }
    this.#issues.push({
      kind: "http-error",
      detail: `${response.request().method()} HTTP ${response.status()}`,
      url: response.url(),
    });
  };

  public constructor(page: Page) {
    this.#page = page;
    page.on("console", this.#onConsole);
    page.on("pageerror", this.#onPageError);
    page.on("requestfailed", this.#onRequestFailed);
    page.on("response", this.#onResponse);
  }

  public get issues(): readonly BrowserIssue[] {
    return this.#issues;
  }

  public acknowledgeExpectedOfflineNavigationFailures(): number {
    const expectedIndexes = new Set<number>();
    this.#issues.forEach((issue, index) => {
      if (!issue.url || !sameOrigin(issue.url)) return;
      const path = new URL(issue.url).pathname;
      const isOfflineRscRequest =
        path === "/.rsc" &&
        ((issue.kind === "requestfailed" &&
          issue.detail === "GET net::ERR_INTERNET_DISCONNECTED") ||
          (issue.kind === "console.error" &&
            issue.detail ===
              "Failed to load resource: net::ERR_INTERNET_DISCONNECTED"));
      if (isOfflineRscRequest) expectedIndexes.add(index);
    });

    if (expectedIndexes.size > 0) {
      const unexpected = this.#issues.filter(
        (_issue, index) => !expectedIndexes.has(index),
      );
      this.#issues.splice(0, this.#issues.length, ...unexpected);
    }
    return expectedIndexes.size;
  }

  public dispose(): void {
    this.#page.off("console", this.#onConsole);
    this.#page.off("pageerror", this.#onPageError);
    this.#page.off("requestfailed", this.#onRequestFailed);
    this.#page.off("response", this.#onResponse);
  }
}

interface BrowserIssueFixtures {
  readonly browserIssues: BrowserIssueCollector;
}

async function attachIssues(
  testInfo: TestInfo,
  issues: readonly BrowserIssue[],
): Promise<void> {
  if (issues.length === 0) return;
  await testInfo.attach("unexpected-browser-issues", {
    body: JSON.stringify(issues, null, 2),
    contentType: "application/json",
  });
}

export const test = base.extend<BrowserIssueFixtures>({
  browserIssues: [
    async ({ page }, use, testInfo) => {
      const collector = new BrowserIssueCollector(page);
      await use(collector);
      collector.dispose();
      await attachIssues(testInfo, collector.issues);
      expect(
        collector.issues,
        `Unexpected browser issues:\n${JSON.stringify(collector.issues, null, 2)}`,
      ).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
