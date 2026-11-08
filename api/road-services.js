const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const HEIGIT_API_KEY = process.env.HEIGIT_API_KEY || "";
const HEIGIT_BASE = "https://api.heigit.org";

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}
function result(status, body) {
  return { status, body };
}
function text(value, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function coords(lat, lon) {
  return Number.isFinite(lat) && Number.isFinite(lon) &&
    lat >= 4.5 && lat <= 11.5 && lon >= -3.5 && lon <= 1.5;
}
function readBody(req) {
  let body = req.body;
  if (typeof body === "string" || Buffer.isBuffer(body)) {
    try { body = JSON.parse(body.toString()); } catch { return null; }
  }
  return body && typeof body === "object" && !Array.isArray(body) ? body : null;
}
function setupRequired() {
  return result(200, { setup_required: true });
}
function supabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}
async function geocode(query) {
  const url = new URL(HEIGIT_BASE + "/pelias/v1/search");
  url.searchParams.set("text", query + ", Ghana");
  url.searchParams.set("boundary.country", "GHA");
  url.searchParams.set("size", "1");
  const response = await fetch(url, {
    headers: { Authorization: HEIGIT_API_KEY, Accept: "application/json" }
  });
  if (!response.ok) throw new Error("Place search is unavailable");
  const data = await response.json();
  const feature = data.features && data.features[0];
  if (!feature || !Array.isArray(feature.geometry.coordinates)) {
    throw new Error("Ghana place not found");
  }
  return {
    coordinates: feature.geometry.coordinates,
    label: feature.properties && feature.properties.label || query
  };
}
async function calculateRoute(body) {
  if (!HEIGIT_API_KEY) return result(503, { error: "Routing provider is not configured yet." });
  const from = text(body.from, 160);
  const to = text(body.to, 160);
  if (!from || !to) return result(400, { error: "Enter a start and destination in Ghana." });
  try {
    const [origin, destination] = await Promise.all([geocode(from), geocode(to)]);
    const response = await fetch(HEIGIT_BASE + "/openrouteservice/v2/directions/driving-car/geojson", {
      method: "POST",
      headers: {
        Authorization: HEIGIT_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/geo+json"
      },
      body: JSON.stringify({ coordinates: [origin.coordinates, destination.coordinates], instructions: true })
    });
    const data = await response.json();
    if (!response.ok) return result(502, { error: "Route provider could not calculate this trip." });
    const feature = data.features && data.features[0];
    if (!feature) return result(502, { error: "No drivable route was returned." });
    const summary = feature.properties && feature.properties.summary || {};
    return result(200, {
      type: "FeatureCollection",
      features: [feature],
      from: origin.label,
      to: destination.label,
      distanceMeters: summary.distance,
      durationSeconds: summary.duration,
      provider: "HeiGIT openrouteservice",
      calculatedAt: new Date().toISOString()
    });
  } catch (error) {
    return result(502, { error: error.message || "Route service unavailable." });
  }
}
async function supabaseRequest(path, options = {}) {
  return fetch(SUPABASE_URL + "/rest/v1/" + path, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers || {})
    }
  });
}
async function listPublic(table, select) {
  if (!supabaseConfigured()) return setupRequired();
  const url = new URL(SUPABASE_URL + "/rest/v1/" + table);
  url.searchParams.set("select", select);
  url.searchParams.set("status", "eq.verified");
  url.searchParams.set("expires_at", "gt." + new Date().toISOString());
  url.searchParams.set("order", "created_at.desc");
  url.searchParams.set("limit", "100");
  const response = await supabaseRequest(url.pathname.replace("/rest/v1/", "") + url.search);
  if (!response.ok) return result(502, { error: "Could not load verified data.", items: [] });
  return result(200, { items: await response.json() });
}
async function submit(table, payload) {
  if (!supabaseConfigured()) return setupRequired();
  const response = await supabaseRequest(table, {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ ...payload, status: "pending" })
  });
  if (!response.ok) return result(502, { error: "Could not save this submission." });
  return result(201, {
    saved: true,
    status: "pending",
    message: "Received for review; not yet visible to other drivers."
  });
}
async function handleSubmission(action, body) {
  if (!body) return result(400, { error: "A valid JSON object is required." });
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  if (!coords(latitude, longitude)) return result(400, { error: "A valid Ghana location is required." });
  if (action === "reports") {
    const category = text(body.category, 60);
    const allowed = [
      "Hazard / object", "Roadworks", "Crash / breakdown",
      "Signal / camera", "Night danger", "Trotro / bus alert"
    ];
    if (!allowed.includes(category)) return result(400, { error: "Choose a supported road report type." });
    return submit("road_reports", {
      category,
      details: text(body.details, 1000),
      location_label: text(body.location_label, 180),
      latitude,
      longitude,
      direction: text(body.direction, 80) || null,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });
  }
  const product = text(body.product, 20);
  const price = Number(body.price_ghs_per_litre);
  if (!["petrol", "diesel", "lpg"].includes(product) ||
      !Number.isFinite(price) || price <= 0 || price > 1000) {
    return result(400, { error: "Enter petrol, diesel or LPG and a valid price." });
  }
  return submit("fuel_price_reports", {
    station_name: text(body.station_name, 120),
    product,
    price_ghs_per_litre: price,
    location_label: text(body.location_label, 180),
    latitude,
    longitude,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  });
}

module.exports = async (req, res) => {
  try {
    const query = req.query || {};
    const action = Array.isArray(query.action) ? query.action[0] : query.action || "";
    const method = (req.method || "GET").toUpperCase();
    let output;

    if ((action === "reports" || action === "fuel") && !supabaseConfigured()) {
      output = setupRequired();
    } else if (action === "route" && method === "POST") {
      const body = readBody(req);
      output = body ? await calculateRoute(body) : result(400, { error: "A valid JSON object is required." });
    } else if (action === "reports" && method === "GET") {
      output = await listPublic(
        "road_reports",
        "id,category,details,location_label,latitude,longitude,direction,created_at,expires_at"
      );
    } else if (action === "fuel" && method === "GET") {
      output = await listPublic(
        "fuel_price_reports",
        "id,station_name,product,price_ghs_per_litre,location_label,latitude,longitude,created_at,expires_at"
      );
    } else if ((action === "reports" || action === "fuel") && method === "POST") {
      output = await handleSubmission(action, readBody(req));
    } else {
      output = result(405, { error: "Method or action not supported." });
    }

    return json(res, output.status, output.body);
  } catch (error) {
    console.error("[road-services] request failed:", error && error.message || "unknown error");
    return json(res, 500, { error: "Road services encountered a server error. Check the Vercel function logs." });
  }
};
