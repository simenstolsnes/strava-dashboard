/** Decode a Google/Strava encoded polyline into [lat, lng] pairs. */
export function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    for (const axis of [0, 1]) {
      let result = 0;
      let shift = 0;
      let byte: number;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20 && index < encoded.length);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === 0) lat += delta;
      else lng += delta;
    }
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

/** Rough bounding box for mainland Norway + Svalbard-free coast (Kartverket coverage). */
export function inNorway(points: [number, number][]) {
  if (!points.length) return false;
  const inside = points.filter(([la, lo]) => la > 57.8 && la < 71.3 && lo > 4.4 && lo < 31.2).length;
  return inside / points.length > 0.8;
}
