import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath: process.env.PAGES_BASE_PATH || "",
  turbopack: { root: fileURLToPath(new URL("../", import.meta.url)) },
};

export default nextConfig;
