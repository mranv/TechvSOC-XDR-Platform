# TechvSOC XDR Platform — Enterprise Upgrade Plan

## Progress Tracking
- [x] Step 1: Incident Story Engine
- [x] Step 2: Incident Workflow System
- [x] Step 3: Case Management System
- [x] Step 4: Advanced Threat Hunting (DSL)
- [ ] Step 5: Forensics View
- [ ] Step 6: Alert Triage System
- [ ] Step 7: Dual Dashboard (SOC + Executive)
- [ ] Step 8: Enhanced User Roles (RBAC)
- [ ] Step 9: Alert Fatigue Simulation
- [ ] Step 10: Report Generation
- [ ] Step 11: Final UI Polish (Command Palette + Shortcuts)

## Information Gathered

### Current Architecture
- **Backend**: FastAPI + SQLAlchemy + PostgreSQL (via Docker)
- **Frontend**: React + Vite + Tailwind CSS + Framer Motion + Recharts
- **Auth**: JWT-based with roles (admin, analyst, viewer)
- **Existing Models**: User, Alert, Incident, LogEntry, DetectionRule, Endpoint, ScanResult, Playbook, SoarAction, ThreatIntelRecord

### Current Incident Model
- Fields: id, title, description, severity, status, attack_chain_json, timeline_json, assigned_to_id, resolved_at
- Statuses: open, in_progress, resolved, closed
- Already has: risk_score (computed), confidence_level, ai_summary, recommended_actions (computed in service layer)

### Current Alert Model
- Fields: id, title, description, severity, status, endpoint_id, log_entry_id, rule_id, owner_id, source, timeline_json, triggered_at
- Statuses: open, acknowledged, resolved
- No triage fields (true_positive, false_positive, suspicious)

### Current APIs
- `/incidents/` — CRUD + correlate
- `/detections/alerts` — list alerts
- `/logs/` — search logs
- `/auth/` — login/register/me
- `/response/` — SOAR actions

### Frontend Structure
- Pages: Dashboard, Incidents, Detections (alerts), Logs, ThreatHunting, Entities, Endpoints, Monitoring, Scanner, Simulations, AttackLab, Automation, Settings
- Components: InvestigationPanel (slide-over), QueryBuilder, LiveActivityFeed, etc.
- API layer: `platform.js` with caching

---

## Implementation Plan (10 Features)

### Step 1: Incident Story Engine (HIGHEST PRIORITY)
**Goal**: Auto-generate human-readable attack narratives from attack_chain_json, timeline_json, and alerts.

**Backend Changes**:
- Enhance `backend/app/services/incident_service.py`:
  - `generate_incident_story(incident)` → returns structured story with:
    - `what_happened`: narrative of the attack
    - `how_it_happened`: step-by-step technical breakdown
    - `impact`: severity-based impact assessment
    - `recommended_next_steps`: actionable steps
  - `extract_entities_from_incident(incident)` → IPs, usernames, hostnames, file paths
  - `generate_behavior_summary(incident)` → MITRE mapping summary

- Update `backend/app/schemas/incident.py`:
  - Add `IncidentStoryResponse` schema
  - Add `story` field to `IncidentResponse`

- Update `backend/app/api/v1/endpoints/incidents.py`:
  - Add `GET /incidents/{id}/story` endpoint

**Frontend Changes**:
- Create `frontend/src/components/incident/IncidentStoryPanel.jsx`:
  - Human-readable narrative with icons
  - "What happened" section with timeline highlights
  - "How it happened" with MITRE technique badges
  - "Impact" section with severity-based coloring
  - "Next steps" checklist

- Update `frontend/src/components/incident/InvestigationPanel.jsx`:
  - Add "Story" tab alongside existing tabs
  - Integrate `IncidentStoryPanel`

---

### Step 2: Incident Workflow System
**Goal**: Real SOC workflow with statuses, assignments, notes, activity logs.

**Backend Changes**:
- Update `backend/app/models/enums.py`:
  - Expand `IncidentStatus` to: `NEW`, `IN_PROGRESS`, `INVESTIGATING`, `CONTAINED`, `RESOLVED`, `CLOSED`

- Update `backend/app/models/incident.py`:
  - Add `contained_at: datetime | None`
  - Add `investigating_at: datetime | None`

- Create `backend/app/models/incident_note.py`:
  - `IncidentNote` model: id, incident_id, author_id, content, created_at

- Create `backend/app/models/incident_activity.py`:
  - `IncidentActivity` model: id, incident_id, actor_id, action, old_value, new_value, created_at

- Create `backend/app/crud/incident_note.py` and `backend/app/crud/incident_activity.py`

