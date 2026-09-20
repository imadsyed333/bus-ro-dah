<template>
  <div class="toolbar">
    <div class="search">
      <input
        v-model="query"
        type="search"
        placeholder="Search route"
        aria-label="Search route"
        autocomplete="off"
        @keydown.enter.prevent="emit('addExact')"
      >
      <ul v-if="query.trim() && suggestions.length" class="suggest">
        <li v-for="id in suggestions" :key="id">
          <button type="button" @click="emit('add', id)">{{ id }}</button>
        </li>
      </ul>
    </div>
    <div v-if="routes.length" class="pills">
      <span v-for="id in routes" :key="id" class="route-pill">
        {{ id }}
        <button type="button" :aria-label="`Remove route ${id}`" @click="emit('remove', id)">×</button>
      </span>
    </div>
    <details class="filters">
      <summary>Filters</summary>
      <div class="filters-body">
        <fieldset>
          <legend>Occupancy</legend>
          <label v-for="opt in occupancyOpts" :key="opt.id">
            <input type="checkbox" :value="opt.id" v-model="occupancy">
            <i :style="{ background: opt.color }" />
            {{ opt.label }}
          </label>
        </fieldset>
        <fieldset>
          <legend>Status</legend>
          <label v-for="opt in motionOpts" :key="opt.id">
            <input type="checkbox" :value="opt.id" v-model="motion">
            {{ opt.label }}
          </label>
        </fieldset>
      </div>
    </details>
  </div>
</template>

<script setup>
import { occupancyOpts, motionOpts } from '~/utils/occupancy'

const query = defineModel('query', { type: String, required: true })
const routes = defineModel('routes', { type: Array, required: true })
const occupancy = defineModel('occupancy', { type: Array, required: true })
const motion = defineModel('motion', { type: Array, required: true })
defineProps({
  suggestions: { type: Array, required: true },
})
const emit = defineEmits(['add', 'addExact', 'remove'])
</script>

<style scoped>
.toolbar {
  position: absolute;
  top: 12px;
  left: 56px;
  z-index: 1100;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 8px;
  max-width: calc(100% - 180px);
  font-family: system-ui, sans-serif;
}
.filters {
  flex-basis: 100%;
  padding: 10px 12px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.14);
}
.filters summary {
  list-style: none;
  cursor: pointer;
  font: 700 12px/1 system-ui, sans-serif;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #1a1d21;
  display: flex;
  align-items: center;
  gap: 6px;
}
.filters summary::-webkit-details-marker {
  display: none;
}
.filters summary::before {
  content: "";
  width: 0;
  height: 0;
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
  border-left: 6px solid #868e96;
}
.filters[open] summary::before {
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 6px solid #868e96;
  border-bottom: 0;
}
.filters-body {
  display: flex;
  gap: 16px;
  padding-top: 10px;
}
.filters fieldset {
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;
}
.filters legend {
  padding: 0 0 6px;
  font: 700 11px/1 system-ui, sans-serif;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #868e96;
}
.filters label {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 0;
  font: 600 13px/1.2 system-ui, sans-serif;
  color: #1a1d21;
  cursor: pointer;
}
.filters i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.search {
  position: relative;
}
.search input {
  width: 160px;
  height: 34px;
  padding: 0 12px;
  border: 0;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.14);
  font: 600 13px/1 system-ui, sans-serif;
  color: #1a1d21;
}
.search input:focus {
  outline: 2px solid #4dabf7;
}
.suggest {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  min-width: 100%;
  margin: 0;
  padding: 4px;
  list-style: none;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
  max-height: 240px;
  overflow: auto;
}
.suggest button {
  display: block;
  width: 100%;
  padding: 7px 10px;
  border: 0;
  border-radius: 8px;
  background: none;
  text-align: left;
  font: 600 13px/1 system-ui, sans-serif;
  color: #1a1d21;
  cursor: pointer;
}
.suggest button:hover {
  background: #f1f3f5;
}
.pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-top: 2px;
}
.route-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 30px;
  padding: 0 6px 0 10px;
  border-radius: 999px;
  background: #1a1d21;
  color: #fff;
  font: 700 12px/1 system-ui, sans-serif;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}
.route-pill button {
  border: 0;
  background: none;
  color: #adb5bd;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  padding: 0 2px;
}
@media (max-width: 768px) {
  .toolbar {
    position: relative;
    top: auto;
    left: auto;
    max-width: none;
    width: 100%;
    flex-direction: column;
    gap: 10px;
  }
  .search,
  .search input,
  .filters {
    width: 100%;
    flex-basis: auto;
    box-sizing: border-box;
  }
  .search input {
    height: 44px;
    font-size: 16px;
  }
  .suggest {
    top: auto;
    bottom: calc(100% + 4px);
    z-index: 2;
  }
  .suggest button {
    padding: 12px;
    font-size: 16px;
  }
  .pills {
    gap: 8px;
  }
  .route-pill {
    height: 40px;
    padding: 0 8px 0 14px;
    font-size: 15px;
  }
  .route-pill button {
    font-size: 22px;
    padding: 4px 8px;
  }
  .filters summary {
    min-height: 44px;
    font-size: 13px;
  }
  .filters legend {
    font-size: 13px;
  }
  .filters label {
    min-height: 44px;
    font-size: 16px;
  }
}
</style>
