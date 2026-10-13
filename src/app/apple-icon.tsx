import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0a" }}>
        <svg width="112" height="112" viewBox="0 0 24 24">
          <path d="M4 20 L12 4 L20 20" fill="none" stroke="#fafafa" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="15" r="1.8" fill="#fafafa" />
        </svg>
      </div>
    ),
    size,
  );
}
