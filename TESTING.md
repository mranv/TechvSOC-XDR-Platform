# TechvSOC XDR Platform — Testing Guide

## Prerequisites

```bash
docker compose up --build
```

## Environment Variables

Create `.env` files before running:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp agent/.env.example agent/.env
```

---

## API Testing with curl

### 1. Register Admin User

```bash
curl -X POST http://localhost/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Admin User","email":"admin@techvsoc.local","password":"StrongPass123"}'
```

### 2. Login

```bash
curl -X POST http://localhost/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@techvsoc.local","password":"StrongPass123"}'
```

Save the `access_token` as `TOKEN`:

```bash
export TOKEN="YOUR_JWT_TOKEN"
```

### 3. Verify Session

```bash
curl -X GET http://localhost/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Health Check

```bash
curl http://localhost/api/v1/health
curl http://localhost/api/v1/health/db
```

---

## Log Ingestion

### 5. Ingest Brute Force Logs (triggers detection)

```bash
curl -X POST http://localhost/api/v1/logs/ingest \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "logs": [
      {
        "source": "auth-service",
        "event_type": "login_failure",
        "message": "Failed login attempt for admin user",
        "raw_log": "2026-04-23T12:15:00Z ERROR Failed login attempt for admin user",
        "severity": "error",
        "event_timestamp": "2026-04-23T12:15:00Z",
        "metadata_json": {"ip_address": "10.0.0.25", "username": "admin", "country": "US"}
      },
      {
        "source": "auth-service",
        "event_type": "login_failure",
        "message": "Failed login attempt for admin user",
        "raw_log": "2026-04-23T12:16:00Z ERROR Failed login attempt for admin user",
        "severity": "error",
        "event_timestamp": "2026-04-23T12:16:00Z",
        "metadata_json": {"ip_address": "10.0.0.25", "username": "admin", "country": "US"}
      },
      {
        "source": "auth-service",
        "event_type": "login_failure",
        "message": "Failed login attempt for admin user",
        "raw_log": "2026-04-23T12:17:00Z ERROR Failed login attempt for admin user",
        "severity": "error",
        "event_timestamp": "2026-04-23T12:17:00Z",
        "metadata_json": {"ip_address": "10.0.0.25", "username": "admin", "country": "US"}
      },
      {
        "source": "auth-service",
        "event_type": "login_failure",
        "message": "Failed login attempt for admin user",
        "raw_log": "2026-04-23T12:18:00Z ERROR Failed login attempt for admin user",
        "severity": "error",
        "event_timestamp": "2026-04-23T12:18:00Z",
        "metadata_json": {"ip_address": "10.0.0.25", "username": "admin", "country": "US"}
      },
      {
        "source": "auth-service",
        "event_type": "login_failure",
        "message": "Failed login attempt for admin user",
        "raw_log": "2026-04-23T12:19:00Z ERROR Failed login attempt for admin user",
        "severity": "error",
        "event_timestamp": "2026-04-23T12:19:00Z",
        "metadata_json": {"ip_address": "10.0.0.25", "username": "admin", "country": "US"}
      },
      {
        "source": "auth-service",
        "event_type": "login_failure",
        "message": "Failed login attempt for admin user",
        "raw_log": "2026-04-23T12:20:00Z ERROR Failed login attempt for admin user",
        "severity": "error",
        "event_timestamp": "2026-04-23T12:20:00Z",
        "metadata_json": {"ip_address": "10.0.0.25", "username": "admin", "country": "US"}
      }
    ]
  }'
```

### 6. Ingest Suspicious Login Logs (different countries)

