from __future__ import annotations

import re
from collections import defaultdict
from datetime import UTC
from datetime import datetime
from datetime import timedelta

from fastapi import HTTPException
from fastapi import status
from sqlalchemy.orm import Session

from app.crud.alert import create_alerts
from app.crud.alert import recent_matching_alert
from app.crud.detection_log import get_logs_in_window
from app.crud.detection_rule import create_rule
from app.crud.detection_rule import get_rule_by_name
from app.crud.detection_rule import list_rules
from app.models.alert import Alert
from app.models.detection_rule import DetectionRule
from app.models.enums import AlertSeverity
from app.models.enums import AlertStatus
from app.models.enums import RuleType
from app.models.log_entry import LogEntry
from app.schemas.detection import DetectionRuleCreateRequest

DEFAULT_RULES: list[DetectionRuleCreateRequest] = [
    DetectionRuleCreateRequest(
        name="Brute Force Login Detector",
        description="Detect repeated failed login attempts from the same source IP or username.",
        rule_type=RuleType.BRUTE_FORCE,
        pattern="failed login|authentication failure|invalid password",
        condition_json={"threshold": 5, "window_minutes": 15},
        severity=AlertSeverity.HIGH,
        is_enabled=True,
    ),
    DetectionRuleCreateRequest(
        name="Suspicious Login Detector",
        description="Detect successful logins from new or geographically inconsistent locations.",
        rule_type=RuleType.SUSPICIOUS_LOGIN,
        pattern="login success|successful login|authenticated",
        condition_json={"window_hours": 6},
        severity=AlertSeverity.MEDIUM,
        is_enabled=True,
    ),
]


def seed_default_rules(db: Session) -> None:
    for payload in DEFAULT_RULES:
        if get_rule_by_name(db, payload.name) is None:
            create_rule(
                db,
                DetectionRule(
                    name=payload.name,
                    description=payload.description,
                    rule_type=payload.rule_type,
                    pattern=payload.pattern,
                    condition_json=payload.condition_json,
                    severity=payload.severity,
                    is_enabled=payload.is_enabled,
                ),
            )


def create_detection_rule(db: Session, payload: DetectionRuleCreateRequest) -> DetectionRule:
    if get_rule_by_name(db, payload.name) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A detection rule with this name already exists.",
        )
    return create_rule(
        db,
        DetectionRule(
            name=payload.name,
            description=payload.description,
            rule_type=payload.rule_type,
            pattern=payload.pattern,
            condition_json=payload.condition_json,
            severity=payload.severity,
            is_enabled=payload.is_enabled,
        ),
    )


def _log_text(log: LogEntry) -> str:
    return " ".join(
        [
            log.source or "",
            log.event_type or "",
            log.message or "",
            log.raw_log or "",
        ]
    ).lower()


def _metadata_value(log: LogEntry, key: str) -> str | None:
    metadata = log.metadata_json or {}
    value = metadata.get(key)
    if value is None:
        return None
    return str(value)


def _is_login_failure(log: LogEntry, rule: DetectionRule) -> bool:
    return bool(re.search(rule.pattern, _log_text(log), re.IGNORECASE))


def _is_login_success(log: LogEntry, rule: DetectionRule) -> bool:
    return bool(re.search(rule.pattern, _log_text(log), re.IGNORECASE))


def _build_alert(
    *,
    title: str,
    description: str,
    severity: AlertSeverity,
    endpoint_id: int | None,
    log_entry_id: int | None,
    rule_id: int | None,
    timeline: list[dict],
    triggered_at: datetime,
) -> Alert:
    return Alert(
        title=title,
        description=description,
        severity=severity,
        status=AlertStatus.OPEN,
        endpoint_id=endpoint_id,
        log_entry_id=log_entry_id,
        rule_id=rule_id,
        source="detection_engine",
        timeline_json=timeline,
        triggered_at=triggered_at,
    )


def _dedupe_alert(
    db: Session,
    *,
    title: str,
    rule_id: int | None,
    log_entry_id: int | None,
    within_minutes: int = 30,
) -> bool:
    since = datetime.now(UTC) - timedelta(minutes=within_minutes)
    return recent_matching_alert(
        db,
        title=title,
        rule_id=rule_id,
        log_entry_id=log_entry_id,
        since=since,
    ) is not None


def evaluate_brute_force_rule(
    db: Session,
    *,
    rule: DetectionRule,
    logs: list[LogEntry],
) -> list[Alert]:
    threshold = int((rule.condition_json or {}).get("threshold", 5))
    grouped: dict[tuple[str, str], list[LogEntry]] = defaultdict(list)

    for log in logs:
        if not _is_login_failure(log, rule):
            continue
        username = _metadata_value(log, "username") or "unknown-user"
        ip_address = _metadata_value(log, "ip_address") or _metadata_value(log, "source_ip") or "unknown-ip"
        grouped[(username, ip_address)].append(log)

    alerts: list[Alert] = []
    for (username, ip_address), failed_logs in grouped.items():
        if len(failed_logs) < threshold:
            continue
        latest = max(failed_logs, key=lambda item: item.event_timestamp)
        title = f"Brute force activity detected for {username}"
        if _dedupe_alert(db, title=title, rule_id=rule.id, log_entry_id=latest.id):
            continue
        timeline = [
            {
                "log_entry_id": item.id,
                "event_timestamp": item.event_timestamp.isoformat(),
                "message": item.message,
            }
            for item in failed_logs[:10]
        ]
        alerts.append(
            _build_alert(
                title=title,
                description=(
                    f"{len(failed_logs)} failed login attempts were detected for user "
                    f"{username} from {ip_address} within the configured time window."
                ),
                severity=rule.severity,
                endpoint_id=latest.endpoint_id,
                log_entry_id=latest.id,
                rule_id=rule.id,
                timeline=timeline,
                triggered_at=latest.event_timestamp,
            )
        )
    return alerts


