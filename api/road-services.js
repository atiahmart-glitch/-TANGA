const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const HEIGIT_API_KEY = process.env.HEIGIT_API_KEY;
const ORS_BASE = "https://api.heigit.org/openrouteservice";

function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}
function text(value, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function coords(lat, lon) {
  return Number.isFinite(lat) && Number.isFinite(lon) &&
    lat >= 4.5 && lat <= 11.5 && lon >= -3.5 && lon <= 1.5;
}
async function geocode(query) {
  const url = new URL(ORS_BASE + "/pelias/v1/search");
  url.searchParams.set("text", query + ", Ghana");
  url.searchParams.set("boundary.country", "GHA");
  url.searchParams.set("size", "1");
  const response = await fetch(url, { headers: { Authorization: HEIGIT_API_KEY, Accept: "application/json" } });
  if (!response.ok) throw new Error("Place search is unavailable");
  const data = await response.json();
  const feature = data.features && data.features[0];
  if (!feature || !Array.isArray(feature.geometry.coordinates)) throw new Error("Ghana place not found");
  return { coordinates: feature.geometry.coordinates, label: feature.properties && feature.properties.label || query };
}
async function route(res, body) {
  if (!HEIGIT_API_KEY) return json(res, 503, { error: "Routing provider is not configured yet." });
  const from = text(body.from, 160), to = text(body.to, 160);
  if (!from || !to) return json(res, 400, { error: "Enter a start and destination in Ghana." });
  try {
    const [origin, destination] = await Promise.all([geocode(from), geocode(to)]);
    const response = await fetch(ORS_BASE + "/openrouteservice/v2/directions/driving-car/geojson", {
      method: "POST",
      headers: { Authorization: HEIGIT_API_KEY, "Content-Type": "application/json", Accept: "application/geo+json" },
      body: JSON.stringify({ coordinates: [origin.coordinates, destination.coordinates], instructions: true })
    });
    const data = await response.json();
    if (!response.ok) return json(res, 502, { error: "Route provider could not calculate this trip." });
    const feature = data.features && data.features[0];
    if (!feature) return json(res, 502, { error: "No drivable route was returned." });
    const summary = feature.properties && feature.properties.summary || {};
    return json(res, 200, {
      type: "FeatureCollection", features: [feature],
      from: origin.label, to: destination.label,
      distanceMeters: summary.distance, durationSeconds: summary.duration,
      provider: "HeiGIT openrouteservice", calculatedAt: new Date().toISOString()
    });
  } catch (error) {
    return json(res, 502, { error: error.message || "Route service unavailable." });
  }
}
async function supabaseRequest(path, key, options = {}) {
  return fetch(SUPABASE_URL + "/rest/v1/" + path, {
    ...options,
    headers: {
      apikey: key, Authorization: "Bearer " + key,
      "Content-Type": "application/json", Accept: "application/json",
      ...(options.headers || {})
    }
  });
}
async function listPublic(res, table, select, filter) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return json(res, 503, { error: "Road data service is not configured yet.", items: [] });
  const url = new URL(SUPABASE_URL + "/rest/v1/" + table);
  url.searchParams.set("select", select);
  url.searchParams.set("status", "eq.verified");
  url.searchParams.set("expires_at", "gt." + new Date().toISOString());
  url.searchParams.set("order", "created_at.desc");
  url.searchParams.set("limit", "100");
  if (filter) Object.entries(filter).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + SUPABASE_ANON_KEY } });
  if (!response.ok) return json(res, 502, { error: "Could not load verified data.", items: [] });
  return json(res, 200, { items: await response.json() });
}
async function submit(res, table, payload) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return json(res, 503, { error: "Report storage is not configured yet." });
  const response = await supabaseRequest(table, SUPABASE_ANON_KEY, {
    method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ ...payload, status: "pending" })
  });
  if (!response.ok) return json(res, 502, { error: "Could not save this submission." });
  return json(res, 201, { saved: true, status: "pending", message: "Received for review; not yet visible to other drivers." });
}
module.exports = async function handler(req, res) {
  const action = String(req.query.action || "");
  if (action === "route" && req.method === "POST") return route(res, req.body || {});
  if (action === "reports" && req.method === "GET") return listPublic(res, "road_reports", "id,category,details,location_label,latitude,longitude,direction,created_at,expires_at", {});
  if (action === "fuel" && req.method === "GET") return listPublic(res, "fuel_price_reports", "id,station_name,product,price_ghs_per_litre,location_label,latitude,longitude,created_at,expires_at", {});
  if ((action === "reports" || action === "fuel") && req.method === "POST") {
    const body = req.body || {};
    const latitude = Number(body.latitude), longitude = Number(body.longitude);
    if (!coords(latitude, longitude)) return json(res, 400, { error: "A valid Ghana location is required." });
    if (action === "reports") {
      const category = text(body.category, 60);
      const allowed = ["Hazard / object", "Roadworks", "Crash / breakdown", "Signal / camera", "Night danger", "Trotro / bus alert"];
      if (!allowed.includes(category)) return json(res, 400, { error: "Choose a supported road report type." });
      return submit(res, "road_reports", {
        category, details: text(body.details, 1000), location_label: text(body.location_label, 180),
        latitude, longitude, direction: text(body.direction, 80) || null,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });
    }
    const product = text(body.product, 20);
    const price = Number(body.price_ghs_per_litre);
    if (!["petrol", "diesel", "lpg"].includes(product) || !Number.isFinite(price) || price <= 0 || price > 1000)
      return json(res, 400, { error: "Enter petrol, diesel or LPG and a valid price." });
    return submit(res, "fuel_price_reports", {
      station_name: text(body.station_name, 120), product, price_ghs_per_litre: price,
      location_label: text(body.location_label, 180), latitude, longitude,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    });
  }
  res.setHeader("Allow", "GET, POST");
  return json(res, 405, { error: "Method or action not supported." });
};
