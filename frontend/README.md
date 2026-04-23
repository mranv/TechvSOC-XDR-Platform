# TechvSOC XDR Platform Frontend

This is the Vite + React + Tailwind frontend base for `TechvSOC XDR Platform`.

## What is included in Phase 9

- Vite React application structure
- Tailwind CSS setup
- Axios API client
- Auth context with JWT persistence
- Protected and public route guards
- Responsive application shell with sidebar and topbar
- Base pages for dashboard, logs, detections, monitoring, scanner, and settings
- Recharts and Framer Motion integration

## Run locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

3. Start the dev server:

   ```bash
   npm run dev
   ```

4. Open:

   - `http://localhost:5173`

## Environment

- `VITE_API_BASE_URL=http://localhost:8000/api/v1`

The frontend expects the FastAPI backend to be running and reachable at the configured API base URL.
