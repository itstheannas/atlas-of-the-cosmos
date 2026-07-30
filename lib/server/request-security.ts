import { ApiProblem } from "./api-error.ts";

export const MAX_API_REQUEST_BYTES = 16_384;
export const MAX_API_URL_LENGTH = 2_048;

const SAFE_CORRELATION_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SAFE_RESOURCE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function generatedCorrelationId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  const random = new Uint32Array(4);
  globalThis.crypto.getRandomValues(random);
  return Array.from(random, (value) =>
    value.toString(16).padStart(8, "0"),
  ).join("-");
}

export function getCorrelationId(request: Request): string {
  const supplied = request.headers.get("x-correlation-id")?.trim();
  return supplied && SAFE_CORRELATION_ID.test(supplied)
    ? supplied
    : generatedCorrelationId();
}

export function assertSafeGetRequest(request: Request): void {
  if (request.method !== "GET" && request.method !== "HEAD") {
    throw new ApiProblem(
      "METHOD_NOT_ALLOWED",
      "This endpoint only supports GET and HEAD requests.",
    );
  }

  if (request.url.length > MAX_API_URL_LENGTH) {
    throw new ApiProblem("PAYLOAD_TOO_LARGE", "The request is too large.");
  }

  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    if (!/^\d+$/.test(declaredLength)) {
      throw new ApiProblem(
        "BAD_REQUEST",
        "The request contains an invalid Content-Length header.",
      );
    }

    const byteLength = Number(declaredLength);
    if (
      !Number.isSafeInteger(byteLength) ||
      byteLength > MAX_API_REQUEST_BYTES
    ) {
      throw new ApiProblem("PAYLOAD_TOO_LARGE", "The request is too large.");
    }

    if (byteLength > 0) {
      throw new ApiProblem(
        "BAD_REQUEST",
        "GET and HEAD requests must not include a request body.",
      );
    }
  }

  if (request.body !== null) {
    throw new ApiProblem(
      "BAD_REQUEST",
      "GET and HEAD requests must not include a request body.",
    );
  }
}

export function assertResourceId(value: string | undefined): string {
  if (
    value === undefined ||
    value.length > 128 ||
    !SAFE_RESOURCE_ID.test(value)
  ) {
    throw new ApiProblem(
      "INVALID_RESOURCE_ID",
      "The resource identifier is invalid.",
      [
        {
          field: "id",
          issue: "Use a lowercase, hyphen-separated identifier.",
        },
      ],
    );
  }

  return value;
}
