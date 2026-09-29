export function getForwardedAssetPrefix(
  proxyUri: string | undefined,
  port: string | undefined,
): string | undefined {
  if (!proxyUri || !port) return undefined;

  try {
    const proxyPath = new URL(proxyUri).pathname;
    const portTemplate = /\{\{port\}\}|%7B%7Bport%7D%7D/i;
    if (!portTemplate.test(proxyPath)) return undefined;

    return proxyPath
      .replace(/\{\{port\}\}|%7B%7Bport%7D%7D/gi, encodeURIComponent(port))
      .replace(/\/+$/, "");
  } catch {
    return undefined;
  }
}
