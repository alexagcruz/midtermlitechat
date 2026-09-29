import { describe, expect, it } from "vitest";
import { getForwardedAssetPrefix } from "./asset-prefix";

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
    expect(
      getForwardedAssetPrefix("https://coderange.example/proxy/{{port}}", undefined),
    ).toBeUndefined();
  });

  it("ignores proxy URIs without a port template", () => {
    expect(
      getForwardedAssetPrefix("https://coderange.example/proxy/3000", "3000"),
    ).toBeUndefined();
  });
});
