const EARTH_RADIUS_KM = 6371

export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function boundingBox(lat: number, lng: number, radiusKm: number) {
  const latDelta = radiusKm / 111
  const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180))
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  }
}

/** Estimate delivery minutes from distance + shop prep time */
export function estimateDeliveryMinutes(
  distanceKm: number,
  avgPrepMinutes: number,
): number {
  const travelMinutes = Math.ceil(distanceKm * 4) // ~15 km/h in city traffic
  return avgPrepMinutes + travelMinutes
}

export function calculateDeliveryFee(
  baseFee: number,
  distanceKm: number,
  subtotal: number,
  freeDeliveryAbove = 499,
): number {
  const distanceSurcharge = distanceKm > 2 ? Math.ceil((distanceKm - 2) * 5) : 0
  if (subtotal >= freeDeliveryAbove) return Math.max(0, distanceSurcharge)
  return baseFee + distanceSurcharge
}
