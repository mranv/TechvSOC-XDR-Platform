from __future__ import annotations

import json
import re
from collections import defaultdict
from datetime import UTC
from datetime import datetime
from datetime import timedelta

from sqlalchemy import or_
from sqlalchemy import select
from sqlalchemy import String
from sqlalchemy.orm import Session

from app.models.alert import Alert
from app.models.enums import AlertStatus
from app.models.incident import Incident
from app.models.log_entry import LogEntry
from app.services.threat_intel_service import batch_enrich_ips


IP_REGEX = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")
USER_REGEX = re.compile(r"(?:user|for|from|account|uid)\s*[:=]?\s*['\"]?([a-zA-Z0-9._@-]{2,30})['\"]?", re.IGNORECASE)
HOST_REGEX = re.compile(r"(?:host|hostname|endpoint|machine|workstation|server|rhost|src|dst)\s*[:=]?\s*['\"]?([a-zA-Z0-9._-]{3,40})['\"]?", re.IGNORECASE)


def _extract_entities(text: str) -> dict[str, list[str]]:
    if not text:
        return {"ips": [], "users": [], "hosts": []}
    return {
        "ips": list(set(IP_REGEX.findall(text))),
        "users": list(set(m.group(1) for m in USER_REGEX.finditer(text) if m.group(1))),
        "hosts": list(set(m.group(1) for m in HOST_REGEX.finditer(text) if m.group(1))),
    }


def _json_to_text(data: dict | list | None) -> str:
    if not data:
        return ""
    return json.dumps(data, default=str)


def _get_entity_text_fields(record) -> str:
    parts = []
    if hasattr(record, "message"):
        parts.append(str(record.message))
    if hasattr(record, "raw_log"):
        parts.append(str(record.raw_log))
    if hasattr(record, "title"):
        parts.append(str(record.title))
    if hasattr(record, "description"):
        parts.append(str(record.description))
    if hasattr(record, "metadata_json") and record.metadata_json:
        parts.append(_json_to_text(record.metadata_json))
    if hasattr(record, "attack_chain_json") and record.attack_chain_json:
        parts.append(_json_to_text(record.attack_chain_json))
    if hasattr(record, "timeline_json") and record.timeline_json:
        parts.append(_json_to_text(record.timeline_json))
    return " ".join(parts)


