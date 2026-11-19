import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: 180, height: 180, display: "flex", alignItems: "center", justifyContent: "center", background: "#0d0d0d" }}>
        <svg width="130" height="130" viewBox="0 0 100 100">
          <path d="M8 78 L30 52 L46 64 L70 26 L92 14" fill="none" stroke="#eb6834" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 92 L92 92" stroke="#3987e5" strokeWidth="6" strokeLinecap="round" />
        </svg>
      </div>
    ),
    size,
  );
}
