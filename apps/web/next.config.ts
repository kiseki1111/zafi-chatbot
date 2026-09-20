import type { NextConfig } from "next";

const nextConfig: any = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },

  reactStrictMode: false,
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:3005";
    return [
      {
        source: "/uploads/:path*",
        destination: `${backendUrl}/uploads/:path*`,
      },
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
      {
        source: "/api/v1/availability",
        destination: `${backendUrl}/api/v1/availability`,
      },
      {
        source: "/api/v1/availability/:path*",
        destination: `${backendUrl}/api/v1/availability/:path*`,
      },
      {
        source: "/api/v1/followup",
        destination: `${backendUrl}/api/v1/followup`,
      },
      {
        source: "/api/v1/followup/:path*",
        destination: `${backendUrl}/api/v1/followup/:path*`,
      },
      {
        source: "/api/v1/contacts",
        destination: `${backendUrl}/api/v1/contacts`,
      },
      {
        source: "/api/v1/contacts/:path*",
        destination: `${backendUrl}/api/v1/contacts/:path*`,
      },
    ];
  },
};

export default nextConfig;
