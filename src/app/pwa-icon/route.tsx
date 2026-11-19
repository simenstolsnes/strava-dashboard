import { ImageResponse } from "next/og";

/** App icon rendered on demand: a signpost on teal. */
function Icon({ size, maskable }: { size: number; maskable: boolean }) {
  const pad = maskable ? size * 0.2 : size * 0.12;
  const inner = size - pad * 2;
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#016c66",
        borderRadius: maskable ? 0 : size * 0.22,
      }}
    >
      <svg width={inner} height={inner} viewBox="0 0 100 100">
        <rect x="44" y="10" width="12" height="84" rx="3" fill="#6b4a2e" />
        <path d="M14 18 H74 L88 30 L74 42 H14 Z" fill="#a54f16" />
        <path d="M86 52 H30 L16 64 L30 76 H86 Z" fill="#014f4b" />
      </svg>
    </div>
  );
}

export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const size = Math.min(1024, Math.max(32, Number(params.get("size") ?? 192)));
  return new ImageResponse(<Icon size={size} maskable={params.has("maskable")} />, { width: size, height: size });
}
