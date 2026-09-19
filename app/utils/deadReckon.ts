const METERS_PER_DEG_LAT = 111_320

export function offset(lat: number, lon: number, bearingDeg: number, distanceM: number) {
  const bearing = (bearingDeg * Math.PI) / 180
  const latRad = (lat * Math.PI) / 180
  return {
    lat: lat + (distanceM * Math.cos(bearing)) / METERS_PER_DEG_LAT,
    lon: lon + (distanceM * Math.sin(bearing)) / (METERS_PER_DEG_LAT * Math.cos(latRad)),
  }
}
