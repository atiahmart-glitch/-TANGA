# TANGA

A mobile-friendly Ghana road-awareness website. The current branch replaces the decorative map with an interactive map using Leaflet and OpenStreetMap.

## What works in this preview

- Interactive OpenStreetMap map centered on Ghana, with pan and zoom.
- Place search through the OpenStreetMap Nominatim service, limited to Ghana and triggered only when the user submits a search.
- Optional current-location marker, after the user grants browser location permission.
- Online/offline status display. The service worker caches the same-origin app shell after the first visit.

## What is not connected yet

Road incidents, verified police/camera locations, fuel prices, route times, public report sharing, subscriptions, and downloaded offline map areas are not live services. The app shows empty or unavailable states instead of sample alerts or sample prices. A report submitted in this preview appears only in the current browser session and is not shared.

## Map source and service limits

The map uses Leaflet 1.9.4 and OpenStreetMap standard raster tiles with visible attribution. The tiles require an internet connection. OpenStreetMap's standard tile service does not permit offline tile use, bulk prefetching, or use that overloads its volunteer infrastructure. Before a larger public launch, move to a map provider or hosted tileset whose pricing, service guarantees, and offline terms fit TANGA. See the [OpenStreetMap tile policy](https://operations.osmfoundation.org/policies/tiles/).

Place search uses the public Nominatim service only for this lightweight preview. It has a strict maximum of one request per second for the whole application and does not support autocomplete. Before significant public use, move search to a contracted provider or a properly operated service. See the [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/).

## Deployment

The site is static and can be served by Vercel from the repository root. The existing Vercel project can create a preview deployment for this branch. Production on `usetanga.com` should be updated only after the preview is reviewed and this branch is merged.

## Offline behavior

After one online visit, the service worker can reopen the app shell while offline. The base map tiles and place search still need internet. This is not turn-by-turn navigation and should not be used as a substitute for official road instructions.
