# TANGA

A mobile-friendly Ghana road-awareness website built with Leaflet and OpenStreetMap.

## Working in this branch

- Ghana map, place search, and current-location marker.
- Optional map overlays for OpenStreetMap-mapped traffic lights, physical traffic signs, schools, rest stops, food places, hospitals, police stations, and selected road barriers in a zoomed-in visible area.
- Vercel API routes for road reports, fuel-price reports, and car routes.
- Driver reports and fuel submissions are held as pending until reviewed. Only verified, unexpired records are returned to the public map.
- Route lookup uses the HeiGIT openrouteservice API and reports distance/time estimates without claiming live traffic.
- Offline submissions queue in the browser. Users can download a local JSON bundle of the last route and cached verified reports/prices.
- Service worker caches the app shell after an online visit.

## Setup required

See [ROAD_SERVICES_SETUP.md](ROAD_SERVICES_SETUP.md). Apply the Supabase migration, then add `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `HEIGIT_API_KEY` in Vercel. Until those are configured, APIs return clear unavailable states; the UI does not invent reports or fuel prices.

The initial implementation still needs moderator tooling, rate limiting or authenticated submissions, and an approved fuel data source before a broad public launch. Fuel prices currently come from driver submissions, not an official Ghana-wide live feed. Confidential police conduct complaints are excluded from the public service.

## Map and offline terms

The map uses the public OpenStreetMap standard raster tile server with attribution. Those tiles require internet and may not be bulk downloaded or prefetched for offline regions. The offline export saves route/report/price data, not map tiles. Choose an OSM-derived provider or self-hosted tiles whose terms explicitly allow offline use before implementing regional map downloads. See the [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/).

Place search uses public Nominatim for this lightweight preview. It is limited to one request per second for the whole application and should be replaced by a contracted or self-hosted service before significant public use. See the [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/).

## Deployment

Vercel can create a preview deployment for this branch. Production at `usetanga.com` should be updated after review and merge.
