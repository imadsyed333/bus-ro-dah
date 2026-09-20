<template>
  <div class="wrap">
    <div ref="mapEl" class="map" />
    <UpdateCountdown :seconds="nextUpdateIn" />
    <div class="dock">
      <BusCard v-if="selected" :bus="selected" @close="selected = null" />
      <RouteToolbar
        v-model:query="query"
        v-model:routes="selectedRoutes"
        v-model:occupancy="selectedOccupancy"
        v-model:motion="selectedMotion"
        :suggestions="suggestions"
        @add="addRoute"
        @add-exact="addExact"
        @remove="removeRoute"
      />
    </div>
  </div>
</template>

<script setup>
import 'leaflet/dist/leaflet.css'

const mapEl = ref(null)
const {
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
} = useBusMap(mapEl)
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
.bus-pin.is-selected {
  transform: scale(1.25);
  transform-origin: 50% 100%;
  box-shadow: 0 0 0 2px #fff, 0 3px 10px rgba(0, 0, 0, 0.4);
}
.dock {
  display: contents;
}
@media (max-width: 768px) {
  .leaflet-control-zoom {
    display: none;
  }
  .dock {
    display: flex;
    flex-direction: column;
    gap: 8px;
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1100;
    width: 100%;
    padding: 8px 8px calc(8px + env(safe-area-inset-bottom, 0px));
    box-sizing: border-box;
  }
}
</style>
