# TANGA

A mobile-friendly Ghana road-awareness website built with Leaflet and OpenStreetMap.

## Working in this branch

- Ghana map, place search, and current-location marker.
- Optional map overlays for OpenStreetMap-mapped traffic lights and cameras, physical traffic signs, schools, fuel stations, rest stops, food places, hospitals, police stations, and selected road barriers in a zoomed-in visible area.
- Vercel API routes for road reports, fuel-price reports, and car routes.
- Driver reports and fuel submissions are held as pending until reviewed. Only verified, unexpired records are returned to the public map. The submitting browser keeps a private copy of pending reports and their location pins; they are not shared with other drivers.
- Route lookup uses the HeiGIT openrouteservice API and reports distance/time estimates without claiming live traffic. The dashboard states which feeds are configured and distinguishes estimated routes from live traffic.
- Offline submissions queue in the browser. Users can download a local JSON bundle of the last route and cached verified reports/prices. A submitter's pending report remains in that browser's private report list until it is verified or removed locally.
- Service worker caches the app shell after an online visit.

## Setup required

See [ROAD_SERVICES_SETUP.md](ROAD_SERVICES_SETUP.md). Apply the Supabase migration, then add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as Vercel server-side environment variables, plus `HEIGIT_API_KEY` for routing. Do not expose the service-role key in browser code. Report/fuel endpoints return a `setup_required` response until Supabase is configured.

The initial implementation still needs moderator tooling, rate limiting or authenticated submissions, and an approved fuel data source before a broad public launch. Fuel prices currently come from verified driver submissions, not an official Ghana-wide live station-price feed. Ghana’s NPA publishes price floors in periodic pricing windows; these are indicative floors, not current prices at individual stations. A live Waze incidents feed requires an approved Waze for Cities partnership and its private feed URL. Until that is configured, road incidents come from moderated TANGA driver reports. Confidential police conduct complaints are excluded from the public service.

## Map and offline terms

The map uses the public OpenStreetMap standard raster tile server with attribution. Those tiles require internet and may not be bulk downloaded or prefetched for offline regions. The offline export saves route/report/price data, not map tiles. Choose an OSM-derived provider or self-hosted tiles whose terms explicitly allow offline use before implementing regional map downloads. See the [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/).

Place search uses public Nominatim for this lightweight preview. It is limited to one request per second for the whole application and should be replaced by a contracted or self-hosted service before significant public use. See the [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/).

## Deployment

The road-services update is proposed for review in a pull request. Vercel preview and the custom domain should be checked before merging.
