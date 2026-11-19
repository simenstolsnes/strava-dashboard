import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: 180, height: 180, display: "flex", alignItems: "center", justifyContent: "center", background: "#016c66" }}>
        <svg width="130" height="130" viewBox="0 0 100 100">
          <rect x="44" y="10" width="12" height="84" rx="3" fill="#6b4a2e" />
          <path d="M14 18 H74 L88 30 L74 42 H14 Z" fill="#a54f16" />
          <path d="M86 52 H30 L16 64 L30 76 H86 Z" fill="#014f4b" />
        </svg>
      </div>
    ),
    size,
  );
}