- Create `backend/app/schemas/incident_workflow.py`:
  - `IncidentNoteCreate`, `IncidentNoteResponse`, `IncidentActivityResponse`

- Update `backend/app/api/v1/endpoints/incidents.py`:
  - Add `POST /incidents/{id}/notes` — add note
  - Add `GET /incidents/{id}/notes` — list notes
  - Add `GET /incidents/{id}/activity` — get activity log
  - Update `PATCH /incidents/{id}` to auto-log status changes

- Update `backend/app/services/incident_service.py`:
  - `add_incident_note(db, incident_id, author_id, content)`
  - `get_incident_notes(db, incident_id)`
  - `log_incident_activity(db, incident_id, actor_id, action, old_value, new_value)`
  - `get_incident_activity(db, incident_id)`
  - `assign_incident(db, incident, analyst_id)` — with validation

**Frontend Changes**:
- Create `frontend/src/components/incident/WorkflowPanel.jsx`:
  - Status dropdown with realistic SOC flow
  - Analyst assignment dropdown (fetch users)
  - Notes/comments thread
  - Activity log timeline

- Update `frontend/src/components/incident/InvestigationPanel.jsx`:
  - Add "Workflow" tab

- Update `frontend/src/pages/IncidentsPage.jsx`:
  - Show assigned analyst in list
  - Filter by status

---

### Step 3: Case Management System
**Goal**: Create cases that can contain multiple incidents.

**Backend Changes**:
- Create `backend/app/models/case.py`:
  - `Case` model: id, title, description, status, priority, assigned_to_id, created_at, updated_at, closed_at
  - `case_incident_link` table

- Create `backend/app/schemas/case.py`:
  - `CaseCreateRequest`, `CaseUpdateRequest`, `CaseResponse`, `CaseListResponse`

- Create `backend/app/crud/case.py`:
  - `create_case`, `get_case`, `list_cases`, `update_case`, `delete_case`, `add_incident_to_case`, `remove_incident_from_case`

- Create `backend/app/services/case_service.py`:
  - Business logic for case management

- Create `backend/app/api/v1/endpoints/cases.py`:
  - Full CRUD + `POST /cases/{id}/incidents/{incident_id}` to link incidents
  - `GET /cases/{id}/incidents` to list incidents in case

- Register in `backend/app/api/router.py`

**Frontend Changes**:
- Create `frontend/src/pages/CasesPage.jsx`:
  - Case list with filters
  - Case detail view
  - "Convert incident to case" button
  - Add/remove incidents from case

- Create `frontend/src/components/case/CaseCard.jsx`, `CaseDetailPanel.jsx`

- Update `frontend/src/components/navigation/Sidebar.jsx`:
  - Add "Cases" link

- Update `frontend/src/App.jsx`:
  - Add `/cases` route

- Update `frontend/src/api/platform.js`:
  - Add case API functions

---

### Step 4: Advanced Threat Hunting (DSL Query Language)
**Goal**: Simple DSL for threat hunting with save/history.

**Backend Changes**:
- Create `backend/app/services/hunt_service.py`:
  - `parse_hunt_query(query: str) → dict` — parse `ip:192.168.1.5 AND event_type:login_failure`
  - `execute_hunt_query(db, parsed_query, skip, limit)` — execute against logs
  - Supported operators: `:`, `AND`, `OR`, `NOT`, parentheses grouping
  - Supported fields: ip, user, host, event_type, severity, source

- Create `backend/app/schemas/hunt.py`:
  - `HuntQueryRequest`, `HuntQueryResponse`, `SavedHuntQuery`

- Create `backend/app/models/saved_hunt.py`:
  - `SavedHuntQuery` model: id, name, query, owner_id, created_at

- Create `backend/app/api/v1/endpoints/hunt.py`:
  - `POST /hunt/query` — execute hunt query
  - `POST /hunt/save` — save query
  - `GET /hunt/saved` — list saved queries
  - `GET /hunt/history` — get hunt history (from activity log)

- Register in `backend/app/api/router.py`

**Frontend Changes**:
- Update `frontend/src/components/hunt/QueryBuilder.jsx`:
  - Add DSL mode toggle
  - Syntax highlighting for `ip:`, `user:`, `host:`, `event_type:`, `severity:`
  - Auto-complete suggestions
  - Real-time validation

- Update `frontend/src/pages/ThreatHuntingPage.jsx`:
  - Integrate DSL query execution
  - Show query parse tree for transparency

- Enhance saved queries to persist to backend (currently localStorage only)

---

