from __future__ import annotations

from datetime import UTC
from datetime import datetime
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.alert import Alert
from app.models.incident import Incident
from app.models.log_entry import LogEntry
from app.models.soar_action import SoarAction


def get_recent_activity(
    db: Session,
    *,
    since: datetime | None = None,
    limit: int = 50,
) -> list[dict]:
    """Fetch recent activity across logs, alerts, incidents, and SOAR actions."""
    if since is None:
        since = datetime.now(UTC) - timedelta(minutes=30)

    activities: list[dict] = []

    # Recent logs
    log_query = (
        select(LogEntry)
        .where(LogEntry.created_at >= since)
        .order_by(LogEntry.created_at.desc())
        .limit(limit)
    )
    for log in db.execute(log_query).scalars().all():
        activities.append({
            "type": "log",
            "id": log.id,
            "timestamp": log.created_at.isoformat() if log.created_at else None,
            "title": log.message[:80] if log.message else "New log entry",
            "description": log.raw_log[:120] if log.raw_log else "",
            "severity": str(log.severity).lower(),
            "source": log.source,
        })

    # Recent alerts
    alert_query = (
        select(Alert)
        .where(Alert.created_at >= since)
        .order_by(Alert.created_at.desc())
        .limit(limit)
    )
    for alert in db.execute(alert_query).scalars().all():
        activities.append({
            "type": "alert",
            "id": alert.id,
            "timestamp": alert.created_at.isoformat() if alert.created_at else None,
            "title": alert.title,
            "description": alert.description[:120] if alert.description else "",
            "severity": str(alert.severity).lower(),
            "status": str(alert.status).lower(),
        })

    # Recent incidents
    incident_query = (
        select(Incident)
        .where(Incident.created_at >= since)
        .order_by(Incident.created_at.desc())
        .limit(limit)
    )
    for incident in db.execute(incident_query).scalars().all():
        activities.append({
            "type": "incident",
            "id": incident.id,
            "timestamp": incident.created_at.isoformat() if incident.created_at else None,
            "title": incident.title,
            "description": incident.description[:120] if incident.description else "",
            "severity": str(incident.severity).lower(),
            "status": str(incident.status).lower(),
        })

    # Recent SOAR actions
    soar_query = (
        select(SoarAction)
        .where(SoarAction.created_at >= since)
        .order_by(SoarAction.created_at.desc())
        .limit(limit)
    )
    for action in db.execute(soar_query).scalars().all():
        activities.append({
            "type": "soar",
            "id": action.id,
            "timestamp": action.created_at.isoformat() if action.created_at else None,
            "title": f"SOAR: {action.action_type.value.replace('_', ' ').title()}",
            "description": f"Target: {action.target_value} — {action.reason[:80]}",
            "status": action.status,
        })

    # Sort by timestamp descending
    activities.sort(
        key=lambda x: x["timestamp"] or "",
        reverse=True,
    )
    return activities[:limit]

