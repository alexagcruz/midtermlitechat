import type { NextConfig } from "next";
import {
  getForwardedAssetPrefix,
  getForwardedDevOrigins,
} from "./src/lib/runtime/asset-prefix";

const proxyUri = process.env.VSCODE_PROXY_URI;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: getForwardedDevOrigins(proxyUri),
  assetPrefix: getForwardedAssetPrefix(proxyUri, process.env.PORT),
};

export default nextConfig;