### Step 5: Forensics View (Process Tree + File Activity)
**Goal**: Simulated forensic data inside incident view.

**Backend Changes**:
- Update `backend/app/models/incident.py`:
  - Add `forensics_json: dict | None` — stores:
    - `process_tree`: parent-child process relationships
    - `file_activity`: created/modified/deleted files
    - `network_activity`: connections, DNS queries
    - `registry_activity`: Windows registry changes

- Update `backend/app/services/incident_service.py`:
  - `generate_forensics_data(incident)` — simulate realistic forensics from alerts
  - `extract_process_tree(alerts)` → parent→child chain
  - `extract_file_activity(alerts)` → file operations
  - `extract_network_activity(alerts)` → connections

- Update `backend/app/schemas/incident.py`:
  - Add `ForensicsResponse` schema
  - Add `forensics` field to `IncidentResponse`

- Update `backend/app/api/v1/endpoints/incidents.py`:
  - Add `GET /incidents/{id}/forensics` endpoint

- Update `backend/app/services/correlation_service.py`:
  - Generate forensics data when creating incidents

**Frontend Changes**:
- Create `frontend/src/components/incident/ForensicsPanel.jsx`:
  - **Process Tree**: Visual tree with parent→child arrows, PIDs, process names, command lines
  - **File Activity**: Table with created/modified/deleted files, timestamps
  - **Network Activity**: Source/dest IPs, ports, protocols
  - **Behavior Summary**: MITRE technique summary

- Update `frontend/src/components/incident/InvestigationPanel.jsx`:
  - Add "Forensics" tab

---

### Step 6: Alert Triage System
**Goal**: Mark alerts as True Positive, False Positive, Suspicious + bulk actions.

**Backend Changes**:
- Update `backend/app/models/enums.py`:
  - Add `AlertTriageStatus(StrEnum)`: `UNTRIAGED`, `TRUE_POSITIVE`, `FALSE_POSITIVE`, `SUSPICIOUS`

- Update `backend/app/models/alert.py`:
  - Add `triage_status: AlertTriageStatus` (default UNTRIAGED)
  - Add `triage_note: str | None`
  - Add `triaged_by_id: int | None`
  - Add `triaged_at: datetime | None`

- Update `backend/app/schemas/alerts.py`:
  - Add `AlertTriageRequest` schema
  - Add triage fields to `AlertResponse`

- Update `backend/app/crud/alert.py`:
  - Add triage filtering
  - `triage_alert(db, alert_id, status, note, analyst_id)`

- Update `backend/app/api/v1/endpoints/detections.py`:
  - Add `POST /detections/alerts/{alert_id}/triage` endpoint
  - Add `POST /detections/alerts/bulk-triage` endpoint
  - Update `GET /detections/alerts` to filter by triage_status

- Update `backend/app/services/detection_service.py`:
  - Add triage logic

**Frontend Changes**:
- Update `frontend/src/pages/DetectionsPage.jsx`:
  - Add triage status badges
  - True Positive / False Positive / Suspicious buttons per alert
  - Bulk selection with checkboxes
  - Bulk triage dropdown
  - Filter by triage status

- Create `frontend/src/components/alerts/AlertTriageModal.jsx`:
  - Modal for adding triage note

- Update `frontend/src/api/platform.js`:
  - Add triage API functions

---

### Step 7: Dual Dashboard (SOC + Executive)
**Goal**: Two dashboard modes for different audiences.

**Backend Changes**:
- Update `backend/app/api/v1/endpoints/monitoring.py`:
  - Enhance `/monitoring/overview` to include:
    - `incidents_by_severity`: counts by severity
    - `incidents_over_time`: time series for charting
    - `alerts_by_triage`: triage status distribution
    - `avg_resolution_time`: average time to resolve
    - `open_cases_count`: number of open cases

- Create `backend/app/services/dashboard_service.py`:
  - `get_soc_dashboard_data(db)` → live alerts, incidents, activity feed
  - `get_executive_dashboard_data(db)` → risk score, trends, KPIs

- Create `backend/app/schemas/dashboard.py`:
  - `SocDashboardResponse`, `ExecutiveDashboardResponse`

**Frontend Changes**:
- Update `frontend/src/pages/DashboardPage.jsx`:
  - Add mode toggle: SOC Mode / Executive Mode
  - **SOC Mode**:
    - Live alert feed (with severity colors)
    - Open incidents list
    - Activity feed (recent actions)
    - Quick actions (run correlation, run detections)
  - **Executive Mode**:
    - Risk score gauge (organization-wide)
    - Incident trend chart (line chart over time)
    - Alert triage distribution (pie chart)
    - Mean time to detect / respond metrics
    - Top threats table

