/** Typed error surfaced by the HTTP interceptor for any non-2xx response. */
export interface FieldError {
  field: string;
  code: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly detail: string,
    readonly traceId?: string,
    readonly errors?: FieldError[],
    /** Seconds from the `Retry-After` header on a 429 -- undefined for every other status. */
    readonly retryAfterSeconds?: number,
  ) {
    super(detail);
    this.name = 'ApiError';
  }
}
