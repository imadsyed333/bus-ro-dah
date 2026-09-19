const FEED = 'https://bustime.ttc.ca/gtfsrt/vehicles?debug'

export default defineEventHandler(async () => {
  const res = await fetch(FEED)
  if (!res.ok) {
    throw createError({ statusCode: 502, statusMessage: 'TTC feed unavailable' })
  }
  const text = await res.text()
  return { vehicles: parseGtfsRtDebug(text), fetchedAt: Date.now() }
})
