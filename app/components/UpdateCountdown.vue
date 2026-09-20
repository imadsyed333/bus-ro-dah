<template>
  <div class="countdown" aria-label="Next update">
    <span class="label">Next update</span>
    <span class="time">{{ seconds }}s</span>
  </div>
</template>

<script setup>
defineProps({
  seconds: { type: Number, required: true },
})
</script>

<style scoped>
.countdown {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 1100;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.14);
  font-family: system-ui, sans-serif;
}
.label {
  font: 700 11px/1 system-ui, sans-serif;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #868e96;
}
.time {
  font: 700 18px/1 system-ui, sans-serif;
  color: #1a1d21;
}
</style>
