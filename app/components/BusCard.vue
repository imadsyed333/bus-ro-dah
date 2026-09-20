<template>
  <aside class="card" :style="{ '--accent': occupancyColor(bus.occupancy) }">
    <button class="card-close" type="button" aria-label="Close" @click="emit('close')">×</button>
    <header class="card-head">
      <span class="card-icon">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5V16h-1.05a2.25 2.25 0 0 1-4.4 0h-3.1a2.25 2.25 0 0 1-4.4 0H5V6.5ZM7 7v4h10V7H7Zm1.25 10.25a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm7.5 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"/></svg>
      </span>
      <span class="card-route">{{ bus.routeId || '—' }}</span>
    </header>
    <p class="card-speed">{{ (bus.speed * 3.6).toFixed(1) }} <small>km/h</small></p>
    <div class="card-row">
      <span class="chip" :class="bus.speed > 0 ? 'chip-move' : 'chip-stop'">
        {{ bus.speed > 0 ? 'Moving' : 'Stopped' }}
      </span>
      <span>{{ occupancyLabel(bus.occupancy) }}</span>
    </div>
  </aside>
</template>

<script setup>
import { occupancyColor, occupancyLabel } from '~/utils/occupancy'

defineProps({
  bus: { type: Object, required: true },
})
const emit = defineEmits(['close'])
</script>

<style scoped>
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
.chip.chip-move {
  background: #d3f9d8;
  color: #2b8a3e;
}
.chip.chip-stop {
  background: #fff3bf;
  color: #e67700;
}
</style>
