"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, Polyline, TileLayer, useMap } from "react-leaflet";
import { decodePolyline, inNorway } from "@/lib/polyline";

const KARTVERKET = {
  url: "https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png",
  attribution: '&copy; <a href="https://www.kartverket.no/">Kartverket</a>',
};
const OSM = {
  url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
};

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) map.fitBounds(points, { padding: [24, 24] });
  }, [map, points]);
  return null;
}

/** Route on a topographic map: Kartverket in Norway, OpenStreetMap elsewhere. */
export default function RouteMap({ polyline, color }: { polyline: string; color: string }) {
  const points = useMemo(() => decodePolyline(polyline), [polyline]);
  const tiles = inNorway(points) ? KARTVERKET : OSM;
  // On touch screens, one-finger drag would trap page scrolling; pinch and the +/- buttons still work.
  // This component only renders in the browser (ssr: false), so window is available here.
  const [touch] = useState(() => window.matchMedia("(pointer: coarse)").matches);

  if (points.length < 2) return null;
  return (
    // Leaflet panes use z-index up to 1000; `isolate` keeps them inside this box so the
    // sticky header and tab bar stay on top while scrolling.
    <div className="relative isolate z-0">
    <MapContainer
      key={touch ? "touch" : "pointer"}
      bounds={points}
      scrollWheelZoom={false}
      dragging={!touch}
      className="h-72 w-full rounded-md"
      style={{ background: "var(--rock-2)" }}
      attributionControl
    >
      <TileLayer url={tiles.url} attribution={tiles.attribution} maxZoom={17} />
      {/* Halo under the route keeps it readable on busy map areas */}
      <Polyline positions={points} pathOptions={{ color: "#ffffff", weight: 7, opacity: 0.85 }} />
      <Polyline positions={points} pathOptions={{ color, weight: 4, opacity: 1 }} />
      <CircleMarker center={points[0]} radius={6} pathOptions={{ color: "#ffffff", weight: 2, fillColor: "#016c66", fillOpacity: 1 }} />
      <CircleMarker
        center={points[points.length - 1]}
        radius={6}
        pathOptions={{ color: "#ffffff", weight: 2, fillColor: "#14211f", fillOpacity: 1 }}
      />
      <FitBounds points={points} />
    </MapContainer>
    </div>
  );
}
