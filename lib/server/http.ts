import { API_META, type ApiFailure, type ApiSuccess } from "./api-contracts.ts";
import { ApiProblem } from "./api-error.ts";
import {
  createEtag,
  NO_STORE_CACHE,
  requestAcceptsEtag,
  type CachePolicy,
} from "./cache.ts";
import { consumeApiRateLimit, type RateLimitDecision } from "./rate-limit.ts";
import { assertSafeGetRequest, getCorrelationId } from "./request-security.ts";
import {
  defaultServerObservability,
  type ServerObservability,
  type ServerOperationName,
  type ServerRequestObservation,
} from "./observability.ts";

export interface ApiRequestContext {
  readonly correlationId: string;
  readonly url: URL;
}

export interface ApiOperationResult<T> {
  readonly data: T;
  readonly status?: number;
}

export interface ApiGetOptions {
  readonly cache: CachePolicy;
  readonly operation: ServerOperationName;
  readonly rateLimit?: boolean;
  readonly envelope?: boolean;
  readonly observability?: ServerObservability;
}

function baseHeaders(correlationId: string): Headers {
  return new Headers({
    "content-type": "application/json; charset=utf-8",
    "x-content-type-options": "nosniff",
    "x-correlation-id": correlationId,
  });
}

function applyRateLimitHeaders(
  headers: Headers,
  decision: RateLimitDecision | undefined,
): void {
  if (!decision) return;
  headers.set("ratelimit-limit", String(decision.limit));
  headers.set("ratelimit-remaining", String(decision.remaining));
  headers.set("ratelimit-reset", String(decision.resetAtEpochSeconds));
  if (!decision.allowed) {
    headers.set("retry-after", String(decision.retryAfterSeconds));
  }
}

function failureResponse(
  problem: ApiProblem,
  correlationId: string,
  requestMethod: string,
  observation: ServerRequestObservation,
  fault: "handled-problem" | "unexpected-exception",
  decision?: RateLimitDecision,
): Response {
  const payload: ApiFailure = {
    error: {
      code: problem.code,
      message: problem.message,
      correlationId,
      ...(problem.details ? { details: problem.details } : {}),
    },
    meta: API_META,
  };
  const headers = baseHeaders(correlationId);
  headers.set("cache-control", NO_STORE_CACHE.cacheControl);
  if (problem.code === "METHOD_NOT_ALLOWED") {
    headers.set("allow", "GET, HEAD");
  }
  applyRateLimitHeaders(headers, decision);
  const measurement = observation.finish({
    statusCode: problem.status,
    errorCode: problem.code,
    fault,
  });
  headers.set("traceparent", observation.trace.traceparent);
  headers.set("server-timing", measurement.serverTiming);

  return new Response(
    requestMethod === "HEAD" ? null : JSON.stringify(payload),
    {
      status: problem.status,
      headers,
    },
  );
}

function internalFailureResponse(
  correlationId: string,
  requestMethod: string,
  observation: ServerRequestObservation,
  decision?: RateLimitDecision,
): Response {
  return failureResponse(
    new ApiProblem(
      "INTERNAL_ERROR",
      "The service could not complete the request.",
    ),
    correlationId,
    requestMethod,
    observation,
    "unexpected-exception",
    decision,
  );
}

export async function executeApiGet<T>(
  request: Request,
  operation: (
    context: ApiRequestContext,
  ) => ApiOperationResult<T> | Promise<ApiOperationResult<T>>,
  options: ApiGetOptions,
): Promise<Response> {
  const correlationId = getCorrelationId(request);
  const observation = (
    options.observability ?? defaultServerObservability
  ).begin(request, options.operation);
  let rateLimitDecision: RateLimitDecision | undefined;

  try {
    assertSafeGetRequest(request);

    if (options.rateLimit !== false) {
      rateLimitDecision = consumeApiRateLimit(request);
      if (!rateLimitDecision.allowed) {
        throw new ApiProblem(
          "RATE_LIMITED",
          "Too many requests. Try again after the indicated delay.",
        );
      }
    }

    const result = await operation({
      correlationId,
      url: new URL(request.url),
    });
    const payload: ApiSuccess<T> | T =
      options.envelope === false
        ? result.data
        : {
            data: result.data,
            meta: API_META,
          };
    const serializedBody = JSON.stringify(payload);
    const headers = baseHeaders(correlationId);
    headers.set("cache-control", options.cache.cacheControl);
    headers.set("vary", "Accept-Encoding");
    applyRateLimitHeaders(headers, rateLimitDecision);

    if (options.cache.etag) {
      const etag = await createEtag(serializedBody);
      headers.set("etag", etag);
      if (requestAcceptsEtag(request.headers.get("if-none-match"), etag)) {
        headers.delete("content-type");
        const measurement = observation.finish({ statusCode: 304 });
        headers.set("traceparent", observation.trace.traceparent);
        headers.set("server-timing", measurement.serverTiming);
        return new Response(null, { status: 304, headers });
      }
    }

    const statusCode = result.status ?? 200;
    const measurement = observation.finish({ statusCode });
    headers.set("traceparent", observation.trace.traceparent);
    headers.set("server-timing", measurement.serverTiming);
    return new Response(request.method === "HEAD" ? null : serializedBody, {
      status: statusCode,
      headers,
    });
  } catch (error) {
    if (error instanceof ApiProblem) {
      return failureResponse(
        error,
        correlationId,
        request.method,
        observation,
        "handled-problem",
        rateLimitDecision,
      );
    }

    return internalFailureResponse(
      correlationId,
      request.method,
      observation,
      rateLimitDecision,
    );
  }
}
