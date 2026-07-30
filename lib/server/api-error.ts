import type { ApiErrorCode, ApiErrorDetail } from "./api-contracts.ts";

const ERROR_STATUS_CODES: Readonly<Record<ApiErrorCode, number>> = {
  BAD_REQUEST: 400,
  INVALID_QUERY: 400,
  INVALID_CURSOR: 400,
  CURSOR_MISMATCH: 400,
  INVALID_RESOURCE_ID: 400,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  PAYLOAD_TOO_LARGE: 413,
  RATE_LIMITED: 429,
  SERVICE_UNAVAILABLE: 503,
  INTERNAL_ERROR: 500,
};

export class ApiProblem extends Error {
  public readonly code: ApiErrorCode;
  public readonly status: number;
  public readonly details?: readonly ApiErrorDetail[];

  public constructor(
    code: ApiErrorCode,
    message: string,
    details?: readonly ApiErrorDetail[],
  ) {
    super(message);
    this.name = "ApiProblem";
    this.code = code;
    this.status = ERROR_STATUS_CODES[code];
    this.details = details;
  }
}

export function invalidField(
  field: string,
  issue: string,
  code: ApiErrorCode = "INVALID_QUERY",
): ApiProblem {
  return new ApiProblem(code, "The request contains invalid input.", [
    { field, issue },
  ]);
}
