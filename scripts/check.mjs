import assert from 'node:assert/strict'
import { parseGtfsRtDebug } from '../server/utils/parseGtfsRtDebug.ts'
import { offset } from '../app/utils/deadReckon.ts'
import { indexCentreline, snap } from '../app/utils/snapToLine.ts'
import { occupancyColor, occupancyBucket, occupancyLabel } from '../app/utils/occupancy.ts'

const sample = `
header {
 gtfs_realtime_version: "2.0"
 timestamp: 1
}
entity {
 id: "1"
 vehicle {
 trip {
 trip_id: "3006070"
 route_id: "52"
 }
 position {
 latitude: 43.715366
 longitude: -79.447845
 bearing: 254.0
 speed: 4.91744
 }
 vehicle {
 id: "3640"
 }
 occupancy_status: FEW_SEATS_AVAILABLE
 }
}
entity {
 id: "2"
 vehicle {
 trip { route_id: "96" }
 }
}
entity {
 id: "3"
 vehicle {
 position {
 latitude: 43.65
 longitude: -79.38
 }
 vehicle {
 id: "9999"
 }
 }
}
`

const { vehicles, timestamp } = parseGtfsRtDebug(sample)
assert.equal(timestamp, 1)
assert.equal(vehicles.length, 1)
assert.deepEqual(vehicles[0], {
  id: '3640',
  routeId: '52',
  lat: 43.715366,
  lon: -79.447845,
  bearing: 254.0,
  speed: 4.91744,
  occupancy: 'FEW_SEATS_AVAILABLE',
})

const north = offset(43, -79, 0, 111.32)
assert.ok(Math.abs(north.lat - 43.001) < 1e-12, `lat ${north.lat}`)
assert.ok(Math.abs(north.lon - -79) < 1e-12, `lon ${north.lon}`)

const roads = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: [[-79, 43], [-79, 43.001]] },
  }],
}
const idx = indexCentreline(roads)
const on = snap(idx, 43.0005, -79.0003, 0)
assert.ok(Math.abs(on.lon - -79) < 1e-6, `snap lon ${on.lon}`)
assert.ok(Math.abs(on.lat - 43.0005) < 1e-6, `snap lat ${on.lat}`)
const far = snap(idx, 43.5, -79.5, 0)
assert.equal(far.lat, 43.5)
assert.equal(far.lon, -79.5)

assert.equal(occupancyColor('EMPTY'), occupancyColor('MANY_SEATS_AVAILABLE'))
assert.equal(occupancyColor('FEW_SEATS_AVAILABLE'), '#f08c00')
assert.equal(occupancyColor('FULL'), '#e03131')
assert.equal(occupancyColor(), '#495057')
assert.equal(occupancyBucket('EMPTY'), 'available')
assert.equal(occupancyBucket('STANDING_ROOM_ONLY'), 'crowded')
assert.equal(occupancyBucket('CRUSHED_STANDING_ROOM_ONLY'), 'crowded')
assert.equal(occupancyBucket(), '')
assert.equal(occupancyLabel('FEW_SEATS_AVAILABLE'), 'Few Seats Available')
assert.equal(occupancyLabel(), 'Unknown')

console.log('ok')
