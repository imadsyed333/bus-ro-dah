import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const SRC =
  'https://ckan0.cf.opendata.inter.prod-toronto.ca/dataset/1d079757-377b-4564-82df-eb5638583bfb/resource/7bc94ccf-7bcf-4a7d-88b1-bdfc8ec5aaf1/download/centreline-version-2-4326.geojson'

const ROAD_CODES = new Set([
  201100, 201101, 201200, 201201, 201300, 201301, 201400, 201401, 201500, 201600, 201601, 201800,
  201801, 201803,
])

const CACHE = join(process.cwd(), '.data', 'centreline-roads.geojson')

type LineGeom = { type: 'LineString' | 'MultiLineString'; coordinates: number[][] | number[][][] }
type Feature = { type: 'Feature'; properties: Record<string, unknown>; geometry: LineGeom | null }
type Collection = { type: 'FeatureCollection'; features: Feature[] }

let memory: Collection | undefined

function roadsOnly(raw: Collection): Collection {
  return {
    type: 'FeatureCollection',
    features: raw.features.flatMap(f => {
      if (!ROAD_CODES.has(f.properties?.FEATURE_CODE as number)) return []
      const g = f.geometry
      if (!g || (g.type !== 'LineString' && g.type !== 'MultiLineString')) return []
      return [{ type: 'Feature' as const, properties: {}, geometry: g }]
    }),
  }
}

export default defineEventHandler(async () => {
  if (memory) return memory
  try {
    memory = JSON.parse(await readFile(CACHE, 'utf8'))
    return memory
  } catch {
    // first run: pull CKAN, then serve from disk
  }
  const res = await fetch(SRC)
  if (!res.ok) throw createError({ statusCode: 502, statusMessage: 'Centreline unavailable' })
  memory = roadsOnly(await res.json())
  await mkdir(join(process.cwd(), '.data'), { recursive: true })
  await writeFile(CACHE, JSON.stringify(memory))
  return memory
})
