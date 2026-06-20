/**
 * Client-side Google Directions API helper.
 * Fetches the driving route and decodes the overview polyline.
 * Falls back to a straight-line path when the API key is absent or the request fails.
 */

export interface LatLng {
  lat: number
  lng: number
}

export interface RouteResult {
  path: LatLng[]
  totalDistanceM: number
  totalDurationS: number
}

function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = []
  let index = 0
  let lat = 0
  let lng = 0
  while (index < encoded.length) {
    let shift = 0
    let result = 0
    let b: number
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    const dLat = result & 1 ? ~(result >> 1) : result >> 1
    lat += dLat
    shift = 0
    result = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    const dLng = result & 1 ? ~(result >> 1) : result >> 1
    lng += dLng
    points.push({ lat: lat / 1e5, lng: lng / 1e5 })
  }
  return points
}

export async function fetchDrivingRoute(
  origin: LatLng,
  destination: LatLng,
  waypoint?: LatLng | null,
): Promise<RouteResult> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''
  const straight: RouteResult = {
    path: [origin, ...(waypoint ? [waypoint] : []), destination],
    totalDistanceM: 0,
    totalDurationS: 0,
  }

  if (!apiKey) return straight

  const waypointParam = waypoint
    ? `&waypoints=${waypoint.lat},${waypoint.lng}`
    : ''

  const url =
    `https://maps.googleapis.com/maps/api/directions/json` +
    `?origin=${origin.lat},${origin.lng}` +
    `&destination=${destination.lat},${destination.lng}` +
    waypointParam +
    `&mode=driving` +
    `&key=${apiKey}`

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) })
    const json = (await res.json()) as {
      status: string
      routes?: {
        overview_polyline: { points: string }
        legs: { distance: { value: number }; duration: { value: number } }[]
      }[]
    }
    if (json.status !== 'OK' || !json.routes?.[0]) return straight

    const route = json.routes[0]
    return {
      path: decodePolyline(route.overview_polyline.points),
      totalDistanceM: route.legs.reduce((s, l) => s + l.distance.value, 0),
      totalDurationS: route.legs.reduce((s, l) => s + l.duration.value, 0),
    }
  } catch {
    return straight
  }
}
