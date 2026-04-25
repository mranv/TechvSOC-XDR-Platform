from __future__ import annotations

from sqlalchemy import func
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.case import Case
from app.models.case import case_incident_link
from app.models.incident import Incident


def create_case(
    db: Session,
    *,
    title: str,
    description: str,
    priority: str = "medium",
    incident_ids: list[int] | None = None,
) -> Case:
    case = Case(
        title=title,
        description=description,
        status="open",
        priority=priority,
    )
    db.add(case)
    db.commit()
    db.refresh(case)

    if incident_ids:
        incidents = db.execute(select(Incident).where(Incident.id.in_(incident_ids))).scalars().all()
        for incident in incidents:
            db.execute(
                case_incident_link.insert().values(
                    case_id=case.id,
                    incident_id=incident.id,
                )
            )
        db.commit()
        db.refresh(case)

    return case


def get_case_by_id(db: Session, case_id: int) -> Case | None:
    return db.execute(select(Case).where(Case.id == case_id)).scalar_one_or_none()


def list_cases(
    db: Session,
    *,
    status: str | None = None,
    priority: str | None = None,
    assigned_to_id: int | None = None,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[Case], int]:
    filters = []
    if status:
        filters.append(Case.status == status)
    if priority:
        filters.append(Case.priority == priority)
    if assigned_to_id is not None:
        filters.append(Case.assigned_to_id == assigned_to_id)

    query = select(Case).order_by(Case.created_at.desc())
    count_query = select(func.count(Case.id))

    if filters:
        query = query.where(*filters)
        count_query = count_query.where(*filters)

    query = query.offset(skip).limit(limit)
    items = list(db.execute(query).scalars().all())
    total = db.execute(count_query).scalar_one()
    return items, total


def update_case(
    db: Session,
    case: Case,
    *,
    title: str | None = None,
    description: str | None = None,
    status: str | None = None,
    priority: str | None = None,
    assigned_to_id: int | None = None,
) -> Case:
    if title is not None:
        case.title = title
    if description is not None:
        case.description = description
    if status is not None:
        case.status = status
        if status == "closed":
            from datetime import UTC, datetime
            case.closed_at = datetime.now(UTC)
    if priority is not None:
        case.priority = priority
    if assigned_to_id is not None:
        case.assigned_to_id = assigned_to_id

    db.add(case)
    db.commit()
    db.refresh(case)
    return case


def delete_case(db: Session, case: Case) -> None:
    db.execute(case_incident_link.delete().where(case_incident_link.c.case_id == case.id))
    db.delete(case)
    db.commit()


def add_incident_to_case(db: Session, case: Case, incident_id: int) -> None:
    exists = db.execute(
        select(case_incident_link).where(
            case_incident_link.c.case_id == case.id,
            case_incident_link.c.incident_id == incident_id,
        )
    ).first()
    if not exists:
        db.execute(
            case_incident_link.insert().values(
                case_id=case.id,
                incident_id=incident_id,
            )
        )
        db.commit()
        db.refresh(case)


def remove_incident_from_case(db: Session, case: Case, incident_id: int) -> None:
    db.execute(
        case_incident_link.delete().where(
            case_incident_link.c.case_id == case.id,
            case_incident_link.c.incident_id == incident_id,
        )
    )
    db.commit()
    db.refresh(case)