```bash
curl -X POST http://localhost/api/v1/logs/ingest \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "logs": [
      {
        "source": "auth-service",
        "event_type": "login_success",
        "message": "Successful login for user alice",
        "raw_log": "2026-04-23T08:00:00Z INFO Successful login for user alice",
        "severity": "info",
        "event_timestamp": "2026-04-23T08:00:00Z",
        "metadata_json": {"ip_address": "192.168.1.10", "username": "alice", "country": "US"}
      },
      {
        "source": "auth-service",
        "event_type": "login_success",
        "message": "Successful login for user alice",
        "raw_log": "2026-04-23T10:00:00Z INFO Successful login for user alice",
        "severity": "info",
        "event_timestamp": "2026-04-23T10:00:00Z",
        "metadata_json": {"ip_address": "185.220.101.42", "username": "alice", "country": "RU"}
      }
    ]
  }'
```

---

## Detection Engine

### 7. Run Detection Cycle

```bash
curl -X POST "http://localhost/api/v1/detections/run?hours=24" \
  -H "Authorization: Bearer $TOKEN"
```

### 8. List Detection Rules

```bash
curl "http://localhost/api/v1/detections/rules" \
  -H "Authorization: Bearer $TOKEN"
```

### 9. List Alerts

```bash
curl "http://localhost/api/v1/detections/alerts?limit=50" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Correlation & Incidents

### 10. Run Correlation Engine

```bash
curl -X POST "http://localhost/api/v1/incidents/correlate?hours=24" \
  -H "Authorization: Bearer $TOKEN"
```

### 11. List Incidents

```bash
curl "http://localhost/api/v1/incidents?limit=50" \
  -H "Authorization: Bearer $TOKEN"
```

### 12. Get Incident Detail

```bash
curl "http://localhost/api/v1/incidents/1" \
  -H "Authorization: Bearer $TOKEN"
```

### 13. Create Manual Incident

```bash
curl -X POST http://localhost/api/v1/incidents/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Manual investigation: Data exfiltration",
    "description": "Suspected data exfiltration observed on web-01",
    "severity": "high",
    "alert_ids": []
  }'
```

---

## Threat Intelligence

### 14. Lookup IP Threat Intel

```bash
curl -X POST http://localhost/api/v1/threat-intel/lookup \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ip_address": "185.220.101.42"}'
```

Or via GET:

```bash
curl "http://localhost/api/v1/threat-intel/lookup/185.220.101.42" \
  -H "Authorization: Bearer $TOKEN"
```

---

## SOAR Automation

### 15. Block IP (Simulated)

```bash
curl -X POST http://localhost/api/v1/response/block-ip \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ip_address": "185.220.101.42",
    "reason": "Brute force attack detected",
    "duration_minutes": 60
  }'
```

### 16. Disable User (Simulated)

```bash
curl -X POST http://localhost/api/v1/response/disable-user \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice",
    "reason": "Compromised account detected"
  }'
```

### 17. List SOAR Actions

```bash
curl "http://localhost/api/v1/response/actions?limit=50" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Monitoring

### 18. Register Endpoint

```bash
curl -X POST http://localhost/api/v1/monitoring/endpoints/register \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "hostname": "web-01",
    "ip_address": "10.0.1.15",
    "operating_system": "Ubuntu 24.04",
    "agent_version": "1.0.0",
    "status": "online",
    "last_seen_ip": "10.0.1.15",
    "notes": "Primary frontend server"
  }'
```

### 19. Ingest Metrics

```bash
curl -X POST http://localhost/api/v1/monitoring/endpoints/1/metrics \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cpu_usage": 42.7,
    "memory_usage": 68.2,
    "disk_usage": 57.9,
    "uptime_seconds": 93221,
    "process_count": 184,
    "metric_source": "agent",
    "collected_at": "2026-04-23T14:20:00Z"
  }'
```

### 20. Monitoring Overview

```bash
curl "http://localhost/api/v1/monitoring/overview" \
  -H "Authorization: Bearer $TOKEN"
```

### 21. List Endpoints

```bash
curl "http://localhost/api/v1/monitoring/endpoints?limit=50" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Scanner

### 22. Run Nmap Scan

```bash
curl -X POST http://localhost/api/v1/scanner/scan \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "target": "127.0.0.1",
    "ports": "22,80,443",
    "arguments": ["-sV"]
  }'