def evaluate_suspicious_login_rule(
    db: Session,
    *,
    rule: DetectionRule,
    logs: list[LogEntry],
) -> list[Alert]:
    window_hours = int((rule.condition_json or {}).get("window_hours", 6))
    grouped: dict[str, list[LogEntry]] = defaultdict(list)

    for log in logs:
        if not _is_login_success(log, rule):
            continue
        username = _metadata_value(log, "username") or _metadata_value(log, "user")
        if not username:
            continue
        grouped[username].append(log)

    alerts: list[Alert] = []
    for username, user_logs in grouped.items():
        ordered = sorted(user_logs, key=lambda item: item.event_timestamp)
        for current in ordered:
            current_country = _metadata_value(current, "country") or _metadata_value(current, "geo_country")
            current_ip = _metadata_value(current, "ip_address") or _metadata_value(current, "source_ip")
            if not current_country and not current_ip:
                continue

            lookback_start = current.event_timestamp - timedelta(hours=window_hours)
            prior = [
                item
                for item in ordered
                if lookback_start <= item.event_timestamp < current.event_timestamp
            ]
            if not prior:
                continue

            suspicious_reason = None
            for previous in prior:
                previous_country = _metadata_value(previous, "country") or _metadata_value(previous, "geo_country")
                previous_ip = _metadata_value(previous, "ip_address") or _metadata_value(previous, "source_ip")
                if current_country and previous_country and current_country != previous_country:
                    suspicious_reason = (
                        f"Successful logins for {username} were observed from "
                        f"{previous_country} and {current_country} within {window_hours} hours."
                    )
                    break
                if current_ip and previous_ip and current_ip != previous_ip and current_country and not previous_country:
                    suspicious_reason = (
                        f"Successful logins for {username} were observed from multiple source IPs "
                        f"including {previous_ip} and {current_ip} within {window_hours} hours."
                    )
                    break

            if suspicious_reason is None:
                continue

            title = f"Suspicious login detected for {username}"
            if _dedupe_alert(db, title=title, rule_id=rule.id, log_entry_id=current.id):
                continue
            timeline = [
                {
                    "log_entry_id": item.id,
                    "event_timestamp": item.event_timestamp.isoformat(),
                    "message": item.message,
                }
                for item in prior[-4:] + [current]
            ]
            alerts.append(
                _build_alert(
                    title=title,
                    description=suspicious_reason,
                    severity=rule.severity,
                    endpoint_id=current.endpoint_id,
                    log_entry_id=current.id,
                    rule_id=rule.id,
                    timeline=timeline,
                    triggered_at=current.event_timestamp,
                )
            )
            break
    return alerts


def evaluate_custom_rule(
    db: Session,
    *,
    rule: DetectionRule,
    logs: list[LogEntry],
) -> list[Alert]:
    matches: list[Alert] = []
    filters = rule.condition_json or {}
    expected_event_type = filters.get("event_type")
    expected_source = filters.get("source")

    for log in logs:
        if expected_event_type and log.event_type != expected_event_type:
            continue
        if expected_source and expected_source.lower() not in (log.source or "").lower():
            continue
        if not re.search(rule.pattern, _log_text(log), re.IGNORECASE):
            continue

        title = f"Custom rule matched: {rule.name}"
        if _dedupe_alert(db, title=title, rule_id=rule.id, log_entry_id=log.id):
            continue
        matches.append(
            _build_alert(
                title=title,
                description=(
                    f"Rule '{rule.name}' matched log {log.id} from source "
                    f"{log.source} with event type {log.event_type}."
                ),
                severity=rule.severity,
                endpoint_id=log.endpoint_id,
                log_entry_id=log.id,
                rule_id=rule.id,
                timeline=[
                    {
                        "log_entry_id": log.id,
                        "event_timestamp": log.event_timestamp.isoformat(),
                        "message": log.message,
                    }
                ],
                triggered_at=log.event_timestamp,
            )
        )
    return matches


def run_detection_cycle(
    db: Session,
    *,
    hours: int = 24,
) -> tuple[list[Alert], int, int, datetime, datetime]:
    seed_default_rules(db)

    window_end = datetime.now(UTC)
    window_start = window_end - timedelta(hours=hours)
    rules = list_rules(db, enabled_only=True)
    logs = get_logs_in_window(db, start_time=window_start, end_time=window_end)

    pending_alerts: list[Alert] = []
    for rule in rules:
        if rule.rule_type == RuleType.BRUTE_FORCE:
            pending_alerts.extend(evaluate_brute_force_rule(db, rule=rule, logs=logs))
        elif rule.rule_type == RuleType.SUSPICIOUS_LOGIN:
            pending_alerts.extend(evaluate_suspicious_login_rule(db, rule=rule, logs=logs))
        elif rule.rule_type == RuleType.CUSTOM:
            pending_alerts.extend(evaluate_custom_rule(db, rule=rule, logs=logs))

    created = create_alerts(db, pending_alerts) if pending_alerts else []
    return created, len(rules), len(logs), window_start, window_end
