"use client";

export type AtlasDiagnosticKind =
  "navigation" | "web-vital" | "long-task" | "renderer" | "coded-error";

export interface AtlasDiagnosticEvent {
  readonly kind: AtlasDiagnosticKind;
  readonly name: string;
  readonly value: number;
  readonly unit: "ms" | "score" | "fps" | "count";
  readonly recordedAt: string;
}

export interface AtlasDiagnosticsSnapshot {
  readonly schemaVersion: 1;
  readonly privacyMode: "local-only-no-identifiers";
  readonly maximumEntries: number;
  readonly events: readonly AtlasDiagnosticEvent[];
}

interface LayoutShiftEntry extends PerformanceEntry {
  readonly value: number;
  readonly hadRecentInput: boolean;
}

interface DurationEntry extends PerformanceEntry {
  readonly duration: number;
  readonly interactionId?: number;
}

declare global {
  interface Window {
    /**
     * A bounded, local diagnostic snapshot for support and release checks.
     * It contains numeric timings and stable metric names only.
     */
    __ATLAS_DIAGNOSTICS__?: AtlasDiagnosticsSnapshot;
  }
}

const SAFE_METRIC_NAME = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;

export class AtlasDiagnosticBuffer {
  readonly #maximumEntries: number;
  readonly #events: AtlasDiagnosticEvent[] = [];

  public constructor(maximumEntries = 64) {
    if (
      !Number.isInteger(maximumEntries) ||
      maximumEntries < 1 ||
      maximumEntries > 256
    ) {
      throw new RangeError(
        "Diagnostic buffer size must be an integer from 1 through 256.",
      );
    }
    this.#maximumEntries = maximumEntries;
  }

  public record(
    event: Omit<AtlasDiagnosticEvent, "recordedAt">,
    now = new Date(),
  ): boolean {
    if (
      !SAFE_METRIC_NAME.test(event.name) ||
      !Number.isFinite(event.value) ||
      !Number.isFinite(now.getTime())
    ) {
      return false;
    }
    this.#events.push({
      ...event,
      value: Math.round(event.value * 100) / 100,
      recordedAt: now.toISOString(),
    });
    if (this.#events.length > this.#maximumEntries) {
      this.#events.splice(0, this.#events.length - this.#maximumEntries);
    }
    return true;
  }

  public snapshot(): AtlasDiagnosticsSnapshot {
    return {
      schemaVersion: 1,
      privacyMode: "local-only-no-identifiers",
      maximumEntries: this.#maximumEntries,
      events: this.#events.map((event) => ({ ...event })),
    };
  }
}

const diagnostics = new AtlasDiagnosticBuffer();
let monitoringCleanup: (() => void) | null = null;

function publishSnapshot(): void {
  if (typeof window !== "undefined") {
    window.__ATLAS_DIAGNOSTICS__ = diagnostics.snapshot();
  }
}

export function recordAtlasDiagnostic(
  event: Omit<AtlasDiagnosticEvent, "recordedAt">,
): void {
  if (diagnostics.record(event)) publishSnapshot();
}

export function reportCodedClientError(code: string): void {
  recordAtlasDiagnostic({
    kind: "coded-error",
    name: code,
    value: 1,
    unit: "count",
  });
}

function observeEntryType(
  type: string,
  callback: (entries: readonly PerformanceEntry[]) => void,
): PerformanceObserver | null {
  if (
    typeof PerformanceObserver === "undefined" ||
    !PerformanceObserver.supportedEntryTypes.includes(type)
  ) {
    return null;
  }
  const observer = new PerformanceObserver((list) => {
    callback(list.getEntries());
  });
  observer.observe({ type, buffered: true });
  return observer;
}

/**
 * Starts a local-only Web Vitals and long-task recorder. It intentionally
 * records no URL, route, query, DOM text, device identifier, or network
 * destination, and it never transmits the resulting buffer.
 */
export function startClientPerformanceMonitoring(): () => void {
  if (typeof window === "undefined") return () => undefined;
  if (monitoringCleanup) return monitoringCleanup;

  const observers: PerformanceObserver[] = [];
  const navigation = performance.getEntriesByType("navigation")[0] as
    PerformanceNavigationTiming | undefined;
  if (navigation) {
    recordAtlasDiagnostic({
      kind: "navigation",
      name: "dom-content-loaded",
      value: navigation.domContentLoadedEventEnd,
      unit: "ms",
    });
    recordAtlasDiagnostic({
      kind: "navigation",
      name: "load-event",
      value: navigation.loadEventEnd,
      unit: "ms",
    });
  }

  const lcpObserver = observeEntryType(
    "largest-contentful-paint",
    (entries) => {
      const latest = entries.at(-1);
      if (!latest) return;
      recordAtlasDiagnostic({
        kind: "web-vital",
        name: "LCP",
        value: latest.startTime,
        unit: "ms",
      });
    },
  );
  if (lcpObserver) observers.push(lcpObserver);

  let cumulativeLayoutShift = 0;
  const layoutObserver = observeEntryType("layout-shift", (entries) => {
    for (const entry of entries as readonly LayoutShiftEntry[]) {
      if (!entry.hadRecentInput) cumulativeLayoutShift += entry.value;
    }
    recordAtlasDiagnostic({
      kind: "web-vital",
      name: "CLS",
      value: cumulativeLayoutShift,
      unit: "score",
    });
  });
  if (layoutObserver) observers.push(layoutObserver);

  let interactionLatency = 0;
  const eventObserver = observeEntryType("event", (entries) => {
    for (const entry of entries as readonly DurationEntry[]) {
      if ((entry.interactionId ?? 0) > 0) {
        interactionLatency = Math.max(interactionLatency, entry.duration);
      }
    }
    if (interactionLatency > 0) {
      recordAtlasDiagnostic({
        kind: "web-vital",
        name: "INP-candidate",
        value: interactionLatency,
        unit: "ms",
      });
    }
  });
  if (eventObserver) observers.push(eventObserver);

  const longTaskObserver = observeEntryType("longtask", (entries) => {
    for (const entry of entries) {
      recordAtlasDiagnostic({
        kind: "long-task",
        name: "main-thread-block",
        value: entry.duration,
        unit: "ms",
      });
    }
  });
  if (longTaskObserver) observers.push(longTaskObserver);

  publishSnapshot();
  monitoringCleanup = () => {
    observers.forEach((observer) => observer.disconnect());
    monitoringCleanup = null;
  };
  return monitoringCleanup;
}

export function readAtlasDiagnostics(): AtlasDiagnosticsSnapshot {
  return diagnostics.snapshot();
}
