import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const careerAgentOrigin =
  process.env.CAREERAGENT_URL || "http://127.0.0.1:8000";
const jobEngineOrigin =
  process.env.JOB_ENGINE_URL || "http://127.0.0.1:8001";

const nextConfig: NextConfig = {
  // Produce a self-contained server bundle for Docker — only used files are
  // included; no node_modules needed at runtime.
  output: "standalone",

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },

  async rewrites() {
    return [
      {
        source: "/backend-api/:path*",
        destination: `${careerAgentOrigin.replace(/\/$/, "")}/:path*`,
      },
      {
        source: "/job-engine-api/:path*",
        destination: `${jobEngineOrigin.replace(/\/$/, "")}/:path*`,
      },
    ];
  },

  // Necessary for next-intl to work correctly with Turbopack in current Next.js versions
  turbopack: {}
};

export default withNextIntl(nextConfig);
