import { describe, expect, it } from "vitest";
import {
  getForwardedAssetPrefix,
  getForwardedDevOrigins,
} from "./asset-prefix";

describe("getForwardedAssetPrefix", () => {
  it("uses the forwarded path and assigned port without the proxy origin", () => {
    expect(
      getForwardedAssetPrefix(
        "https://coderange.example/proxy/{{port}}/",
        "3000",
      ),
    ).toBe("/proxy/3000");
  });

  it("keeps the default Next.js asset path for local development", () => {
    expect(getForwardedAssetPrefix(undefined, "3000")).toBeUndefined();
  });

  it("uses port 3000 when CodeRange omits PORT", () => {
    expect(
      getForwardedAssetPrefix("https://coderange.example/proxy/{{port}}", undefined),
    ).toBe("/proxy/3000");
  });

  it("uses the configured CodeRange port when available", () => {
    expect(
      getForwardedAssetPrefix("https://coderange.example/proxy/{{port}}", "4173"),
    ).toBe("/proxy/4173");
  });

  it("ignores proxy URIs without a port template", () => {
    expect(
      getForwardedAssetPrefix("https://coderange.example/proxy/3000", "3000"),
    ).toBeUndefined();
  });

  it("allows the forwarded CodeRange hostname for development resources", () => {
    expect(
      getForwardedDevOrigins(
        "https://itent-45-1t-2526-p10.coderange.net/proxy/%7B%7Bport%7D%7D/",
      ),
    ).toEqual(["itent-45-1t-2526-p10.coderange.net"]);
  });

  it("keeps the default development origins for local execution", () => {
    expect(getForwardedDevOrigins(undefined)).toBeUndefined();
    expect(getForwardedDevOrigins("not a URL")).toBeUndefined();
  });
});
