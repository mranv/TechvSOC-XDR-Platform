# TechvSOC XDR Platform Backend

This is the FastAPI backend foundation for the `TechvSOC XDR Platform`.

## What is included

- Modular FastAPI application structure
- Environment-based configuration via `.env`
- Versioned API router
- Root and health endpoints
- PostgreSQL-ready SQLAlchemy database setup
- Core models for users, logs, alerts, endpoints, metrics, rules, scans, and notifications
- JWT authentication with password hashing and role-based access control
- Log ingestion, upload parsing, and searchable log storage
- Detection engine with brute-force, suspicious login, and custom rule alerts
- Multi-host monitoring with endpoint registration and metric ingestion
- Nmap-backed scanner module with stored open-port results
- Database initialization script
- CORS middleware
- Production-friendly dependency pinning

## Directory Structure

```text
backend/
├── app/
│   ├── api/
│   │   ├── v1/
│   │   │   └── endpoints/
│   ├── core/
│   ├── db/
│   ├── models/
│   └── schemas/
├── .env.example
├── requirements.txt
└── run.py
```

## Run locally

1. Create a virtual environment:

   ```bash
   python3 -m venv .venv
   ```

2. Activate it:

   ```bash
   source .venv/bin/activate
   ```

3. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

4. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

5. Start the API:

   ```bash
   python run.py
   ```

6. Or initialize database tables manually:

   ```bash
   python -m app.scripts.init_db
   ```

7. Start the API:

   ```bash
   python run.py
   ```

8. Verify:

   - Root: `http://localhost:8000/`
   - Health: `http://localhost:8000/api/v1/health`
   - DB Health: `http://localhost:8000/api/v1/health/db`
   - Swagger UI: `http://localhost:8000/docs`

## Authentication endpoints

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `GET /api/v1/users/` for `admin` and `analyst`
- `POST /api/v1/users/` for `admin`

## Log endpoints

- `POST /api/v1/logs/ingest` for `admin` and `analyst`
- `POST /api/v1/logs/upload` for `admin` and `analyst`
- `GET /api/v1/logs/` for `admin`, `analyst`, and `viewer`
- `GET /api/v1/logs/{log_id}` for `admin`, `analyst`, and `viewer`

## Example structured log ingestion payload

```json
{
  "logs": [
    {
      "source": "auth-service",
      "event_type": "login_failure",
      "message": "Failed login attempt for admin user",
      "raw_log": "2026-04-23T12:15:00Z ERROR Failed login attempt for admin user",
      "severity": "error",
      "event_timestamp": "2026-04-23T12:15:00Z",
      "metadata_json": {
        "ip_address": "10.0.0.25",
        "username": "admin"
      }
    }
  ]
}
```

## Supported upload formats

- Plain text `.log` and `.txt`
- Structured `.json`
- JSON lines `.jsonl`

Plain text uploads are parsed with syslog, ISO timestamp, and keyword-based severity inference. Search supports text query, source, event type, severity, endpoint, and time range filters.

## Detection endpoints

- `GET /api/v1/detections/rules` for all authenticated users
- `POST /api/v1/detections/rules` for `admin`
- `POST /api/v1/detections/run` for `admin` and `analyst`
- `GET /api/v1/detections/alerts` for all authenticated users

## Built-in detections

- Brute force detection groups repeated login failures by `username` and `ip_address`
- Suspicious login detection flags successful logins from conflicting countries or rapidly changing source IPs
- Custom rules support regex or substring-style pattern matching with optional `event_type` and `source` filters

## Example custom rule payload

```json
{
  "name": "PowerShell Encoded Command",
  "description": "Detect suspicious encoded PowerShell usage",
  "rule_type": "custom",
  "pattern": "powershell.*-enc|encodedcommand",
  "condition_json": {
    "event_type": "process_start",
    "source": "windows-agent"
  },
  "severity": "high",
  "is_enabled": true
}
```

## Example detection run

- Ingest logs containing metadata like `username`, `ip_address`, and optionally `country`
- Run `POST /api/v1/detections/run?hours=24`
- Review generated alerts from `GET /api/v1/detections/alerts`

## Monitoring endpoints

- `POST /api/v1/monitoring/endpoints/register` for `admin` and `analyst`
- `POST /api/v1/monitoring/endpoints/{endpoint_id}/metrics` for `admin` and `analyst`
- `GET /api/v1/monitoring/overview` for all authenticated users
- `GET /api/v1/monitoring/endpoints` for all authenticated users
- `GET /api/v1/monitoring/endpoints/{endpoint_id}` for all authenticated users

## Example endpoint registration payload

```json
{
  "hostname": "web-01",
  "ip_address": "10.0.1.15",
  "operating_system": "Ubuntu 24.04",
  "agent_version": "1.0.0",
  "status": "online",
  "last_seen_ip": "10.0.1.15",
  "notes": "Primary frontend server"
}
```

## Example metric ingestion payload

```json
{
  "cpu_usage": 42.7,
  "memory_usage": 68.2,
  "disk_usage": 57.9,
  "uptime_seconds": 93221,
  "process_count": 184,
  "metric_source": "agent",
  "collected_at": "2026-04-23T14:20:00Z"
}
```

The overview endpoint returns host counts, fleet-wide average CPU, memory, disk usage, and the number of active open alerts.

## Scanner endpoints

- `POST /api/v1/scanner/scan` for `admin` and `analyst`
- `GET /api/v1/scanner/scans` for all authenticated users
- `GET /api/v1/scanner/scans/{scan_id}` for all authenticated users

## Example scan payload

```json
{
  "target": "127.0.0.1",
  "ports": "22,80,443",
  "arguments": ["-sV"]
}
```

You can also scan a registered endpoint by sending:

```json
{
  "endpoint_id": 1,
  "ports": "1-1024"
}
```

The scanner uses the system `nmap` binary if it is available in `PATH`. Open ports are parsed and stored in the `scan_results` table along with the raw command output. If `nmap` is missing or the scan fails, the scan record is still stored with `failed` status and error details.

## Example register payload

```json
{
  "full_name": "TechvSOC Admin",
  "email": "admin@techvsoc.local",
  "password": "StrongPass123"
}
```

The very first registered user is automatically promoted to `admin`. Later self-registrations are forced to `viewer`, and only an authenticated `admin` can create `admin`, `analyst`, or `viewer` accounts through `POST /api/v1/users/`.
