<template>
  <div ref="mapEl" class="map" />
</template>

<script setup>
import 'leaflet/dist/leaflet.css'
import { offset } from '~/utils/deadReckon'

const mapEl = ref(null)
const fleet = new Map()

function occupancyLabel(raw) {
  if (!raw) return 'Unknown'
  return raw.toLowerCase().split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
}

function tooltipHtml(bus) {
  return `Route ${bus.routeId || '—'}<br>${(bus.speed * 3.6).toFixed(1)} km/h<br>${occupancyLabel(bus.occupancy)}`
}

function applySnapshot(L, map, incoming) {
  const seen = new Set()
  for (const v of incoming) {
    seen.add(v.id)
    const rec = fleet.get(v.id)
    if (rec) {
      rec.lat = v.lat
      rec.lon = v.lon
      rec.bearing = v.bearing
      rec.speed = v.speed
      rec.routeId = v.routeId
      rec.occupancy = v.occupancy
      rec.marker.setLatLng([v.lat, v.lon])
      rec.marker.setTooltipContent(tooltipHtml(v))
    } else {
      const marker = L.circleMarker([v.lat, v.lon], { radius: 6 })
        .bindTooltip(tooltipHtml(v))
        .addTo(map)
      fleet.set(v.id, { ...v, marker })
    }
  }
  for (const [id, rec] of fleet) {
    if (seen.has(id)) continue
    rec.marker.remove()
    fleet.delete(id)
  }
}

let poll
let move
let map
onMounted(async () => {
  const leaflet = await import('leaflet')
  const L = leaflet.default ?? leaflet
  map = L.map(mapEl.value, { preferCanvas: true }).setView([43.6532, -79.3832], 12)
  L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    { attribution: 'Esri, OpenStreetMap, and the GIS user community' },
  ).addTo(map)

  async function load() {
    try {
      const data = await $fetch('/api/vehicles')
      applySnapshot(L, map, data.vehicles)
    } catch {
      // keep last positions moving
    }
  }

  await load()
  poll = setInterval(load, 60_000)
  let last = performance.now()
  move = setInterval(() => {
    const now = performance.now()
    const dt = (now - last) / 1000
    last = now
    for (const bus of fleet.values()) {
      if (bus.speed <= 0) continue
      const next = offset(bus.lat, bus.lon, bus.bearing, bus.speed * dt)
      bus.lat = next.lat
      bus.lon = next.lon
      bus.marker.setLatLng([next.lat, next.lon])
    }
  }, 100)
})
onUnmounted(() => {
  clearInterval(poll)
  clearInterval(move)
  map?.remove()
})
</script>

<style>
html,
body,
#__nuxt,
.map {
  height: 100%;
  margin: 0;
}
</style>