---

### Step 8: Enhanced User Roles (RBAC)
**Goal**: Realistic SOC roles with differentiated permissions.

**Backend Changes**:
- Update `backend/app/models/enums.py`:
  - Replace `UserRole` with:
    - `ADMIN` — full access
    - `SOC_ANALYST_L1` — view alerts/incidents, triage alerts, add notes, assign to self
    - `SOC_ANALYST_L2` — L1 + create incidents, run correlation, run detections, close incidents
    - `SECURITY_ENGINEER` — L2 + manage rules, playbooks, settings, user management

- Update `backend/app/api/deps.py`:
  - Add `require_any_role(*roles)` helper
  - Add `require_permission(permission)` decorator

- Update all endpoint files to use appropriate role checks:
  - `auth.py` — admin for user creation
  - `incidents.py` — L1 can view/comment, L2 can create/update/close
  - `detections.py` — L1 can triage, engineer can create rules
  - `cases.py` — L2 can create cases
  - `hunt.py` — all authenticated
  - `soar.py` — L2+ for actions

- Update `backend/app/schemas/auth.py`:
  - Add `permissions` field to user response

**Frontend Changes**:
- Update `frontend/src/context/AuthContext.jsx`:
  - Expose `user.role` and `user.permissions`

- Create `frontend/src/components/RouteGuards.jsx`:
  - `RoleGuard` component for route-level protection
  - `PermissionGuard` for feature-level hiding

- Update `frontend/src/components/navigation/Sidebar.jsx`:
  - Hide/show links based on role
  - Admin sees Settings, Users
  - Engineer sees Automation, Rules
  - Analyst L1 sees Alerts, Incidents (read-only), Hunting

- Update all pages to conditionally show/hide actions based on permissions

---

### Step 9: Alert Fatigue Simulation
**Goal**: Generate realistic low-severity alert volume with filtering tools.

**Backend Changes**:
- Update `backend/app/services/testing_service.py`:
  - Add `generate_alert_fatigue_data(db, count=200)`:
    - Generate 150 low-severity alerts (info, low)
    - Generate 40 medium alerts
    - Generate 10 high alerts
    - Mix of false positive patterns, benign activities

- Update `backend/app/services/detection_service.py`:
  - Add `evaluate_noise_rules(db, logs)` — rules that generate benign-looking alerts
  - Add noise rule types: `login_success`, `file_access`, `network_connect`

- Update `backend/app/api/v1/endpoints/testing.py`:
  - Add `POST /testing/generate-alert-fatigue` endpoint

**Frontend Changes**:
- Update `frontend/src/pages/DetectionsPage.jsx`:
  - Add "Alert Fatigue Mode" toggle
  - Noise filter: "Hide low severity", "Hide untriaged", "Show only true positives"
  - Severity distribution bar chart
  - "Triage queue" counter
  - Quick triage buttons (swipe-like UX)

- Create `frontend/src/components/alerts/AlertFatigueBar.jsx`:
  - Visual indicator of alert volume vs. analyst capacity

---

### Step 10: Report Generation (PDF-Style Export)
**Goal**: Export incident reports with full investigation data.

**Backend Changes**:
- Create `backend/app/services/report_service.py`:
  - `generate_incident_report(db, incident_id)` → dict with all data:
    - Executive summary
    - Incident metadata
    - Attack chain (full)
    - Timeline (all events)
    - Alerts (with triage status)
    - Entities (IPs, users, hosts)
    - Forensics (process tree, files)
    - Notes and activity log
    - Recommended actions
    - Risk score and confidence

- Create `backend/app/schemas/report.py`:
  - `IncidentReportResponse`

- Create `backend/app/api/v1/endpoints/reports.py`:
  - `GET /reports/incidents/{incident_id}` — full report
  - `GET /reports/incidents/{incident_id}/download` — JSON download

- Register in `backend/app/api/router.py`

**Frontend Changes**:
- Create `frontend/src/components/incident/ReportExportPanel.jsx`:
  - "Generate Report" button
  - Report preview modal
  - Sections: Summary, Timeline, Attack Chain, Forensics, Actions Taken
  - "Download JSON" button
  - Print-friendly styling

- Update `frontend/src/components/incident/InvestigationPanel.jsx`:
  - Add "Report" tab or export button in header

---

### Step 11: Final UI Polish (Command Palette + Keyboard Shortcuts)
**Goal**: Real product feel with fast navigation.

