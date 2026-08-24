import type { NextConfig } from "next";
import fs from "fs";
import path from "path";

// Reuse the existing desktop project's AMap keys without copying or changing
// its environment file. The mobile app remains an independent project.
function readDesktopEnv(name: string): string {
  try {
    const content = fs.readFileSync(path.resolve(process.cwd(), "..", ".env.local"), "utf8");
    const line = content.split(/\r?\n/).find((entry) => entry.trim().startsWith(`${name}=`));
    if (!line) return "";
    const value = line.slice(line.indexOf("=") + 1).trim();
    return value.replace(/^(['"])(.*)\1$/, "$2");
  } catch {
    return "";
  }
}

const amapJsKey = process.env.NEXT_PUBLIC_AMAP_JS_KEY || readDesktopEnv("NEXT_PUBLIC_AMAP_JS_KEY");
const amapSecret = process.env.NEXT_PUBLIC_AMAP_SECRET || readDesktopEnv("NEXT_PUBLIC_AMAP_SECRET");
const pagesRepository = process.env.GITHUB_PAGES === "true" ? (process.env.GITHUB_REPOSITORY || "").split("/")[1] : "";
const basePath = pagesRepository ? `/${pagesRepository}` : "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  assetPrefix: basePath || undefined,
  images: { unoptimized: true },
  turbopack: { root: path.resolve(process.cwd()) },
  env: {
    NEXT_PUBLIC_AMAP_JS_KEY: amapJsKey,
    NEXT_PUBLIC_AMAP_SECRET: amapSecret,
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
