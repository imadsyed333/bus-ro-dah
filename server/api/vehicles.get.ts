const FEED = 'https://bustime.ttc.ca/gtfsrt/vehicles?debug'

export default defineCachedEventHandler(
  async () => {
    const res = await fetch(FEED)
    if (!res.ok) {
      throw createError({ statusCode: 502, statusMessage: 'TTC feed unavailable' })
    }
    const { vehicles, timestamp } = parseGtfsRtDebug(await res.text())
    return { vehicles, timestamp, fetchedAt: Date.now() }
  },
  { maxAge: 15, swr: false },
)
