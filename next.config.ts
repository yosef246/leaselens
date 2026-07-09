import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse pulls in pdfjs-dist + the native @napi-rs/canvas binary. Keep them out of the
  // server bundle so Next doesn't try to bundle the native addon (breaks /api/.../process).
  serverExternalPackages: ["pdf-parse", "@napi-rs/canvas"],
};

export default nextConfig;
