import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  async rewrites() {
    return [
      {
        source: "/api/v1/waha/:path*",
        destination: "http://localhost:3000/api/v1/waha/:path*",
      },
      {
        source: "/api/v1/channel-accounts",
        destination: "http://localhost:3000/api/v1/channel-accounts",
      },
      {
        source: "/api/v1/channel-accounts/:path*",
        destination: "http://localhost:3000/api/v1/channel-accounts/:path*",
      },
      {
        source: "/api/v1/chats",
        destination: "http://localhost:3000/api/v1/chats",
      },
      {
        source: "/api/v1/chats/:path*",
        destination: "http://localhost:3000/api/v1/chats/:path*",
      },
    ];
  },
};

export default nextConfig;
