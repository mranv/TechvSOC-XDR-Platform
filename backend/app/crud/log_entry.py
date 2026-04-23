from datetime import datetime

from sqlalchemy import func
from sqlalchemy import or_
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.enums import LogLevel
from app.models.log_entry import LogEntry


def create_log_entries(db: Session, entries: list[LogEntry]) -> list[LogEntry]:
    db.add_all(entries)
    db.commit()
    for entry in entries:
        db.refresh(entry)
    return entries


def get_log_by_id(db: Session, log_id: int) -> LogEntry | None:
    statement = select(LogEntry).where(LogEntry.id == log_id)
    return db.execute(statement).scalar_one_or_none()


def search_logs(
    db: Session,
    *,
    q: str | None = None,
    source: str | None = None,
    event_type: str | None = None,
    severity: LogLevel | None = None,
    endpoint_id: int | None = None,
    start_time: datetime | None = None,
    end_time: datetime | None = None,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[LogEntry], int]:
    filters = []

    if q:
        pattern = f"%{q.strip()}%"
        filters.append(
            or_(
                LogEntry.message.ilike(pattern),
                LogEntry.raw_log.ilike(pattern),
                LogEntry.source.ilike(pattern),
                LogEntry.event_type.ilike(pattern),
            )
        )
    if source:
        filters.append(LogEntry.source.ilike(f"%{source.strip()}%"))
    if event_type:
        filters.append(LogEntry.event_type.ilike(f"%{event_type.strip()}%"))
    if severity:
        filters.append(LogEntry.severity == severity)
    if endpoint_id is not None:
        filters.append(LogEntry.endpoint_id == endpoint_id)
    if start_time is not None:
        filters.append(LogEntry.event_timestamp >= start_time)
    if end_time is not None:
        filters.append(LogEntry.event_timestamp <= end_time)

    base_query = select(LogEntry)
    count_query = select(func.count(LogEntry.id))

    if filters:
        base_query = base_query.where(*filters)
        count_query = count_query.where(*filters)

    base_query = base_query.order_by(LogEntry.event_timestamp.desc()).offset(skip).limit(limit)
    items = list(db.execute(base_query).scalars().all())
    total = db.execute(count_query).scalar_one()
    return items, total
