import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // Keep this app independent of package lockfiles in parent directories.
  turbopack: { root: process.cwd() },
};

export default config;
