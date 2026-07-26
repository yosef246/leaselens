import { ImageResponse } from "next/og";

/**
 * Default social share image for the whole site (1200x630). Every page inherits this unless it
 * defines its own opengraph-image. Rendered with the default satori font, so the artwork is
 * intentionally Latin-only — the Hebrew value proposition is carried by each page's OG
 * title/description metadata, which crawlers read as text.
 */
export const alt = "LeaseLens — ניתוח חוזי שכירות מול החוק הישראלי";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #064e3b 100%)",
          color: "#f8fafc",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "18px",
              height: "72px",
              borderRadius: "6px",
              background: "#10b981",
            }}
          />
          <div style={{ fontSize: "76px", fontWeight: 800, letterSpacing: "-2px" }}>
            LeaseLens
          </div>
        </div>

        <div style={{ marginTop: "36px", fontSize: "40px", fontWeight: 600, color: "#e2e8f0" }}>
          Israeli lease-contract analysis, cited to the law.
        </div>

        <div style={{ marginTop: "20px", fontSize: "30px", color: "#94a3b8" }}>
          RAG · Hebrew · Claude
        </div>
      </div>
    ),
    { ...size }
  );
}
