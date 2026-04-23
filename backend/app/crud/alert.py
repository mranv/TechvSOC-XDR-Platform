from datetime import datetime

from sqlalchemy import func
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.alert import Alert
from app.models.enums import AlertSeverity
from app.models.enums import AlertStatus


def create_alerts(db: Session, alerts: list[Alert]) -> list[Alert]:
    db.add_all(alerts)
    db.commit()
    for alert in alerts:
        db.refresh(alert)
    return alerts


def list_alerts(
    db: Session,
    *,
    severity: AlertSeverity | None = None,
    status: AlertStatus | None = None,
    endpoint_id: int | None = None,
    rule_id: int | None = None,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[Alert], int]:
    filters = []

    if severity:
        filters.append(Alert.severity == severity)
    if status:
        filters.append(Alert.status == status)
    if endpoint_id is not None:
        filters.append(Alert.endpoint_id == endpoint_id)
    if rule_id is not None:
        filters.append(Alert.rule_id == rule_id)

    query = select(Alert)
    count_query = select(func.count(Alert.id))

    if filters:
        query = query.where(*filters)
        count_query = count_query.where(*filters)

    query = query.order_by(Alert.triggered_at.desc()).offset(skip).limit(limit)
    return list(db.execute(query).scalars().all()), db.execute(count_query).scalar_one()


def recent_matching_alert(
    db: Session,
    *,
    title: str,
    rule_id: int | None,
    log_entry_id: int | None,
    since: datetime,
) -> Alert | None:
    query = (
        select(Alert)
        .where(Alert.title == title)
        .where(Alert.triggered_at >= since)
        .order_by(Alert.triggered_at.desc())
    )
    if rule_id is None:
        query = query.where(Alert.rule_id.is_(None))
    else:
        query = query.where(Alert.rule_id == rule_id)
    if log_entry_id is None:
        query = query.where(Alert.log_entry_id.is_(None))
    else:
        query = query.where(Alert.log_entry_id == log_entry_id)
    return db.execute(query).scalar_one_or_none()