```

### 23. List Scan Results

```bash
curl "http://localhost/api/v1/scanner/scans?limit=50" \
  -H "Authorization: Bearer $TOKEN"
```

---

## User Management

### 24. List Users

```bash
curl "http://localhost/api/v1/users/" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Test Scenarios (10+ End-to-End)

### Scenario 1: Brute Force Detection
1. Register a user
2. Login to get token
3. Ingest 6+ failed login logs from same IP (see #5)
4. Run detection cycle (see #7)
5. Verify alert created: `GET /detections/alerts`

### Scenario 2: Suspicious Login Detection
1. Ingest successful login from US
2. Ingest successful login from different country (RU) within 6 hours (see #6)
3. Run detection cycle
4. Verify suspicious login alert created

### Scenario 3: Incident Correlation
1. Run brute force scenario
2. Run suspicious login scenario
3. Run correlation: `POST /incidents/correlate` (see #10)
4. Verify incident created with attack chain

### Scenario 4: Threat Intel Enrichment
1. Ingest logs with IP metadata
2. Lookup IP: `POST /threat-intel/lookup` (see #14)
3. Verify country, reputation_score, and malicious flag

### Scenario 5: SOAR Block IP
1. Trigger block-ip action (see #15)
2. List actions: `GET /response/actions` (see #17)
3. Verify action status is "completed"

### Scenario 6: SOAR Disable User
1. Trigger disable-user action (see #16)
2. List actions
3. Verify action recorded

### Scenario 7: Endpoint Registration & Metrics
1. Register endpoint (see #18)
2. Ingest metrics (see #19)
3. Check monitoring overview (see #20)

### Scenario 8: Port Scanning
1. Run scan (see #22)
2. List results (see #23)
3. Verify open ports discovered

### Scenario 9: Log Search & Filtering
1. Ingest logs
2. Search: `GET /logs?q=failed&severity=error`
3. Verify filtered results

### Scenario 10: Role-Based Access
1. Register admin user
2. Verify admin role assigned
3. Try accessing endpoints as viewer (create viewer user)
4. Verify some endpoints return 403

### Scenario 11: Queue Processing
1. Ingest logs via `/logs/ingest`
2. Verify logs are pushed to Redis queue
3. Check worker processes logs asynchronously
4. Verify threat intel enrichment on IPs

### Scenario 12: Attack Chain Visualization
1. Create multiple related alerts (brute force + successful login)
2. Run correlation
3. Get incident detail: `GET /incidents/{id}`
4. Verify `attack_chain_json` contains step-by-step chain

---

## Frontend Testing

Open `http://localhost` in browser:

1. **Login/Register** — Test JWT auth flow
2. **Dashboard** — Verify stats cards, charts, live refresh
3. **Incidents** — Click incident → view timeline, attack chain, related alerts
4. **Alerts** — Filter by severity, view detection rules
5. **Logs** — Search, filter by severity/source
6. **Threat Hunting** — Query logs + IP intel lookup
7. **Endpoints** — View endpoint cards with metrics
8. **Monitoring** — Fleet overview with charts
9. **Scanner** — Launch scan, view results
10. **Automation** — Block IP, disable user buttons
11. **Settings** — Theme switcher (Dark/Light/Cyberpunk)

---

## Troubleshooting

| Issue | Solution |
|---|---|
| `Connection refused` | Ensure containers are running: `docker compose ps` |
| `401 Unauthorized` | Token expired; re-login |
| `404 Not Found` | Check API prefix: `/api/v1/` |
| Nmap fails | Ensure `nmap` is installed in backend container (Dockerfile has it) |
| Redis not found | Ensure `redis` service is healthy |
| Database errors | Check `DATABASE_URL` env var |

---

## Notes

- All SOAR actions are **simulated** — no actual firewall changes occur
- Threat intel is **mocked** — country and reputation are randomized
- The worker runs detections automatically every ~30 seconds when idle
- Redis queue (`techvsoc:logs`) processes logs asynchronously
