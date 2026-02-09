import type { NextConfig } from "next";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4100";

const buildRemotePatterns = () => {
  const patterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [];

  try {
    const parsed = new URL(apiBaseUrl);
    patterns.push({
      protocol: parsed.protocol.replace(":", ""),
      hostname: parsed.hostname,
      port: parsed.port || "",
      pathname: "/**",
    });
  } catch {
    // Ignore invalid URL; fallback patterns below.
  }

  // Local dev fallback
  patterns.push(
    {
      protocol: "http",
      hostname: "localhost",
      port: "4100",
      pathname: "/**",
    },
    {
      protocol: "http",
      hostname: "127.0.0.1",
      port: "4100",
      pathname: "/**",
    }
  );

  return patterns;
};

const nextConfig: NextConfig = {
  images: {
    remotePatterns: buildRemotePatterns(),
  },
};

export default nextConfig;
