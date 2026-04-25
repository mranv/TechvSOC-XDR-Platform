from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.incident_note import IncidentActivity


def create_incident_activity(
    db: Session,
    *,
    incident_id: int,
    actor_id: int | None,
    action: str,
    old_value: str | None = None,
    new_value: str | None = None,
) -> IncidentActivity:
    activity = IncidentActivity(
        incident_id=incident_id,
        actor_id=actor_id,
        action=action,
        old_value=old_value,
        new_value=new_value,
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return activity


def list_incident_activities(
    db: Session,
    incident_id: int,
) -> list[IncidentActivity]:
    return list(
        db.execute(
            select(IncidentActivity)
            .where(IncidentActivity.incident_id == incident_id)
            .order_by(IncidentActivity.created_at.desc())
        ).scalars().all()
    )

