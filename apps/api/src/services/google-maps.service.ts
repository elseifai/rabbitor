/**
 * Google Maps Platform — server-side routing utilities
 *
 * Uses the NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (shared with the web app).
 * Falls back gracefully when the key is absent — no hard crash.
 *
 * Exposes:
 *   getRiderDistanceMatrix() — Distance Matrix API, used during rider allocation
 *                              to rank nearby available riders by drive time.
 *   getDirectionsRoute()    — Directions API, returns a decoded polyline array
 *                              for the store → rider → customer route geometry.
 */

import { config } from "../config";

const GMAPS_BASE = "https://maps.googleapis.com/maps/api";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RiderDistanceResult {
  riderId: string;
  riderLat: number;
  riderLng: number;
  /** Drive distance in metres */
  distanceM: number;
  /** Drive duration in seconds */
  durationS: number;
}

export interface RoutePolyline {
  /** Ordered array of coordinates describing the driving path */
  path: LatLng[];
  /** Total distance in metres */
  totalDistanceM: number;
  /** Total duration in seconds */
  totalDurationS: number;
}

// ─── Google API helpers ───────────────────────────────────────────────────────

function apiKey(): string | null {
  return config.googleMapsApiKey || null;
}

/** Decode a Google Maps encoded polyline into lat/lng pairs. */
function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let b: number;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dLat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dLng;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}

function latLngString(p: LatLng): string {
  return `${p.lat},${p.lng}`;
}

// ─── Distance Matrix ──────────────────────────────────────────────────────────

interface RiderCandidate {
  riderId: string;
  lat: number;
  lng: number;
}

/**
 * Given a pickup origin and a list of rider candidates, calls the Distance
 * Matrix API and returns each rider's drive distance and ETA from the store,
 * sorted ascending by drive duration (closest first).
 *
 * Falls back to Haversine straight-line ordering when the API key is absent.
 */
export async function getRiderDistanceMatrix(
  origin: LatLng,
  riders: RiderCandidate[],
): Promise<RiderDistanceResult[]> {
  if (riders.length === 0) return [];

  const key = apiKey();
  if (!key) {
    // Haversine fallback — no API call
    return riders
      .map((r) => {
        const dKm = haversineKm(origin, { lat: r.lat, lng: r.lng });
        return {
          riderId: r.riderId,
          riderLat: r.lat,
          riderLng: r.lng,
          distanceM: Math.round(dKm * 1000),
          durationS: Math.round((dKm / 25) * 3600), // assume 25 km/h
        };
      })
      .sort((a, b) => a.durationS - b.durationS);
  }

  const destinations = riders.map((r) => latLngString({ lat: r.lat, lng: r.lng })).join("|");
  const url =
    `${GMAPS_BASE}/distancematrix/json` +
    `?origins=${latLngString(origin)}` +
    `&destinations=${encodeURIComponent(destinations)}` +
    `&mode=driving` +
    `&units=metric` +
    `&key=${key}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const json = (await res.json()) as {
      status: string;
      rows?: {
        elements: {
          status: string;
          distance?: { value: number };
          duration?: { value: number };
        }[];
      }[];
    };

    if (json.status !== "OK" || !json.rows?.[0]) {
      throw new Error(`Distance Matrix API error: ${json.status}`);
    }

    const elements = json.rows[0].elements;
    const results: RiderDistanceResult[] = [];

    for (let i = 0; i < riders.length; i++) {
      const el = elements[i];
      if (!el || el.status !== "OK") continue;
      results.push({
        riderId: riders[i].riderId,
        riderLat: riders[i].lat,
        riderLng: riders[i].lng,
        distanceM: el.distance?.value ?? 0,
        durationS: el.duration?.value ?? 0,
      });
    }

    return results.sort((a, b) => a.durationS - b.durationS);
  } catch (err) {
    console.warn("[google-maps] Distance Matrix failed, using Haversine fallback:", err);
    return riders
      .map((r) => {
        const dKm = haversineKm(origin, { lat: r.lat, lng: r.lng });
        return {
          riderId: r.riderId,
          riderLat: r.lat,
          riderLng: r.lng,
          distanceM: Math.round(dKm * 1000),
          durationS: Math.round((dKm / 25) * 3600),
        };
      })
      .sort((a, b) => a.durationS - b.durationS);
  }
}

// ─── Directions API ───────────────────────────────────────────────────────────

/**
 * Fetches the optimized driving route from the store through the rider's
 * current position to the customer's destination.
 *
 * Returns a decoded polyline path the frontend can draw on the map,
 * plus aggregated distance and duration.
 *
 * Falls back to a straight-line path when the API key is absent or the
 * request fails.
 */
export async function getDirectionsRoute(
  store: LatLng,
  rider: LatLng | null,
  destination: LatLng,
): Promise<RoutePolyline> {
  const straight: RoutePolyline = {
    path: [store, ...(rider ? [rider] : []), destination],
    totalDistanceM: Math.round(haversineKm(store, destination) * 1000),
    totalDurationS: 0,
  };

  const key = apiKey();
  if (!key) return straight;

  // Build waypoint: rider's current position if known
  const waypointParam = rider
    ? `&waypoints=${latLngString(rider)}`
    : "";

  const url =
    `${GMAPS_BASE}/directions/json` +
    `?origin=${latLngString(store)}` +
    `&destination=${latLngString(destination)}` +
    waypointParam +
    `&mode=driving` +
    `&key=${key}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    const json = (await res.json()) as {
      status: string;
      routes?: {
        overview_polyline: { points: string };
        legs: { distance: { value: number }; duration: { value: number } }[];
      }[];
    };

    if (json.status !== "OK" || !json.routes?.[0]) {
      throw new Error(`Directions API error: ${json.status}`);
    }

    const route = json.routes[0];
    const path = decodePolyline(route.overview_polyline.points);
    const totalDistanceM = route.legs.reduce((s, l) => s + l.distance.value, 0);
    const totalDurationS = route.legs.reduce((s, l) => s + l.duration.value, 0);

    return { path, totalDistanceM, totalDurationS };
  } catch (err) {
    console.warn("[google-maps] Directions API failed, using straight-line fallback:", err);
    return straight;
  }
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}
