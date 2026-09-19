export type Vehicle = {
  id: string
  routeId: string
  lat: number
  lon: number
  bearing: number
  speed: number
  occupancy: string
}

function blocksNamed(text: string, name: string): string[] {
  const needle = `${name} {`
  const blocks: string[] = []
  let from = 0
  while (from < text.length) {
    const start = text.indexOf(needle, from)
    if (start < 0) break
    const open = start + needle.length - 1
    let depth = 0
    let end = -1
    for (let i = open; i < text.length; i++) {
      const c = text[i]
      if (c === '{') depth++
      else if (c === '}') {
        depth--
        if (depth === 0) {
          end = i
          break
        }
      }
    }
    if (end < 0) break
    blocks.push(text.slice(open + 1, end))
    from = end + 1
  }
  return blocks
}

function str(block: string, key: string): string | undefined {
  return block.match(new RegExp(`${key}:\\s*"([^"]*)"`))?.[1]
}

function num(block: string, key: string): number | undefined {
  const raw = block.match(new RegExp(`${key}:\\s*([-\\d.]+)`))?.[1]
  if (raw == null) return undefined
  const n = Number(raw)
  return Number.isFinite(n) ? n : undefined
}

function lastQuotedId(block: string): string | undefined {
  let id: string | undefined
  for (const match of block.matchAll(/\bid:\s*"([^"]*)"/g)) id = match[1]
  return id
}

export function parseGtfsRtDebug(text: string): Vehicle[] {
  const vehicles: Vehicle[] = []
  for (const entity of blocksNamed(text, 'entity')) {
    const id = lastQuotedId(entity)
    const routeId = str(entity, 'route_id')
    const lat = num(entity, 'latitude')
    const lon = num(entity, 'longitude')
    if (!id || !routeId || lat == null || lon == null) continue
    vehicles.push({
      id,
      routeId,
      lat,
      lon,
      bearing: num(entity, 'bearing') ?? 0,
      speed: num(entity, 'speed') ?? 0,
      occupancy: entity.match(/occupancy_status:\s*(\w+)/)?.[1] ?? '',
    })
  }
  return vehicles
}
