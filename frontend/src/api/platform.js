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

export async function fetchIncidents(params = {}, options = {}) {
  return cachedRequest("/incidents", params, { ttl: 10000, ...options });
}

export async function fetchIncident(id, options = {}) {
  return cachedRequest(`/incidents/${id}`, {}, { ttl: 10000, ...options });
}

export async function createIncident(payload) {
  const { data } = await http.post("/incidents/", payload);
  invalidateCache("/incidents");
  return data;
}

export async function updateIncident(id, payload) {
  const { data } = await http.patch(`/incidents/${id}`, payload);
  invalidateCache("/incidents");
  return data;
}

export async function fetchIncidentNotes(incidentId) {
  const { data } = await http.get(`/incidents/${incidentId}/notes`);
  return data;
}

export async function addIncidentNote(incidentId, payload) {
  const { data } = await http.post(`/incidents/${incidentId}/notes`, payload);
  invalidateCache(`/incidents/${incidentId}`);
  return data;
}

export async function fetchIncidentActivity(incidentId) {
  const { data } = await http.get(`/incidents/${incidentId}/activity`);
  return data;
}

export async function runCorrelation(hours = 24) {
  const { data } = await http.post(`/incidents/correlate?hours=${hours}`);
  invalidateCache("/incidents");
  invalidateCache("/detections");
  return data;
}

export async function lookupThreatIntel(ipAddress) {
  const { data } = await http.post("/threat-intel/lookup", { ip_address: ipAddress });
  return data;
}

export async function blockIp(payload) {
  const { data } = await http.post("/response/block-ip", payload);
  invalidateCache("/response/actions");
  return data;
}

export async function disableUser(payload) {
  const { data } = await http.post("/response/disable-user", payload);
  invalidateCache("/response/actions");
  return data;
}

export async function fetchSoarActions(params = {}, options = {}) {
  return cachedRequest("/response/actions", params, { ttl: 10000, ...options });
}

export async function fetchScenarios(options = {}) {
  return cachedRequest("/simulations/scenarios", {}, { ttl: 60000, ...options });
}

export async function runSimulation(payload) {
  const { data } = await http.post("/simulations/run", payload);
  invalidateCache("/logs");
  invalidateCache("/detections");
  invalidateCache("/incidents");
  return data;
}

export async function searchEntities(q, type = null, options = {}) {
  const params = { q, ...(type ? { type } : {}) };
  return cachedRequest("/entities/search", params, { ttl: 15000, ...options });
}

export async function fetchEntityProfile(entityType, entityValue, options = {}) {
  return cachedRequest(
    `/entities/profile/${encodeURIComponent(entityType)}/${encodeURIComponent(entityValue)}`,
    {},
    { ttl: 15000, ...options }
  );
}

export async function fetchLiveActivity(since = null, options = {}) {
  const params = since ? { since: since.toISOString() } : {};
  const { data } = await http.get("/live/activity", { params });
  return data;
}

export async function fetchPlaybooks(params = {}, options = {}) {
  return cachedRequest("/playbooks", params, { ttl: 30000, ...options });
}

export async function createPlaybook(payload) {
  const { data } = await http.post("/playbooks/", payload);
  invalidateCache("/playbooks");
  return data;
}

export async function updatePlaybook(id, payload) {
  const { data } = await http.patch(`/playbooks/${id}`, payload);
  invalidateCache("/playbooks");
  return data;
}

export async function deletePlaybook(id) {
  await http.delete(`/playbooks/${id}`);
  invalidateCache("/playbooks");
}

export async function fetchPlaybookExecutions(playbookId, params = {}, options = {}) {
  return cachedRequest(`/playbooks/${playbookId}/executions`, params, { ttl: 15000, ...options });
}

export async function generateDemoData() {
  const { data } = await http.post("/testing/generate-demo-data");
  invalidateCache("/logs");
  invalidateCache("/detections");
  invalidateCache("/incidents");
  invalidateCache("/playbooks");
  return data;
}

/* ─── Cases ─── */
export async function fetchCases(params = {}, options = {}) {
  return cachedRequest("/cases", params, { ttl: 10000, ...options });
}

export async function fetchCase(id, options = {}) {
  return cachedRequest(`/cases/${id}`, {}, { ttl: 10000, ...options });
}

export async function createCase(payload) {
  const { data } = await http.post("/cases/", payload);
  invalidateCache("/cases");
  return data;
}

export async function updateCase(id, payload) {
  const { data } = await http.patch(`/cases/${id}`, payload);
  invalidateCache("/cases");
  return data;
}

export async function deleteCase(id) {
  await http.delete(`/cases/${id}`);
  invalidateCache("/cases");
}

export async function addIncidentToCase(caseId, incidentId) {
  const { data } = await http.post(`/cases/${caseId}/incidents/${incidentId}`);
  invalidateCache("/cases");
  return data;
}

export async function removeIncidentFromCase(caseId, incidentId) {
  const { data } = await http.delete(`/cases/${caseId}/incidents/${incidentId}`);
  invalidateCache("/cases");
  return data;
}

/* ─── Hunt ─── */
export async function runHuntQuery(query, skip = 0, limit = 50) {
  const { data } = await http.post("/hunt/query", { query, skip, limit });
  return data;
}

export async function saveHuntQuery(name, query) {
  const { data } = await http.post("/hunt/save", { name, query });
  invalidateCache("/hunt/saved");
  return data;
}

export async function fetchSavedHuntQueries(options = {}) {
  return cachedRequest("/hunt/saved", {}, { ttl: 30000, ...options });
}
