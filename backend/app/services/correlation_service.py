from __future__ import annotations

import json
from collections import defaultdict
from datetime import UTC
from datetime import datetime
from datetime import timedelta

from sqlalchemy.orm import Session

from app.crud.alert import list_alerts
from app.models.alert import Alert
from app.models.enums import AlertSeverity
from app.models.enums import AlertStatus
from app.models.enums import IncidentSeverity
from app.models.enums import IncidentStatus
from app.models.incident import Incident
from app.services.incident_service import create_incident
from app.services.incident_service import generate_forensics_data
from app.services.playbook_service import evaluate_playbooks_for_incident


CORRELATION_WINDOWS = {
    "account_compromise": {"minutes": 30},
    "lateral_movement": {"minutes": 60},
    "brute_force_success": {"minutes": 15},
}


MITRE_MAPPING = {
    "account_compromise": [
        {"id": "T1110", "name": "Brute Force"},
        {"id": "T1078", "name": "Valid Accounts"},
    ],
    "lateral_movement": [
        {"id": "T1021", "name": "Remote Services"},
        {"id": "T1210", "name": "Exploitation of Remote Services"},
    ],
}


def _build_attack_chain(incident_type: str, alerts: list[Alert]) -> dict:
    mitre_list = MITRE_MAPPING.get(incident_type, [])
    steps = []
    for idx, alert in enumerate(alerts):
        mitre = mitre_list[idx % len(mitre_list)] if mitre_list else None
        steps.append(
            {
                "step": idx + 1,
                "alert_id": alert.id,
                "title": alert.title,
                "severity": str(alert.severity),
                "timestamp": alert.triggered_at.isoformat() if alert.triggered_at else None,
                "description": alert.description,
                "mitre_technique_id": mitre["id"] if mitre else None,
                "mitre_technique_name": mitre["name"] if mitre else None,
            }
        )
    return {
        "incident_type": incident_type,
        "steps": steps,
        "total_alerts": len(alerts),
        "time_span_minutes": (
            (max(a.triggered_at for a in alerts) - min(a.triggered_at for a in alerts)).total_seconds() / 60
            if all(a.triggered_at for a in alerts) and len(alerts) > 1
            else 0
        ),
    }


def _build_timeline(alerts: list[Alert]) -> list[dict]:
    timeline = []
    for alert in sorted(alerts, key=lambda a: a.triggered_at or datetime.min.replace(tzinfo=UTC)):
        timeline.append(
            {
                "type": "alert",
                "alert_id": alert.id,
                "title": alert.title,
                "severity": str(alert.severity),
                "timestamp": alert.triggered_at.isoformat() if alert.triggered_at else None,
                "description": alert.description,
            }
        )
    timeline.append(
        {
            "type": "incident_created",
            "timestamp": datetime.now(UTC).isoformat(),
            "description": f"Correlated {len(alerts)} alerts into incident via correlation engine",
        }
    )
    return timeline


def _find_brute_force_success_chain(alerts: list[Alert]) -> list[list[Alert]]:
    chains: list[list[Alert]] = []
    by_user: dict[str, list[Alert]] = defaultdict(list)

    for alert in alerts:
        if "brute force" in alert.title.lower():
            user = _extract_username(alert.title)
            by_user[user].append(alert)
        elif "suspicious login" in alert.title.lower():
            user = _extract_username(alert.title)
            by_user[user].append(alert)

    for user, user_alerts in by_user.items():
        brute_alerts = [a for a in user_alerts if "brute force" in a.title.lower()]
        success_alerts = [a for a in user_alerts if "suspicious login" in a.title.lower()]
        if brute_alerts and success_alerts:
            chain = sorted(brute_alerts + success_alerts, key=lambda a: a.triggered_at or datetime.min.replace(tzinfo=UTC))
            chains.append(chain)

    return chains


