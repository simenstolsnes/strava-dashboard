import { ImageResponse } from "next/og";

/** App icon rendered on demand: a rising power-curve mark on dark. */
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
        background: "#0d0d0d",
        borderRadius: maskable ? 0 : size * 0.22,
      }}
    >
      <svg width={inner} height={inner} viewBox="0 0 100 100">
        <path d="M8 78 L30 52 L46 64 L70 26 L92 14" fill="none" stroke="#eb6834" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 92 L92 92" stroke="#3987e5" strokeWidth="6" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const size = Math.min(1024, Math.max(32, Number(params.get("size") ?? 192)));
  return new ImageResponse(<Icon size={size} maskable={params.has("maskable")} />, { width: size, height: size });
}
