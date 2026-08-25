import type { NextConfig } from "next";

const nextConfig: any = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },

  reactStrictMode: false,
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL;
    if (!backendUrl) {
      throw new Error("BACKEND_URL environment variable is not set!");
    }
    return [
      {
        source: "/api/v1/auth/:path*",
        destination: `${backendUrl}/api/v1/auth/:path*`,
      },
      {
        source: "/api/v1/tenant/:path*",
        destination: `${backendUrl}/api/v1/tenant/:path*`,
      },
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
      {
        source: "/api/v1/agent/simulator",
        destination: `${backendUrl}/api/v1/agent/simulator`,
      },
      {
        source: "/api/v1/agent/simulator/:path*",
        destination: `${backendUrl}/api/v1/agent/simulator/:path*`,
      },
      {
        source: "/api/v1/knowledge",
        destination: `${backendUrl}/api/v1/knowledge`,
      },
      {
        source: "/api/v1/knowledge/:path*",
        destination: `${backendUrl}/api/v1/knowledge/:path*`,
      },
    ];
  },
};

export default nextConfig;
