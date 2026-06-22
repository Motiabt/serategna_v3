// Addis Ababa sub-city approximate centroids (lat/lng). Used to geocode a job
// when the client doesn't drop a precise pin, keeping matching consistent.
export const SUB_CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Bole: { lat: 8.9939, lng: 38.7894 },
  Yeka: { lat: 9.0411, lng: 38.8003 },
  Kirkos: { lat: 9.0102, lng: 38.7612 },
  Arada: { lat: 9.0357, lng: 38.7506 },
  Lideta: { lat: 9.0125, lng: 38.7333 },
  Gulele: { lat: 9.0589, lng: 38.7339 },
  'Nifas Silk': { lat: 8.9587, lng: 38.7503 },
  Kolfe: { lat: 9.0289, lng: 38.7006 },
  Akaki: { lat: 8.8939, lng: 38.7958 },
  'Addis Ketema': { lat: 9.0392, lng: 38.7256 },
};

export function centroid(subCity: string): { lat: number; lng: number } {
  return SUB_CITY_COORDS[subCity] ?? SUB_CITY_COORDS.Bole;
}

// Haversine distance — replaces PostGIS for portable radius matching.
// On Postgres in production this can be swapped for a PostGIS ST_DWithin query.

export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return R * 2 * Math.asin(Math.sqrt(h));
}

function toRad(d: number): number {
  return (d * Math.PI) / 180;
}
