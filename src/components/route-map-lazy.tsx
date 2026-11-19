"use client";

import dynamic from "next/dynamic";

// Leaflet touches `window`, so the map only renders in the browser.
const RouteMap = dynamic(() => import("./route-map"), {
  ssr: false,
  loading: () => <div className="h-72 w-full animate-pulse rounded-md bg-rock-2" aria-label="Loading map" />,
});

export function RouteMapLazy(props: { polyline: string; color: string }) {
  return <RouteMap {...props} />;
}
