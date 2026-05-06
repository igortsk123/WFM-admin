import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // Standalone output для Docker (lean runtime: только server.js + минимум node_modules)
  output: "standalone",
  experimental: {
    reactCompiler: true,
  },
  // Type-check и ESLint выполняются отдельным шагом в CI/CD (см.
  // .github/workflows/deploy.yml: pre-deploy `tsc --noEmit`).
  // В docker build их пропускаем — экономит ~1-1.5 мин на билде, при
  // этом safety net остаётся (CI блокирует деплой при типовых ошибках).
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default withNextIntl(nextConfig);
