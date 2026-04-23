# TechvSOC XDR Platform Agent

This is the Python endpoint agent for `TechvSOC XDR Platform`. It uses `psutil` to collect system metrics, registers the host with the backend, and forwards new log lines from configured files.

## Features

- Automatic endpoint registration
- CPU, memory, disk, uptime, and process count reporting
- Periodic log forwarding from local files
- Offset tracking so logs are not resent after restart
- Configurable backend URL, polling intervals, and log file list

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

5. Set `TECHVSOC_AGENT_TOKEN` to a valid backend JWT for an `admin` or `analyst`.

6. Start the agent:

   ```bash
   python run.py
   ```

## Required backend endpoints

- `POST /api/v1/monitoring/endpoints/register`
- `POST /api/v1/monitoring/endpoints/{endpoint_id}/metrics`
- `POST /api/v1/logs/ingest`

## Example `.env`

```env
TECHVSOC_AGENT_BACKEND_URL=http://localhost:8000/api/v1
TECHVSOC_AGENT_TOKEN=eyJhbGciOiJI...
TECHVSOC_AGENT_LOG_FILES=/var/log/syslog,/var/log/auth.log
```

The agent stores its file offsets in `TECHVSOC_AGENT_STATE_PATH`, which defaults to `.agent-state.json` inside the `agent/` directory.
