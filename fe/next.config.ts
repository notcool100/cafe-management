import type { NextConfig } from "next";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4100";

const buildRemotePatterns = (): NonNullable<
  NextConfig["images"]
>["remotePatterns"] => {
  const patterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [];

  try {
    const parsed = new URL(apiBaseUrl);
    const protocol = parsed.protocol === "https:" ? "https" : "http";
    const port = parsed.port || undefined;
    patterns.push({
      protocol,
      hostname: parsed.hostname,
      ...(port ? { port } : {}),
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