def _find_account_compromise(alerts: list[Alert]) -> list[list[Alert]]:
    chains: list[list[Alert]] = []
    by_user: dict[str, list[Alert]] = defaultdict(list)

    for alert in alerts:
        user = _extract_username(alert.title)
        if user:
            by_user[user].append(alert)

    for user, user_alerts in by_user.items():
        if len(user_alerts) >= 2:
            severities = {str(a.severity) for a in user_alerts}
            if "high" in severities or "critical" in severities:
                chain = sorted(user_alerts, key=lambda a: a.triggered_at or datetime.min.replace(tzinfo=UTC))
                chains.append(chain)

    return chains


def _extract_username(title: str) -> str:
    parts = title.split("for ")
    if len(parts) > 1:
        return parts[-1].strip().lower()
    parts = title.split("from ")
    if len(parts) > 1:
        return parts[-1].strip().lower()
    return ""


def _compute_incident_severity(alerts: list[Alert]) -> IncidentSeverity:
    severity_map = {
        "critical": 4,
        "high": 3,
        "medium": 2,
        "low": 1,
    }
    max_score = max(
        (severity_map.get(str(a.severity).lower(), 1) for a in alerts),
        default=1,
    )
    reverse_map = {
        4: IncidentSeverity.CRITICAL,
        3: IncidentSeverity.HIGH,
        2: IncidentSeverity.MEDIUM,
        1: IncidentSeverity.LOW,
    }
    return reverse_map.get(max_score, IncidentSeverity.MEDIUM)


def correlate_alerts_into_incidents(db: Session, hours: int = 24) -> list[Incident]:
    window_end = datetime.now(UTC)
    window_start = window_end - timedelta(hours=hours)

    alerts, _ = list_alerts(
        db,
        status=AlertStatus.OPEN,
        skip=0,
        limit=500,
    )
    alerts = [
        a for a in alerts
        if a.triggered_at and window_start <= a.triggered_at <= window_end
    ]

    created_incidents: list[Incident] = []
    used_alert_ids: set[int] = set()

    # Pattern 1: Brute force + success = account compromise
    bf_success_chains = _find_brute_force_success_chain(alerts)
    for chain in bf_success_chains:
        chain_ids = {a.id for a in chain}
        if chain_ids & used_alert_ids:
            continue
        used_alert_ids |= chain_ids
        incident = create_incident(
            db,
            title=f"Account compromise detected for {_extract_username(chain[0].title)}",
            description=(
                f"Multiple brute force attempts followed by successful suspicious login "
                f"for user {_extract_username(chain[0].title)}. "
                f"This indicates a potential account takeover."
            ),
            severity=_compute_incident_severity(chain),
            alert_ids=[a.id for a in chain],
            attack_chain=_build_attack_chain("account_compromise", chain),
            timeline=_build_timeline(chain),
        )
        incident.forensics_json = generate_forensics_data(incident)
        db.add(incident)
        db.commit()
        db.refresh(incident)
        created_incidents.append(incident)

    # Pattern 2: Multiple alerts for same user = lateral movement / escalation
    compromise_chains = _find_account_compromise(alerts)
    for chain in compromise_chains:
        chain_ids = {a.id for a in chain}
        if chain_ids & used_alert_ids:
            continue
        used_alert_ids |= chain_ids
        incident = create_incident(
            db,
            title=f"Suspicious activity cluster for {_extract_username(chain[0].title)}",
            description=(
                f"Multiple detection alerts for user {_extract_username(chain[0].title)} "
                f"within a short window suggesting potential lateral movement or privilege escalation."
            ),
            severity=_compute_incident_severity(chain),
            alert_ids=[a.id for a in chain],
            attack_chain=_build_attack_chain("lateral_movement", chain),
            timeline=_build_timeline(chain),
        )
        incident.forensics_json = generate_forensics_data(incident)
        db.add(incident)
        db.commit()
        db.refresh(incident)
        created_incidents.append(incident)

    # Evaluate playbooks against newly created incidents
    for incident in created_incidents:
        try:
            evaluate_playbooks_for_incident(db, incident)
        except Exception:
            pass

    return created_incidents

