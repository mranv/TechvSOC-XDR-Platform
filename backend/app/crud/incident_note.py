from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.incident_note import IncidentNote


def create_incident_note(
    db: Session,
    *,
    incident_id: int,
    author_id: int | None,
    content: str,
) -> IncidentNote:
    note = IncidentNote(
        incident_id=incident_id,
        author_id=author_id,
        content=content,
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


def list_incident_notes(
    db: Session,
    incident_id: int,
) -> list[IncidentNote]:
    return list(
        db.execute(
            select(IncidentNote)
            .where(IncidentNote.incident_id == incident_id)
            .order_by(IncidentNote.created_at.desc())
        ).scalars().all()
    )

