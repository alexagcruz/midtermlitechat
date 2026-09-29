import "@testing-library/jest-dom/vitest";
import { webcrypto } from "node:crypto";

Object.defineProperty(globalThis, "crypto", {
  configurable: true,
  value: webcrypto,
});

Object.defineProperty(globalThis.navigator, "locks", {
  configurable: true,
  value: {
    request: (_name: string, operation: () => Promise<unknown>) => operation(),
  },
});
