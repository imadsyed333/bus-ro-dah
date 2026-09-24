# Transitarium

Transitarium is a web app displaying the entire TTC bus network live (ish). Uses TTC's live vehicle position feed: (https://bustime.ttc.ca/gtfsrt/vehicles?debug)[https://bustime.ttc.ca/gtfsrt/vehicles?debug]. Built using Nuxt and Leaflet.

There are probably similar, more useful apps out there. I just haven't come across an app that displays the buses like ants in an ant farm. Much better to stare at moving buses than doomscrolling.

<img height="400" alt="image" src="https://github.com/user-attachments/assets/4ffdba01-2c52-40db-bc0e-10d955aa5594" />
<img height="400" alt="Screen Shot 2026-09-24 at 19 41 34" src="https://github.com/user-attachments/assets/1f50387d-f3ca-4059-9e6e-49d74713a4e5" />

## How it works

Every 15s or so, Transitarium fetches vehicle information from TTC's live feed. This provides:
- coordinates
- occupancy
- speed
- route number

This is then cached on the server so client instances of Transitarium don't bombard the TTC with excessive requests for data.

The client uses vehicle information to populate a map with markers denoting route number and occupancy. What differentiates this from similar apps is that I use the given speed and location to move the buses along the Toronto street network.

Now, this does mean that when a data refetch happens, buses appear to suddenly glide to their live position "unnaturally". Does this break the immersion? Yeah. But I'd put up with a 1 second hiccup if I can get to stare at buses moving like little ants in an ant farm.

