import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: false,
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL ?? "http://localhost:3030";
    return [
      {
        source: "/api/v1/waha/:path*",
        destination: `${backendUrl}/api/v1/waha/:path*`,
      },
      {
        source: "/api/v1/channel-accounts",
        destination: `${backendUrl}/api/v1/channel-accounts`,
      },
      {
        source: "/api/v1/channel-accounts/:path*",
        destination: `${backendUrl}/api/v1/channel-accounts/:path*`,
      },
      {
        source: "/api/v1/chats",
        destination: `${backendUrl}/api/v1/chats`,
      },
      {
        source: "/api/v1/chats/:path*",
        destination: `${backendUrl}/api/v1/chats/:path*`,
      },
    ];
  },
};

export default nextConfig;
