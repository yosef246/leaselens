import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ship the Heebo .ttf files to the serverless function that generates rewritten-contract PDFs
  // (lib/pdf/render-contract.ts reads them from process.cwd() at runtime). Without this, the font
  // files aren't traced into the bundle and PDF generation fails in production.
  outputFileTracingIncludes: {
    "/api/contracts/[id]/rewrite": ["./src/lib/pdf/fonts/**"],
  },
};

export default nextConfig;
