<template>
  <div ref="mapEl" class="map" />
</template>

<script setup>
import 'leaflet/dist/leaflet.css'
import { offset } from '~/utils/deadReckon'
import { indexCentreline, snap } from '~/utils/snapToLine'

const mapEl = ref(null)
const fleet = new Map()
let snapIndex = null

function occupancyLabel(raw) {
  if (!raw) return 'Unknown'
  return raw.toLowerCase().split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
}

function tooltipHtml(bus) {
  return `Route ${bus.routeId || '—'}<br>${(bus.speed * 3.6).toFixed(1)} km/h<br>${occupancyLabel(bus.occupancy)}`
}

function snapBus(bus) {
  if (!snapIndex) return
  const s = snap(snapIndex, bus.lat, bus.lon, bus.bearing)
  bus.lat = s.lat
  bus.lon = s.lon
  bus.bearing = s.bearing
}

function retarget(bus, lat, lon, bearing) {
  bus.fromLat = bus.lat
  bus.fromLon = bus.lon
  bus.lat = lat
  bus.lon = lon
  bus.bearing = bearing
  snapBus(bus)
  bus.toLat = bus.lat
  bus.toLon = bus.lon
  bus.lat = bus.fromLat
  bus.lon = bus.fromLon
  bus.lerp = 0
}

function applySnapshot(L, map, incoming) {
  const seen = new Set()
  for (const v of incoming) {
    seen.add(v.id)
    const rec = fleet.get(v.id)
    if (rec) {
      rec.speed = v.speed
      rec.routeId = v.routeId
      rec.occupancy = v.occupancy
      retarget(rec, v.lat, v.lon, v.bearing)
      rec.marker.setTooltipContent(tooltipHtml(v))
    } else {
      const bus = { ...v }
      snapBus(bus)
      const marker = L.circleMarker([bus.lat, bus.lon], { radius: 6 })
        .bindTooltip(tooltipHtml(v))
        .addTo(map)
      fleet.set(v.id, { ...bus, marker })
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
    { attribution: 'Esri, OpenStreetMap, GIS user community | Centreline © City of Toronto (OGL-Toronto)' },
  ).addTo(map)
  map.createPane('centreline')
  map.getPane('centreline').style.zIndex = 250

  async function load() {
    try {
      const data = await $fetch('/api/vehicles')
      applySnapshot(L, map, data.vehicles)
    } catch {
      // keep last positions moving
    }
  }

  async function loadCentreline() {
    try {
      const roads = await $fetch('/api/centreline', { timeout: 300_000 })
      L.geoJSON(roads, {
        pane: 'centreline',
        style: { color: '#4a6fa5', weight: 1, opacity: 0.55 },
        renderer: L.canvas({ pane: 'centreline' }),
      }).addTo(map)
      snapIndex = indexCentreline(roads)
      for (const bus of fleet.values()) {
        retarget(bus, bus.lat, bus.lon, bus.bearing)
      }
    } catch {
      // keep free-plane motion until centreline is available
    }
  }

  await load()
  loadCentreline()
  poll = setInterval(load, 60_000)
  let last = performance.now()
  move = setInterval(() => {
    const now = performance.now()
    const dt = (now - last) / 1000
    last = now
    for (const bus of fleet.values()) {
      if (bus.lerp != null && bus.lerp < 1) {
        bus.lerp = Math.min(1, bus.lerp + dt / 1)
        const t = bus.lerp
        bus.lat = bus.fromLat + (bus.toLat - bus.fromLat) * t
        bus.lon = bus.fromLon + (bus.toLon - bus.fromLon) * t
      } else if (bus.speed > 0) {
        const next = offset(bus.lat, bus.lon, bus.bearing, bus.speed * dt)
        bus.lat = next.lat
        bus.lon = next.lon
        snapBus(bus)
      } else {
        continue
      }
      bus.marker.setLatLng([bus.lat, bus.lon])
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
