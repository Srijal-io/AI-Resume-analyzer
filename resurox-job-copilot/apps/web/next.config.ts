import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true
  },
  transpilePackages: [
    "@resurox/schemas",
    "@resurox/matching",
    "@resurox/ai",
    "@resurox/db",
    "@resurox/resume"
  ],
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js", ".jsx"],
      ".mjs": [".mts", ".mjs"],
      ".cjs": [".cts", ".cjs"]
    };
    return config;
  }
};

export default nextConfig;
