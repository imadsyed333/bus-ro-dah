I want to create an app that displays a map of Toronto with live bus locations overlayed.

Bus data must be fetched from https://bustime.ttc.ca/gtfsrt/vehicles?debug every minute.

The frontend should display a map with all the fetched busses as points on the map. These points should be moving with the speed and direction that the fetched data provides. Hovering over these points should display a modal with more information such as route id, speed, and occupancy status.
