import type { NextConfig } from "next";
import { getForwardedAssetPrefix } from "./src/lib/runtime/asset-prefix";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  assetPrefix: getForwardedAssetPrefix(
    process.env.VSCODE_PROXY_URI,
    process.env.PORT,
  ),
};

export default nextConfig;
