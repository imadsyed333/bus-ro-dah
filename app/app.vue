<template>
  <div class="wrap">
    <div ref="mapEl" class="map" />
    <aside v-if="selected" class="card" :style="{ '--accent': occupancyColor(selected.occupancy) }">
      <button class="card-close" type="button" aria-label="Close" @click="selected = null">×</button>
      <header class="card-head">
        <span class="card-icon">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5V16h-1.05a2.25 2.25 0 0 1-4.4 0h-3.1a2.25 2.25 0 0 1-4.4 0H5V6.5ZM7 7v4h10V7H7Zm1.25 10.25a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm7.5 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"/></svg>
        </span>
        <span class="card-route">{{ selected.routeId || '—' }}</span>
      </header>
      <p class="card-speed">{{ (selected.speed * 3.6).toFixed(1) }} <small>km/h</small></p>
      <div class="card-row">
        <span class="chip" :class="selected.speed > 0 ? 'chip-move' : 'chip-stop'">
          {{ selected.speed > 0 ? 'Moving' : 'Stopped' }}
        </span>
        <span>{{ occupancyLabel(selected.occupancy) }}</span>
      </div>
    </aside>
  </div>
</template>

<script setup>
import 'leaflet/dist/leaflet.css'
import { offset } from '~/utils/deadReckon'
import { indexCentreline, snap } from '~/utils/snapToLine'

const BUS_SVG = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5V16h-1.05a2.25 2.25 0 0 1-4.4 0h-3.1a2.25 2.25 0 0 1-4.4 0H5V6.5ZM7 7v4h10V7H7Zm1.25 10.25a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm7.5 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"/></svg>'

const mapEl = ref(null)
const selected = ref(null)
const fleet = new Map()
let snapIndex = null

function occupancyLabel(raw) {
  if (!raw) return 'Unknown'
  return raw.toLowerCase().split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
}

function occupancyColor(raw) {
  switch (raw) {
    case 'EMPTY':
    case 'MANY_SEATS_AVAILABLE':
      return '#2f9e44'
    case 'FEW_SEATS_AVAILABLE':
      return '#f08c00'
    case 'STANDING_ROOM_ONLY':
      return '#e8590c'
    case 'CRUSHED_STANDING_ROOM_ONLY':
    case 'FULL':
      return '#e03131'
    default:
      return '#495057'
  }
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
}

function pinIcon(L, bus) {
  return L.divIcon({
    className: 'bus-pin-wrap',
    iconSize: [52, 26],
    iconAnchor: [26, 26],
    html: `<span class="bus-pin" style="background:${occupancyColor(bus.occupancy)}">${BUS_SVG}<b>${esc(bus.routeId || '—')}</b></span>`,
  })
}

function selectBus(bus) {
  selected.value = { id: bus.id, routeId: bus.routeId, speed: bus.speed, occupancy: bus.occupancy }
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
      rec.marker.setIcon(pinIcon(L, rec))
      if (selected.value?.id === rec.id) selectBus(rec)
    } else {
      const bus = { ...v }
      snapBus(bus)
      const marker = L.marker([bus.lat, bus.lon], { icon: pinIcon(L, bus), keyboard: false })
        .addTo(map)
        .on('click', (e) => {
          L.DomEvent.stopPropagation(e)
          const live = fleet.get(v.id)
          if (live) selectBus(live)
        })
      fleet.set(v.id, { ...bus, marker })
    }
  }
  for (const [id, rec] of fleet) {
    if (seen.has(id)) continue
    rec.marker.remove()
    fleet.delete(id)
    if (selected.value?.id === id) selected.value = null
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
    'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    { attribution: '&copy; OpenStreetMap, Tiles style by Humanitarian OpenStreetMap Team hosted by OSM France | Centreline &copy; City of Toronto (OGL-Toronto)' },
  ).addTo(map)
  map.on('click', (e) => {
    if (e.originalEvent?.target?.closest?.('.bus-pin, .card')) return
    selected.value = null
  })
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
        style: { color: '#9aa3ad', weight: 1, opacity: 0.28 },
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
.wrap,
.map {
  height: 100%;
  margin: 0;
}
.wrap {
  position: relative;
}

.bus-pin-wrap {
  background: none;
  border: none;
  width: auto !important;
  height: auto !important;
}
.bus-pin {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding: 0 8px 0 6px;
  border-radius: 999px;
  color: #fff;
  font: 700 12px/1 system-ui, sans-serif;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.28);
  box-sizing: border-box;
  white-space: nowrap;
}
.bus-pin svg {
  display: block;
  flex-shrink: 0;
}
.bus-pin b {
  font: inherit;
}

.card {
  position: absolute;
  left: 12px;
  bottom: 28px;
  z-index: 1100;
  width: min(280px, calc(100% - 24px));
  padding: 16px 18px 14px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.16);
  border-top: 4px solid var(--accent);
  font-family: system-ui, sans-serif;
  color: #1a1d21;
}
.card-close {
  position: absolute;
  top: 8px;
  right: 10px;
  border: 0;
  background: none;
  font-size: 22px;
  line-height: 1;
  color: #868e96;
  cursor: pointer;
}
.card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--accent);
}
.card-icon {
  display: flex;
}
.card-icon svg {
  width: 22px;
  height: 22px;
}
.card-route {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
}
.card-speed {
  margin: 10px 0 8px;
  font-size: 32px;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1;
}
.card-speed small {
  font-size: 14px;
  font-weight: 600;
  color: #868e96;
}
.card-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #495057;
}
.chip {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}
.chip-move {
  background: #d3f9d8;
  color: #2b8a3e;
}
.chip-stop {
  background: #fff3bf;
  color: #e67700;
}
</style>
