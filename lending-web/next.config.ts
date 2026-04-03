import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const configDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Monorepo: parent folder may have another package-lock.json; pin app root so build/output are correct on Vercel
  turbopack: {
    root: configDir,
  },
};

export default nextConfig;
