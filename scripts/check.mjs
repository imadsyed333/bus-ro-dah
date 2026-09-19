import assert from 'node:assert/strict'
import { parseGtfsRtDebug } from '../server/utils/parseGtfsRtDebug.ts'
import { offset } from '../app/utils/deadReckon.ts'

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
`

const vehicles = parseGtfsRtDebug(sample)
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

console.log('ok')
