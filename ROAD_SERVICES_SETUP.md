# TANGA road services setup

This branch adds a Vercel Node function at `/api/road-services` and a Supabase migration for moderated reports and fuel prices.

## Supabase

1. In the Supabase SQL editor, run `supabase/migrations/202611070001_road_fuel_services.sql`.
2. Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to Vercel for report and fuel storage. Set `HEIGIT_API_KEY` for routing.
3. Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only. Never add it to browser code or a public `NEXT_PUBLIC_*`/Vite `VITE_*` variable. The function returns `{ "setup_required": true }` with HTTP 200 for report/fuel API actions until Supabase URL and service key are configured.
4. Public reads are filtered to non-expired records with `status=verified`. Driver submissions are saved with `status=pending`; a moderator must verify them before they appear.

Routes:

- `GET /api/road-services?action=reports`
- `POST /api/road-services?action=reports`
- `GET /api/road-services?action=fuel`
- `POST /api/road-services?action=fuel`
- `POST /api/road-services?action=route` with `{"from":"Accra","to":"Kumasi"}`

## Routing

Create a HeiGIT account and API key, then set `HEIGIT_API_KEY` in Vercel. TANGA calls the server-side HeiGIT openrouteservice API for Ghana geocoding and car routing. API keys remain on the server. See [HeiGIT's API migration announcement](https://ask.openrouteservice.org/t/deprecating-api-openrouteservice-org-in-favour-of-api-heigit-org/7912).

## Data quality and privacy

- Reports and fuel prices are crowd submissions, not official nationwide feeds. They stay pending until someone verifies them. The API does not expose pending rows.
- Fuel prices expire after seven days; road reports expire after one day.
- Police conduct complaints are intentionally excluded from this public report service. They need a separate private, access-controlled and moderated workflow.
- This initial endpoint is an integration foundation. Before a public launch, add abuse controls (rate limiting/CAPTCHA or authenticated submissions), moderator tooling, and privacy/retention rules.

## Map feature overlays

The map can query OpenStreetMap for mapped traffic signals, physical traffic-sign nodes, schools, rest areas/service areas, restaurants/cafes/fast-food places, hospitals, public-facing police stations, and selected physical road barriers inside a small visible bounding box. A barrier marker describes a mapped physical feature; it does not say whether a road is currently blocked. This is a community map layer, not a complete or official inventory; missing objects should not be interpreted as absence on the road. Camera records are community-mapped points, not an official inventory or confirmation that a camera is active. These map features are not a live incident feed. The National Petroleum Authority publishes periodic price floors, not live station-by-station prices. Waze's live incident data is available to approved Waze for Cities partners; add an authorized feed integration only after TANGA receives its partner feed URL. Do not scrape private or undocumented traffic endpoints. The shared public Overpass API is intended for modest use and can be overloaded. Keep queries user-triggered and bounded; before wider launch, add caching and move to a contracted endpoint or a self-hosted OSM extract.

## Offline

The existing service worker caches the app shell. Report and fuel submissions can be queued in this browser until connectivity returns. The UI can export the last route and locally cached verified report/fuel data as a JSON file. The current OpenStreetMap standard raster tile service does not allow offline area downloads. Do not add tile prefetching to it. For offline map downloads, choose an OSM-derived tile provider or self-hosted vector tiles whose terms explicitly permit offline downloads, then add a bounded download manager and attribution.
