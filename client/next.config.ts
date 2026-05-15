import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  /** Keeps file tracing scoped to this app when multiple lockfiles exist on the machine */
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
