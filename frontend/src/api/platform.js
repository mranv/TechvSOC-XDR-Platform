import { http } from "./http";
import { buildCacheKey, cachedGet, invalidateCache } from "./cache";

function cachedRequest(path, params = {}, { ttl = 15000, force = false } = {}) {
  return cachedGet(
    buildCacheKey(path, params),
    async () => {
      const { data } = await http.get(path, { params });
      return data;
    },
    { ttl, force },
  );
}

export async function fetchHealth(options = {}) {
  return cachedRequest("/health", {}, { ttl: 10000, ...options });
}

export async function fetchMonitoringOverview(options = {}) {
  return cachedRequest("/monitoring/overview", {}, { ttl: 12000, ...options });
}

export async function fetchAlerts(params = {}, options = {}) {
  return cachedRequest("/detections/alerts", params, { ttl: 10000, ...options });
}

export async function fetchLogs(params = {}, options = {}) {
  return cachedRequest("/logs", params, { ttl: 10000, ...options });
}

export async function fetchEndpoints(params = {}, options = {}) {
  return cachedRequest("/monitoring/endpoints", params, { ttl: 12000, ...options });
}

export async function fetchScans(params = {}, options = {}) {
  return cachedRequest("/scanner/scans", params, { ttl: 10000, ...options });
}

export async function fetchRules(params = {}, options = {}) {
  return cachedRequest("/detections/rules", params, { ttl: 30000, ...options });
}

export async function runDetections(hours = 24) {
  const { data } = await http.post(`/detections/run?hours=${hours}`);
  invalidateCache("/detections");
  invalidateCache("/monitoring/overview");
  return data;
}

export async function runScan(payload) {
  const { data } = await http.post("/scanner/scan", payload);
  invalidateCache("/scanner/scans");
  return data;
}

export async function fetchUsers(options = {}) {
  return cachedRequest("/users/", {}, { ttl: 30000, ...options });
}
