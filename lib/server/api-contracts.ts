export const API_VERSION = "v1" as const;
export const API_CONTRACT_VERSION = "1.0.0" as const;

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "INVALID_QUERY"
  | "INVALID_CURSOR"
  | "CURSOR_MISMATCH"
  | "INVALID_RESOURCE_ID"
  | "NOT_FOUND"
  | "METHOD_NOT_ALLOWED"
  | "PAYLOAD_TOO_LARGE"
  | "RATE_LIMITED"
  | "SERVICE_UNAVAILABLE"
  | "INTERNAL_ERROR";

export interface ApiErrorDetail {
  readonly field: string;
  readonly issue: string;
}

export interface ApiMeta {
  readonly apiVersion: typeof API_VERSION;
  readonly contractVersion: typeof API_CONTRACT_VERSION;
}

export interface ApiSuccess<T> {
  readonly data: T;
  readonly meta: ApiMeta;
}

export interface ApiFailure {
  readonly error: {
    readonly code: ApiErrorCode;
    readonly message: string;
    readonly correlationId: string;
    readonly details?: readonly ApiErrorDetail[];
  };
  readonly meta: ApiMeta;
}

export interface CursorPage {
  readonly limit: number;
  readonly returned: number;
  readonly total: number;
  readonly nextCursor: string | null;
}

export const API_META: ApiMeta = {
  apiVersion: API_VERSION,
  contractVersion: API_CONTRACT_VERSION,
};
