const METERS_PER_DEG_LAT = 111_320
const CELL_M = 200
const MAX_SNAP_M = 80
const MAX_HEADING_DELTA = 45

type Segment = { lon1: number; lat1: number; lon2: number; lat2: number; heading: number }

export type SnapIndex = {
  cellDeg: number
  cells: Map<string, Segment[]>
}

type LineGeom = { type: string; coordinates: number[][] | number[][][] }
type Collection = { features: { geometry?: LineGeom | null }[] }

function headingDeg(lon1: number, lat1: number, lon2: number, lat2: number) {
  const dLat = lat2 - lat1
  const dLon = (lon2 - lon1) * Math.cos((lat1 * Math.PI) / 180)
  return ((Math.atan2(dLon, dLat) * 180) / Math.PI + 360) % 360
}

function headingDelta(a: number, b: number) {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

function alignedHeading(bearing: number, heading: number) {
  const flipped = (heading + 180) % 360
  return headingDelta(bearing, heading) <= headingDelta(bearing, flipped) ? heading : flipped
}

function project(lon: number, lat: number, s: Segment) {
  const mx = METERS_PER_DEG_LAT * Math.cos((s.lat1 * Math.PI) / 180)
  const px = (lon - s.lon1) * mx
  const py = (lat - s.lat1) * METERS_PER_DEG_LAT
  const bx = (s.lon2 - s.lon1) * mx
  const by = (s.lat2 - s.lat1) * METERS_PER_DEG_LAT
  const len2 = bx * bx + by * by
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (px * bx + py * by) / len2))
  return {
    lon: s.lon1 + t * (s.lon2 - s.lon1),
    lat: s.lat1 + t * (s.lat2 - s.lat1),
    dist: Math.hypot(px - t * bx, py - t * by),
  }
}

function addSeg(index: SnapIndex, lon1: number, lat1: number, lon2: number, lat2: number) {
  if (lon1 === lon2 && lat1 === lat2) return
  const seg: Segment = { lon1, lat1, lon2, lat2, heading: headingDeg(lon1, lat1, lon2, lat2) }
  const { cellDeg, cells } = index
  const i0 = Math.floor(Math.min(lat1, lat2) / cellDeg)
  const i1 = Math.floor(Math.max(lat1, lat2) / cellDeg)
  const j0 = Math.floor(Math.min(lon1, lon2) / cellDeg)
  const j1 = Math.floor(Math.max(lon1, lon2) / cellDeg)
  for (let i = i0; i <= i1; i++) {
    for (let j = j0; j <= j1; j++) {
      const key = `${i},${j}`
      const bucket = cells.get(key)
      if (bucket) bucket.push(seg)
      else cells.set(key, [seg])
    }
  }
}

function walkLine(index: SnapIndex, coords: number[][]) {
  for (let i = 1; i < coords.length; i++) {
    addSeg(index, coords[i - 1][0], coords[i - 1][1], coords[i][0], coords[i][1])
  }
}

export function indexCentreline(geojson: Collection): SnapIndex {
  const index: SnapIndex = { cellDeg: CELL_M / METERS_PER_DEG_LAT, cells: new Map() }
  for (const f of geojson.features) {
    const g = f.geometry
    if (!g) continue
    if (g.type === 'LineString') walkLine(index, g.coordinates as number[][])
    else if (g.type === 'MultiLineString') {
      for (const line of g.coordinates as number[][][]) walkLine(index, line)
    }
  }
  return index
}

// ponytail: nearest-segment snap, no intersection graph. Wrong fork at Y-junctions until the next 60s poll. Upgrade: walk FROM/TO_INTERSECTION_ID and advance along edges.
export function snap(index: SnapIndex, lat: number, lon: number, bearing: number) {
  const { cellDeg, cells } = index
  const ci = Math.floor(lat / cellDeg)
  const cj = Math.floor(lon / cellDeg)
  let best: { lat: number; lon: number; dist: number; heading: number } | undefined
  for (let di = -1; di <= 1; di++) {
    for (let dj = -1; dj <= 1; dj++) {
      const bucket = cells.get(`${ci + di},${cj + dj}`)
      if (!bucket) continue
      for (const seg of bucket) {
        const heading = alignedHeading(bearing, seg.heading)
        if (headingDelta(bearing, heading) > MAX_HEADING_DELTA) continue
        const hit = project(lon, lat, seg)
        if (hit.dist > MAX_SNAP_M) continue
        if (!best || hit.dist < best.dist) {
          best = { lat: hit.lat, lon: hit.lon, dist: hit.dist, heading }
        }
      }
    }
  }
  if (!best) return { lat, lon, bearing }
  return { lat: best.lat, lon: best.lon, bearing: best.heading }
}
