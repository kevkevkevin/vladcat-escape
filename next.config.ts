import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // Keep this app independent of package lockfiles in parent directories.
  turbopack: { root: process.cwd() },
  serverExternalPackages: ['playwright', 'playwright-core'],
  outputFileTracingIncludes: { '/api/**': ['./src/game/authority/bootstrap.js', './public/game/**/*', './public/vladcat/**/*'] },
};

export default config;
