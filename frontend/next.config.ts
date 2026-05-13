import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

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

  // Necessary for next-intl to work correctly with Turbopack in current Next.js versions
  turbopack: {}
};

export default withNextIntl(nextConfig);
