import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const alt = `${site.name}: pet food & supplies in Rawang · Same-day Klang Valley delivery`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "#fbf1e2",
          borderLeft: "40px solid #d9814a",
          color: "#2e1d14",
        }}
      >
        <div style={{ fontSize: 110, fontWeight: 800, color: "#c06a37" }}>{site.name}</div>
        <div style={{ marginTop: 24, fontSize: 48 }}>Pet food & supplies in Rawang ·</div>
        <div style={{ marginTop: 8, fontSize: 48 }}>Same-day Klang Valley delivery</div>
      </div>
    ),
    size,
  );
}
