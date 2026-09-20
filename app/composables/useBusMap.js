import { offset } from '~/utils/deadReckon'
import { indexCentreline, snap } from '~/utils/snapToLine'
import { BUS_SVG, occupancyBucket, occupancyColor } from '~/utils/occupancy'

const POLL_MS = 15_000

export function useBusMap(mapEl) {
  const selected = ref(null)
  const query = ref('')
  const selectedRoutes = ref([])
  const selectedOccupancy = ref([])
  const selectedMotion = ref([])
  const knownRoutes = ref([])
  const nextUpdateIn = ref(POLL_MS / 1000)
  const fleet = new Map()
  let snapIndex = null
  let poll
  let move
  let countdown
  let nextPollAt = 0
  let map
  let L
  let lastFeedTs
  let onVis

  function remaining() {
    return Math.max(0, Math.ceil((nextPollAt - Date.now()) / 1000))
  }

  function armPollClock() {
    nextPollAt = Date.now() + POLL_MS
    nextUpdateIn.value = remaining()
  }

  function matchesFilter(bus) {
    if (selectedRoutes.value.length && !selectedRoutes.value.includes(bus.routeId)) return false
    if (selectedOccupancy.value.length && !selectedOccupancy.value.includes(occupancyBucket(bus.occupancy))) return false
    if (selectedMotion.value.length) {
      const moving = bus.speed > 0
      if (moving && !selectedMotion.value.includes('moving')) return false
      if (!moving && !selectedMotion.value.includes('stopped')) return false
    }
    return true
  }

  function syncFilter() {
    if (!map) return
    for (const bus of fleet.values()) {
      const on = matchesFilter(bus)
      const shown = map.hasLayer(bus.marker)
      if (on && !shown) bus.marker.addTo(map)
      else if (!on && shown) bus.marker.remove()
    }
    if (selected.value && !matchesFilter(selected.value)) selected.value = null
  }

  function refreshRoutes() {
    const ids = new Set()
    for (const bus of fleet.values()) {
      if (bus.routeId) ids.add(bus.routeId)
    }
    knownRoutes.value = [...ids].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  }

  const suggestions = computed(() => {
    const q = query.value.trim().toLowerCase()
    if (!q) return []
    return knownRoutes.value.filter(id => id.toLowerCase().startsWith(q) && !selectedRoutes.value.includes(id))
  })

  function fitSelection() {
    if (!map || !selectedRoutes.value.length) return
    const pts = []
    for (const bus of fleet.values()) {
      if (matchesFilter(bus)) pts.push([bus.lat, bus.lon])
    }
    if (!pts.length) return
    if (pts.length === 1) map.setView(pts[0], 14)
    else map.fitBounds(pts, { padding: [48, 48], maxZoom: 15 })
  }

  function addRoute(id) {
    if (!id || selectedRoutes.value.includes(id)) return
    selectedRoutes.value = [...selectedRoutes.value, id]
    query.value = ''
    fitSelection()
  }

  function addExact() {
    const q = query.value.trim().toLowerCase()
    const exact = suggestions.value.find(id => id.toLowerCase() === q)
    if (exact) addRoute(exact)
  }

  function removeRoute(id) {
    const refit = selectedRoutes.value.length > 2
    selectedRoutes.value = selectedRoutes.value.filter(r => r !== id)
    if (refit) fitSelection()
  }

  watch([selectedRoutes, selectedOccupancy, selectedMotion], syncFilter, { deep: true })

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
  }

  function pinIcon(bus) {
    const on = selected.value?.id === bus.id
    return L.divIcon({
      className: on ? 'bus-pin-wrap is-selected' : 'bus-pin-wrap',
      iconSize: [52, 26],
      iconAnchor: [26, 26],
      html: `<span class="bus-pin${on ? ' is-selected' : ''}" style="background:${occupancyColor(bus.occupancy)}">${BUS_SVG}<b>${esc(bus.routeId || '—')}</b></span>`,
    })
  }

  function restylePin(bus) {
    if (!L || !bus?.marker) return
    bus.marker.setIcon(pinIcon(bus))
    bus.marker.setZIndexOffset(selected.value?.id === bus.id ? 10000 : 0)
  }

  watch(() => selected.value?.id, (id, prev) => {
    if (prev) restylePin(fleet.get(prev))
    if (id) restylePin(fleet.get(id))
  })

  function followCenter(lat, lon, z = map.getZoom()) {
    const pad = (document.querySelector('.dock')?.getBoundingClientRect().height || 0) / 2
    if (!pad) return [lat, lon]
    const p = map.project([lat, lon], z)
    p.y += pad
    const ll = map.unproject(p, z)
    return [ll.lat, ll.lng]
  }

  function selectBus(bus) {
    const switched = selected.value?.id !== bus.id
    selected.value = { id: bus.id, routeId: bus.routeId, speed: bus.speed, occupancy: bus.occupancy }
    if (switched && map) {
      nextTick(() => {
        const zoom = Math.max(map.getZoom(), 16)
        map.setView(followCenter(bus.lat, bus.lon, zoom), zoom)
      })
    }
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
        rec.marker.setIcon(pinIcon(rec))
        if (selected.value?.id === rec.id) selectBus(rec)
      } else {
        const bus = { ...v }
        snapBus(bus)
        const marker = L.marker([bus.lat, bus.lon], { icon: pinIcon(bus), keyboard: false })
          .on('click', (e) => {
            L.DomEvent.stopPropagation(e)
            const live = fleet.get(v.id)
            if (live) selectBus(live)
          })
        if (matchesFilter(bus)) marker.addTo(map)
        fleet.set(v.id, { ...bus, marker })
      }
    }
    for (const [id, rec] of fleet) {
      if (seen.has(id)) continue
      rec.marker.remove()
      fleet.delete(id)
      if (selected.value?.id === id) selected.value = null
    }
    refreshRoutes()
    syncFilter()
  }

  onMounted(async () => {
    const leaflet = await import('leaflet')
    L = leaflet.default ?? leaflet
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
      if (document.hidden) return
      armPollClock()
      try {
        const data = await $fetch('/api/vehicles')
        if (typeof data.timestamp === 'number' && data.timestamp === lastFeedTs) return
        if (typeof data.timestamp === 'number') lastFeedTs = data.timestamp
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
    armPollClock()
    loadCentreline()
    onVis = () => { if (!document.hidden) load() }
    document.addEventListener('visibilitychange', onVis)
    poll = setInterval(load, POLL_MS)
    countdown = setInterval(() => { nextUpdateIn.value = remaining() }, 1000)
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
        if (selected.value?.id === bus.id) map.panTo(followCenter(bus.lat, bus.lon), { animate: false })
      }
    }, 100)
  })

  onUnmounted(() => {
    if (onVis) document.removeEventListener('visibilitychange', onVis)
    clearInterval(poll)
    clearInterval(move)
    clearInterval(countdown)
    map?.remove()
  })

  return {
    selected,
    query,
    selectedRoutes,
    selectedOccupancy,
    selectedMotion,
    suggestions,
    addRoute,
    addExact,
    removeRoute,
    nextUpdateIn,
  }
}
