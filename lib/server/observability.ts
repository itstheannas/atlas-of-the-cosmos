import type { ApiErrorCode } from "./api-contracts.ts";

export const SERVER_OPERATION_NAMES = [
  "health",
  "ready",
  "version",
  "catalogue.list",
  "catalogue.object",
  "tours.list",
  "tours.detail",
  "sources.list",
  "sources.detail",
  "openapi",
] as const;

export type ServerOperationName = (typeof SERVER_OPERATION_NAMES)[number];
export type ServerRequestMethod = "GET" | "HEAD" | "OTHER";
export type ServerRequestOutcome =
  "success" | "not-modified" | "client-error" | "server-error";
export type ServerErrorFault = "handled-problem" | "unexpected-exception";

interface ServerEventBase {
  readonly schemaVersion: 1;
  readonly service: "atlas-of-the-cosmos";
  readonly owner: "Annas M. Ishtiaq";
  readonly recordedAt: string;
  readonly operation: ServerOperationName;
  readonly traceId: string;
  readonly spanId: string;
}

export interface ServerRequestMetricEvent extends ServerEventBase {
  readonly kind: "server.request";
  readonly method: ServerRequestMethod;
  readonly statusCode: number;
  readonly outcome: ServerRequestOutcome;
  readonly durationMs: number;
  readonly errorCode?: ApiErrorCode;
}

export interface ServerErrorTrackingEvent extends ServerEventBase {
  readonly kind: "server.error";
  readonly statusCode: number;
  readonly durationMs: number;
  readonly errorCode: ApiErrorCode;
  readonly fault: ServerErrorFault;
}

export interface ServerRequestMetricSink {
  recordRequest(event: ServerRequestMetricEvent): void | Promise<void>;
}

export interface ServerErrorTrackingSink {
  captureError(event: ServerErrorTrackingEvent): void | Promise<void>;
}

export type JsonLineSeverity = "info" | "error";
export type JsonLineWriter = (line: string, severity: JsonLineSeverity) => void;

/**
 * A local structured-log sink. The event types intentionally expose only a
 * fixed, low-cardinality schema, so arbitrary request or exception data
 * cannot be serialized through this adapter.
 */
export class JsonLineServerObservabilitySink
  implements ServerRequestMetricSink, ServerErrorTrackingSink
{
  readonly #write: JsonLineWriter;

  public constructor(write: JsonLineWriter) {
    this.#write = write;
  }

  public recordRequest(event: ServerRequestMetricEvent): void {
    this.#write(JSON.stringify(event), "info");
  }

  public captureError(event: ServerErrorTrackingEvent): void {
    this.#write(JSON.stringify(event), "error");
  }
}

export interface ServerTraceContext {
  readonly traceId: string;
  readonly spanId: string;
  readonly traceFlags: string;
  readonly traceparent: string;
  readonly source: "continued" | "generated";
}

interface ParsedTraceparent {
  readonly traceId: string;
  readonly traceFlags: string;
}

interface ServerObservabilityClock {
  readonly now: () => Date;
  readonly monotonicNow: () => number;
}

export interface ServerObservabilityOptions {
  readonly requestMetricSink: ServerRequestMetricSink;
  readonly errorTrackingSink: ServerErrorTrackingSink;
  readonly clock?: ServerObservabilityClock;
}

export interface ServerRequestCompletion {
  readonly statusCode: number;
  readonly errorCode?: ApiErrorCode;
  readonly fault?: ServerErrorFault;
}

export interface ServerRequestMeasurement {
  readonly durationMs: number;
  readonly serverTiming: string;
}

const TRACEPARENT = /^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/i;
const ZERO_TRACE_ID = "00000000000000000000000000000000";
const ZERO_SPAN_ID = "0000000000000000";

function parseTraceparent(value: string | null): ParsedTraceparent | null {
  if (!value) return null;
  const match = TRACEPARENT.exec(value.trim());
  if (
    !match ||
    match[1].toLowerCase() === ZERO_TRACE_ID ||
    match[2].toLowerCase() === ZERO_SPAN_ID
  ) {
    return null;
  }
  return {
    traceId: match[1].toLowerCase(),
    traceFlags: match[3].toLowerCase(),
  };
}

function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join(
    "",
  );
}

