import type { NextConfig } from "next";

const apiProxyUrl = (process.env.BUDGETFLOW_API_PROXY_URL ?? "http://localhost:4000/api").replace(/\/$/, "");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiProxyUrl}/:path*`
      }
    ];
  }
};

export default nextConfig;
