# TANGA

A mobile-first Ghana road awareness prototype. This is a static website that can be published with GitHub Pages.

## Publish on GitHub Pages

1. Create or open the `-TANGA` repository.
2. Upload **all files in this folder**, keeping the same folder structure. `index.html` must be in the repository root.
3. In GitHub, open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and `/(root)`, then save.
5. Wait for the Pages deployment and open the URL shown in that settings page.

## Test locally

Opening `index.html` directly works for the prototype. To test the install prompt and offline app-shell caching, serve the folder over HTTPS or localhost. For example, with Python installed:

```sh
python -m http.server 8000
```

Then open `http://localhost:8000` in a browser.

## Included files

- `index.html` — responsive TANGA interface and demo interactions
- `manifest.webmanifest` — install metadata for Android and supported desktop browsers
- `sw.js` — caches the app shell after the first online visit
- `icon.svg` — app icon
- `.nojekyll` — tells GitHub Pages to serve all files directly

## Before public launch

The map, alerts, fuel price, route estimates, and reports in this prototype are illustrative sample content. The offline worker caches the app shell only; it does not download Ghana map tiles or live data. Production requires a licensed map provider, verified official/public datasets and live integrations, a backend for shared reports and moderation, privacy and safety review, push notifications, and app-store billing for native Android/iPhone subscriptions. Do not treat sample information as verified road guidance.
