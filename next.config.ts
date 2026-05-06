import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // Standalone output для Docker (lean runtime: только server.js + минимум node_modules)
  output: "standalone",
  experimental: {
    reactCompiler: true,
  },
};

export default withNextIntl(nextConfig);