**Frontend Changes**:
- Create `frontend/src/components/ui/CommandPalette.jsx`:
  - `Ctrl+K` / `Cmd+K` trigger
  - Fuzzy search across all pages
  - Quick actions: "Go to Incidents", "Run Correlation", "Create Case"
  - Recent pages

- Create `frontend/src/hooks/useKeyboardShortcuts.js`:
  - `g d` → Go to Dashboard
  - `g i` → Go to Incidents
  - `g a` → Go to Alerts
  - `r c` → Run Correlation
  - `r d` → Run Detections
  - `n i` → New Incident
  - `?` → Show shortcuts help

- Update `frontend/src/layouts/AppShell.jsx`:
  - Integrate CommandPalette
  - Global keyboard shortcut listener

- Add loading skeletons to ALL pages:
  - `CasesPage`, `ReportExportPanel`, etc.
  - Ensure zero perceived lag

---

## Database Migration Strategy
Since SQLAlchemy `create_all()` is used on startup, new tables will be auto-created. For enum changes:
- SQLAlchemy handles enum creation
- Existing data with old statuses will remain valid if enums are backward-compatible
- For new enum values, they will be available for new records

## Files to Create/Edit Summary

### New Backend Files (15):
- `backend/app/models/incident_note.py`
- `backend/app/models/incident_activity.py`
- `backend/app/models/case.py`
- `backend/app/models/saved_hunt.py`
- `backend/app/schemas/incident_workflow.py`
- `backend/app/schemas/case.py`
- `backend/app/schemas/hunt.py`
- `backend/app/schemas/dashboard.py`
- `backend/app/schemas/report.py`
- `backend/app/crud/incident_note.py`
- `backend/app/crud/incident_activity.py`
- `backend/app/crud/case.py`
- `backend/app/services/case_service.py`
- `backend/app/services/hunt_service.py`
- `backend/app/services/dashboard_service.py`
- `backend/app/services/report_service.py`
- `backend/app/api/v1/endpoints/cases.py`
- `backend/app/api/v1/endpoints/hunt.py`
- `backend/app/api/v1/endpoints/reports.py`

### Modified Backend Files (12):
- `backend/app/models/enums.py`
- `backend/app/models/incident.py`
- `backend/app/models/alert.py`
- `backend/app/schemas/incident.py`
- `backend/app/schemas/alerts.py`
- `backend/app/schemas/auth.py`
- `backend/app/services/incident_service.py`
- `backend/app/services/detection_service.py`
- `backend/app/services/correlation_service.py`
- `backend/app/services/testing_service.py`
- `backend/app/api/v1/endpoints/incidents.py`
- `backend/app/api/v1/endpoints/detections.py`
- `backend/app/api/v1/endpoints/monitoring.py`
- `backend/app/api/v1/endpoints/testing.py`
- `backend/app/api/deps.py`
- `backend/app/api/router.py`

### New Frontend Files (12):
- `frontend/src/components/incident/IncidentStoryPanel.jsx`
- `frontend/src/components/incident/WorkflowPanel.jsx`
- `frontend/src/components/incident/ForensicsPanel.jsx`
- `frontend/src/components/incident/ReportExportPanel.jsx`
- `frontend/src/components/case/CaseCard.jsx`
- `frontend/src/components/case/CaseDetailPanel.jsx`
- `frontend/src/components/alerts/AlertTriageModal.jsx`
- `frontend/src/components/alerts/AlertFatigueBar.jsx`
- `frontend/src/components/ui/CommandPalette.jsx`
- `frontend/src/hooks/useKeyboardShortcuts.js`
- `frontend/src/pages/CasesPage.jsx`

### Modified Frontend Files (10):
- `frontend/src/App.jsx`
- `frontend/src/api/platform.js`
- `frontend/src/context/AuthContext.jsx`
- `frontend/src/components/navigation/Sidebar.jsx`
- `frontend/src/components/RouteGuards.jsx`
- `frontend/src/components/incident/InvestigationPanel.jsx`
- `frontend/src/pages/IncidentsPage.jsx`
- `frontend/src/pages/DetectionsPage.jsx`
- `frontend/src/pages/DashboardPage.jsx`
- `frontend/src/pages/ThreatHuntingPage.jsx`
- `frontend/src/layouts/AppShell.jsx`

---

## Testing Strategy
1. After each step: `docker-compose up --build` and verify
2. Generate demo data and verify new features
3. Test API endpoints via `/docs`
4. Verify frontend renders without errors
5. Check database tables are created

## How to Run
```bash
docker-compose up --build
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

---

## Approval Required
Please review this plan and confirm:
1. Should I proceed with all 10 steps?
2. Any priorities to change?
3. Any features to skip or add?
