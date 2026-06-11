const EARTH_RADIUS_KM = 6371
const RIDER_SPEED_KMH = 22
const ARRIVAL_THRESHOLD_KM = 0.2

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function bearingDegrees(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): number {
  const φ1 = (fromLat * Math.PI) / 180
  const φ2 = (toLat * Math.PI) / 180
  const Δλ = ((toLng - fromLng) * Math.PI) / 180
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

export function etaMinutesFromRider(
  riderLat: number,
  riderLng: number,
  customerLat: number,
  customerLng: number,
): { minutes: number; distanceKm: number; arrived: boolean } {
  const distanceKm = haversineKm(riderLat, riderLng, customerLat, customerLng)
  const arrived = distanceKm < ARRIVAL_THRESHOLD_KM
  const minutes = arrived
    ? 0
    : Math.max(1, Math.ceil((distanceKm / RIDER_SPEED_KMH) * 60))
  return { minutes, distanceKm, arrived }
}
