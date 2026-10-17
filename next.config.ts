import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Reuse a visited dynamic page for 30s in this browser only. Server actions
  // still call revalidatePath, which drops that entry after a mutation.
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  turbopack: {
    root: path.join(__dirname),
  },
  // Lets the dev server accept requests when opened from another device on
  // the LAN (e.g. testing PWA install on a phone) instead of just localhost.
  allowedDevOrigins: ["192.168.1.41"],
};

export default nextConfig;
