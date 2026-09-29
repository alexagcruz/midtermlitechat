export type ProxyFailureCode =
  | "CONFIGURATION"
  | "AUTHENTICATION"
  | "RATE_LIMITED"
  | "REQUEST_REJECTED"
  | "INVALID_RESPONSE"
  | "TIMEOUT"
  | "UNAVAILABLE";

const SAFE_FAILURES: Record<ProxyFailureCode, { status: number; message: string }> = {
  CONFIGURATION: {
    status: 503,
    message: "This proxy route is not configured on the server.",
  },
  AUTHENTICATION: {
    status: 502,
    message: "The proxy did not accept the server credentials for this route.",
  },
  RATE_LIMITED: {
    status: 429,
    message: "The proxy is busy. Wait a moment, then try again.",
  },
  REQUEST_REJECTED: {
    status: 502,
    message: "The proxy could not process this request.",
  },
  INVALID_RESPONSE: {
    status: 502,
    message: "The proxy returned a response the app could not read.",
  },
  TIMEOUT: {
    status: 504,
    message: "The proxy took too long to respond. You can try again.",
  },
  UNAVAILABLE: {
    status: 502,
    message: "The proxy is temporarily unavailable. You can try again.",
  },
};

export class ProxyFailure extends Error {
  readonly status: number;
  readonly safeMessage: string;

  constructor(readonly code: ProxyFailureCode) {
    const safeFailure = SAFE_FAILURES[code];
    super(safeFailure.message);
    this.name = "ProxyFailure";
    this.status = safeFailure.status;
    this.safeMessage = safeFailure.message;
  }
}
