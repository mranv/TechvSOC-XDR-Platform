from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.log_entry import LogEntry


def get_logs_in_window(
    db: Session,
    *,
    start_time: datetime,
    end_time: datetime,
) -> list[LogEntry]:
    query = (
        select(LogEntry)
        .where(LogEntry.event_timestamp >= start_time)
        .where(LogEntry.event_timestamp <= end_time)
        .order_by(LogEntry.event_timestamp.desc())
    )
    return list(db.execute(query).scalars().all())