export function createServerTraceContext(request: Request): ServerTraceContext {
  const incoming = parseTraceparent(request.headers.get("traceparent"));
  const traceId = incoming?.traceId ?? randomHex(16);
  const spanId = randomHex(8);
  const traceFlags = incoming?.traceFlags ?? "00";

  return {
    traceId,
    spanId,
    traceFlags,
    traceparent: `00-${traceId}-${spanId}-${traceFlags}`,
    source: incoming ? "continued" : "generated",
  };
}

function safeMethod(method: string): ServerRequestMethod {
  if (method === "GET" || method === "HEAD") return method;
  return "OTHER";
}

function requestOutcome(statusCode: number): ServerRequestOutcome {
  if (statusCode === 304) return "not-modified";
  if (statusCode >= 500) return "server-error";
  if (statusCode >= 400) return "client-error";
  return "success";
}

function roundedDuration(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value * 100) / 100;
}

function emitWithoutBreakingRequests(
  emission: () => void | Promise<void>,
): void {
  try {
    const result = emission();
    if (result instanceof Promise) {
      void result.catch(() => undefined);
    }
  } catch {
    // Observability must never change an API response or make it unavailable.
  }
}

export class ServerRequestObservation {
  public readonly trace: ServerTraceContext;

  readonly #operation: ServerOperationName;
  readonly #method: ServerRequestMethod;
  readonly #startedAt: number;
  readonly #clock: ServerObservabilityClock;
  readonly #requestMetricSink: ServerRequestMetricSink;
  readonly #errorTrackingSink: ServerErrorTrackingSink;
  #measurement: ServerRequestMeasurement | null = null;

  public constructor(
    request: Request,
    operation: ServerOperationName,
    options: Required<ServerObservabilityOptions>,
  ) {
    this.trace = createServerTraceContext(request);
    this.#operation = operation;
    this.#method = safeMethod(request.method);
    this.#clock = options.clock;
    this.#requestMetricSink = options.requestMetricSink;
    this.#errorTrackingSink = options.errorTrackingSink;
    this.#startedAt = this.#clock.monotonicNow();
  }

  public finish(completion: ServerRequestCompletion): ServerRequestMeasurement {
    if (this.#measurement) return this.#measurement;

    const durationMs = roundedDuration(
      this.#clock.monotonicNow() - this.#startedAt,
    );
    this.#measurement = {
      durationMs,
      serverTiming: `app;dur=${durationMs.toFixed(2)}`,
    };
    const recordedAt = this.#clock.now().toISOString();
    const base = {
      schemaVersion: 1 as const,
      service: "atlas-of-the-cosmos" as const,
      owner: "Annas M. Ishtiaq" as const,
      recordedAt,
      operation: this.#operation,
      traceId: this.trace.traceId,
      spanId: this.trace.spanId,
    };
    const requestEvent: ServerRequestMetricEvent = {
      ...base,
      kind: "server.request",
      method: this.#method,
      statusCode: completion.statusCode,
      outcome: requestOutcome(completion.statusCode),
      durationMs,
      ...(completion.errorCode ? { errorCode: completion.errorCode } : {}),
    };
    emitWithoutBreakingRequests(() =>
      this.#requestMetricSink.recordRequest(requestEvent),
    );

    if (completion.statusCode >= 500 && completion.errorCode) {
      const errorEvent: ServerErrorTrackingEvent = {
        ...base,
        kind: "server.error",
        statusCode: completion.statusCode,
        durationMs,
        errorCode: completion.errorCode,
        fault: completion.fault ?? "handled-problem",
      };
      emitWithoutBreakingRequests(() =>
        this.#errorTrackingSink.captureError(errorEvent),
      );
    }

    return this.#measurement;
  }
}

export class ServerObservability {
  readonly #options: Required<ServerObservabilityOptions>;

  public constructor(options: ServerObservabilityOptions) {
    this.#options = {
      ...options,
      clock: options.clock ?? {
        now: () => new Date(),
        monotonicNow: () => performance.now(),
      },
    };
  }

  public begin(
    request: Request,
    operation: ServerOperationName,
  ): ServerRequestObservation {
    return new ServerRequestObservation(request, operation, this.#options);
  }
}

const localJsonLineSink = new JsonLineServerObservabilitySink(
  (line, severity) => {
    if (severity === "error") {
      console.error(line);
      return;
    }
    console.info(line);
  },
);

export const defaultServerObservability = new ServerObservability({
  requestMetricSink: localJsonLineSink,
  errorTrackingSink: localJsonLineSink,
});
