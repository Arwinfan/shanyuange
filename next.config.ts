import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
const localApiOrigin = process.env.NEXT_DEV_API_ORIGIN || "http://127.0.0.1:8788";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async rewrites() {
    if (!isDev) return [];

    return [
      {
        source: "/api/:path*",
        destination: `${localApiOrigin.replace(/\/$/, "")}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