def search_entities(
    db: Session,
    *,
    q: str,
    entity_type: str | None = None,
    hours: int = 168,
    limit: int = 100,
) -> list[dict]:
    """Search across logs, alerts, and incidents to find entities matching query."""
    window_start = datetime.now(UTC) - timedelta(hours=hours)
    pattern = f"%{q}%"

    # Search logs
    log_query = (
        select(LogEntry)
        .where(LogEntry.event_timestamp >= window_start)
        .where(
            or_(
                LogEntry.message.ilike(pattern),
                LogEntry.raw_log.ilike(pattern),
                LogEntry.source.ilike(pattern),
            )
        )
        .limit(limit)
    )
    logs = list(db.execute(log_query).scalars().all())

    # Search alerts
    alert_query = (
        select(Alert)
        .where(Alert.triggered_at >= window_start)
        .where(
            or_(
                Alert.title.ilike(pattern),
                Alert.description.ilike(pattern),
            )
        )
        .limit(limit)
    )
    alerts = list(db.execute(alert_query).scalars().all())

    # Search incidents
    incident_query = (
        select(Incident)
        .where(Incident.created_at >= window_start)
        .where(
            or_(
                Incident.title.ilike(pattern),
                Incident.description.ilike(pattern),
            )
        )
        .limit(limit)
    )
    incidents = list(db.execute(incident_query).scalars().all())

    # Aggregate entities
    entity_counts = defaultdict(lambda: {"ips": set(), "users": set(), "hosts": set(), "total_events": 0, "first_seen": None, "last_seen": None, "max_severity": 0})

    severity_score = {"critical": 4, "high": 3, "medium": 2, "low": 1}

    for log in logs:
        text = _get_entity_text_fields(log)
        entities = _extract_entities(text)
        ts = log.event_timestamp or log.created_at
        for ip in entities["ips"]:
            entity_counts[("ip", ip)]["ips"].add(ip)
            entity_counts[("ip", ip)]["total_events"] += 1
            if ts:
                if entity_counts[("ip", ip)]["first_seen"] is None or ts < entity_counts[("ip", ip)]["first_seen"]:
                    entity_counts[("ip", ip)]["first_seen"] = ts
                if entity_counts[("ip", ip)]["last_seen"] is None or ts > entity_counts[("ip", ip)]["last_seen"]:
                    entity_counts[("ip", ip)]["last_seen"] = ts
        for user in entities["users"]:
            entity_counts[("user", user)]["users"].add(user)
            entity_counts[("user", user)]["total_events"] += 1
            if ts:
                if entity_counts[("user", user)]["first_seen"] is None or ts < entity_counts[("user", user)]["first_seen"]:
                    entity_counts[("user", user)]["first_seen"] = ts
                if entity_counts[("user", user)]["last_seen"] is None or ts > entity_counts[("user", user)]["last_seen"]:
                    entity_counts[("user", user)]["last_seen"] = ts
        for host in entities["hosts"]:
            entity_counts[("host", host)]["hosts"].add(host)
            entity_counts[("host", host)]["total_events"] += 1
            if ts:
                if entity_counts[("host", host)]["first_seen"] is None or ts < entity_counts[("host", host)]["first_seen"]:
                    entity_counts[("host", host)]["first_seen"] = ts
                if entity_counts[("host", host)]["last_seen"] is None or ts > entity_counts[("host", host)]["last_seen"]:
                    entity_counts[("host", host)]["last_seen"] = ts

    for alert in alerts:
        text = _get_entity_text_fields(alert)
        entities = _extract_entities(text)
        ts = alert.triggered_at or alert.created_at
        sev = severity_score.get(str(alert.severity).lower(), 1)
        for ip in entities["ips"]:
            entity_counts[("ip", ip)]["total_events"] += 1
            entity_counts[("ip", ip)]["max_severity"] = max(entity_counts[("ip", ip)]["max_severity"], sev)
            if ts:
                if entity_counts[("ip", ip)]["first_seen"] is None or ts < entity_counts[("ip", ip)]["first_seen"]:
                    entity_counts[("ip", ip)]["first_seen"] = ts
                if entity_counts[("ip", ip)]["last_seen"] is None or ts > entity_counts[("ip", ip)]["last_seen"]:
                    entity_counts[("ip", ip)]["last_seen"] = ts
        for user in entities["users"]:
            entity_counts[("user", user)]["total_events"] += 1
            entity_counts[("user", user)]["max_severity"] = max(entity_counts[("user", user)]["max_severity"], sev)
            if ts:
                if entity_counts[("user", user)]["first_seen"] is None or ts < entity_counts[("user", user)]["first_seen"]:
                    entity_counts[("user", user)]["first_seen"] = ts
                if entity_counts[("user", user)]["last_seen"] is None or ts > entity_counts[("user", user)]["last_seen"]:
                    entity_counts[("user", user)]["last_seen"] = ts
        for host in entities["hosts"]:
            entity_counts[("host", host)]["total_events"] += 1
            entity_counts[("host", host)]["max_severity"] = max(entity_counts[("host", host)]["max_severity"], sev)
            if ts:
                if entity_counts[("host", host)]["first_seen"] is None or ts < entity_counts[("host", host)]["first_seen"]:
                    entity_counts[("host", host)]["first_seen"] = ts
                if entity_counts[("host", host)]["last_seen"] is None or ts > entity_counts[("host", host)]["last_seen"]:
                    entity_counts[("host", host)]["last_seen"] = ts

    for incident in incidents:
        text = _get_entity_text_fields(incident)
        entities = _extract_entities(text)
        ts = incident.created_at
        sev = severity_score.get(str(incident.severity).lower(), 1)
        for ip in entities["ips"]:
            entity_counts[("ip", ip)]["total_events"] += 1
            entity_counts[("ip", ip)]["max_severity"] = max(entity_counts[("ip", ip)]["max_severity"], sev)
            if ts:
                if entity_counts[("ip", ip)]["first_seen"] is None or ts < entity_counts[("ip", ip)]["first_seen"]:
                    entity_counts[("ip", ip)]["first_seen"] = ts
                if entity_counts[("ip", ip)]["last_seen"] is None or ts > entity_counts[("ip", ip)]["last_seen"]:
                    entity_counts[("ip", ip)]["last_seen"] = ts
        for user in entities["users"]:
            entity_counts[("user", user)]["total_events"] += 1
            entity_counts[("user", user)]["max_severity"] = max(entity_counts[("user", user)]["max_severity"], sev)
            if ts:
                if entity_counts[("user", user)]["first_seen"] is None or ts < entity_counts[("user", user)]["first_seen"]:
                    entity_counts[("user", user)]["first_seen"] = ts
                if entity_counts[("user", user)]["last_seen"] is None or ts > entity_counts[("user", user)]["last_seen"]:
                    entity_counts[("user", user)]["last_seen"] = ts
        for host in entities["hosts"]:
            entity_counts[("host", host)]["total_events"] += 1
            entity_counts[("host", host)]["max_severity"] = max(entity_counts[("host", host)]["max_severity"], sev)
            if ts:
                if entity_counts[("host", host)]["first_seen"] is None or ts < entity_counts[("host", host)]["first_seen"]:
                    entity_counts[("host", host)]["first_seen"] = ts
                if entity_counts[("host", host)]["last_seen"] is None or ts > entity_counts[("host", host)]["last_seen"]:
                    entity_counts[("host", host)]["last_seen"] = ts

    results = []
    for (etype, value), data in entity_counts.items():
        if entity_type and etype != entity_type:
            continue
        # Only include if the query matches the entity value directly or the entity was found
        if q.lower() not in value.lower():
            continue
        severity_label = {4: "critical", 3: "high", 2: "medium", 1: "low"}.get(data["max_severity"], "low")
        results.append({
            "type": etype,
            "value": value,
            "total_events": data["total_events"],
            "first_seen": data["first_seen"].isoformat() if data["first_seen"] else None,
            "last_seen": data["last_seen"].isoformat() if data["last_seen"] else None,
            "max_severity": severity_label,
        })

    results.sort(key=lambda x: (-x["total_events"], x["value"]))
    return results[:limit]


def get_entity_profile(
    db: Session,
    *,
    entity_type: str,
    entity_value: str,
    hours: int = 168,
    limit: int = 50,
) -> dict:
    """Get full profile for a specific entity."""
    window_start = datetime.now(UTC) - timedelta(hours=hours)
    pattern = f"%{entity_value}%"

    # Gather related logs
    log_query = (
        select(LogEntry)
        .where(LogEntry.event_timestamp >= window_start)
        .where(
            or_(
                LogEntry.message.ilike(pattern),
                LogEntry.raw_log.ilike(pattern),
                LogEntry.metadata_json.cast(String).ilike(pattern),
            )
        )
        .order_by(LogEntry.event_timestamp.desc())
        .limit(limit)
    )
    logs = list(db.execute(log_query).scalars().all())

    # Gather related alerts
    alert_query = (
        select(Alert)
        .where(Alert.triggered_at >= window_start)
        .where(
            or_(
                Alert.title.ilike(pattern),
                Alert.description.ilike(pattern),
            )
        )
        .order_by(Alert.triggered_at.desc())
        .limit(limit)
    )
    alerts = list(db.execute(alert_query).scalars().all())

    # Gather related incidents
    incident_query = (
        select(Incident)
        .where(Incident.created_at >= window_start)
        .where(
            or_(
                Incident.title.ilike(pattern),
                Incident.description.ilike(pattern),
            )
        )
        .order_by(Incident.created_at.desc())
        .limit(limit)
    )
    incidents = list(db.execute(incident_query).scalars().all())

    # Build timeline
    timeline = []
    for log in logs:
        timeline.append({
            "type": "log",
            "timestamp": (log.event_timestamp or log.created_at).isoformat() if (log.event_timestamp or log.created_at) else None,
            "title": log.message[:120],
            "description": log.raw_log[:200],
            "severity": str(log.severity).lower(),
            "source": log.source,
            "id": log.id,
        })
    for alert in alerts:
        timeline.append({
            "type": "alert",
            "timestamp": (alert.triggered_at or alert.created_at).isoformat() if (alert.triggered_at or alert.created_at) else None,
            "title": alert.title,
            "description": alert.description[:200],
            "severity": str(alert.severity).lower(),
            "status": str(alert.status).lower(),
            "id": alert.id,
        })
    for incident in incidents:
        timeline.append({
            "type": "incident",
            "timestamp": incident.created_at.isoformat() if incident.created_at else None,
            "title": incident.title,
            "description": incident.description[:200],
            "severity": str(incident.severity).lower(),
            "status": str(incident.status).lower(),
            "id": incident.id,
        })

    timeline.sort(key=lambda x: x["timestamp"] or "", reverse=True)

    # Calculate severity distribution
    severity_counts = defaultdict(int)
    for item in timeline:
        severity_counts[item.get("severity", "low")] += 1

    # Find related entities
    all_text = " ".join(_get_entity_text_fields(r) for r in logs + alerts + incidents)
    related = _extract_entities(all_text)
    related_entities = []
    for ip in related["ips"]:
        if ip != entity_value:
            related_entities.append({"type": "ip", "value": ip})
    for user in related["users"]:
        if user.lower() != entity_value.lower():
            related_entities.append({"type": "user", "value": user})
    for host in related["hosts"]:
        if host.lower() != entity_value.lower():
            related_entities.append({"type": "host", "value": host})

    # Get threat intel for IPs
    threat_intel = None
    geo_info = None
    if entity_type == "ip":
        try:
            record = batch_enrich_ips(db, [entity_value])[0]
            threat_intel = {
                "ip_address": record.ip_address,
                "country": record.country,
                "asn": record.asn,
                "reputation_score": record.reputation_score,
                "is_malicious": record.is_malicious,
                "threat_categories": record.threat_categories,
                "source": record.source,
            }
            geo_info = {
                "country": record.country or "Unknown",
                "city": "Unknown",
                "latitude": 0.0,
                "longitude": 0.0,
            }
        except Exception:
            geo_info = {
                "country": "Unknown",
                "city": "Unknown",
                "latitude": 0.0,
                "longitude": 0.0,
            }

    # Build behavior summary
    behavior_summary = []
    if logs:
        event_types = defaultdict(int)
        for log in logs:
            event_types[log.event_type] += 1
        top_event = max(event_types, key=event_types.get) if event_types else None
        if top_event:
            behavior_summary.append(f"Most frequent activity: {top_event} ({event_types[top_event]} events)")
    if alerts:
        behavior_summary.append(f"Triggered {len(alerts)} detection alerts")
    if incidents:
        behavior_summary.append(f"Linked to {len(incidents)} incidents")

    # Compute risk score
    severity_score = {"critical": 100, "high": 75, "medium": 50, "low": 25}
    max_sev_score = max((severity_score.get(s, 0) for s in severity_counts), default=0)
    event_factor = min(len(timeline) * 3, 40)
    alert_factor = len(alerts) * 10
    incident_factor = len(incidents) * 15
    threat_factor = 20 if (threat_intel and threat_intel.get("is_malicious")) else 0
    risk_score = min(100, max_sev_score + event_factor + alert_factor + incident_factor + threat_factor)

    all_timestamps = [datetime.fromisoformat(t["timestamp"].replace("Z", "+00:00")) for t in timeline if t.get("timestamp")]
    first_seen = min(all_timestamps).isoformat() if all_timestamps else None
    last_seen = max(all_timestamps).isoformat() if all_timestamps else None

    return {
        "type": entity_type,
        "value": entity_value,
        "risk_score": risk_score,
        "first_seen": first_seen,
        "last_seen": last_seen,
        "total_events": len(timeline),
        "severity_distribution": dict(severity_counts),
        "related_logs": [
            {
                "id": log.id,
                "message": log.message,
                "severity": str(log.severity).lower(),
                "source": log.source,
                "event_type": log.event_type,
                "timestamp": (log.event_timestamp or log.created_at).isoformat() if (log.event_timestamp or log.created_at) else None,
            }
            for log in logs[:20]
        ],
        "related_alerts": [
            {
                "id": alert.id,
                "title": alert.title,
                "severity": str(alert.severity).lower(),
                "status": str(alert.status).lower(),
                "timestamp": (alert.triggered_at or alert.created_at).isoformat() if (alert.triggered_at or alert.created_at) else None,
            }
            for alert in alerts[:20]
        ],
        "related_incidents": [
            {
                "id": incident.id,
                "title": incident.title,
                "severity": str(incident.severity).lower(),
                "status": str(incident.status).lower(),
                "timestamp": incident.created_at.isoformat() if incident.created_at else None,
            }
            for incident in incidents[:20]
        ],
        "timeline": timeline[:50],
        "related_entities": related_entities[:20],
        "threat_intel": threat_intel,
        "geo_info": geo_info,
        "behavior_summary": behavior_summary,
    }

