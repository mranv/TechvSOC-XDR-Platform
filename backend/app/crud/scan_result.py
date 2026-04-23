from sqlalchemy import func
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.enums import ScanStatus
from app.models.scan_result import ScanResult


def create_scan_result(db: Session, scan_result: ScanResult) -> ScanResult:
    db.add(scan_result)
    db.commit()
    db.refresh(scan_result)
    return scan_result


def update_scan_result(db: Session, scan_result: ScanResult) -> ScanResult:
    db.add(scan_result)
    db.commit()
    db.refresh(scan_result)
    return scan_result


def get_scan_result_by_id(db: Session, scan_id: int) -> ScanResult | None:
    query = select(ScanResult).where(ScanResult.id == scan_id)
    return db.execute(query).scalar_one_or_none()


def list_scan_results(
    db: Session,
    *,
    endpoint_id: int | None = None,
    status: ScanStatus | None = None,
    target: str | None = None,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[ScanResult], int]:
    filters = []
    if endpoint_id is not None:
        filters.append(ScanResult.endpoint_id == endpoint_id)
    if status is not None:
        filters.append(ScanResult.status == status)
    if target:
        filters.append(ScanResult.target.ilike(f"%{target.strip()}%"))

    query = select(ScanResult)
    count_query = select(func.count(ScanResult.id))
    if filters:
        query = query.where(*filters)
        count_query = count_query.where(*filters)

    query = query.order_by(ScanResult.created_at.desc()).offset(skip).limit(limit)
    items = list(db.execute(query).scalars().all())
    total = db.execute(count_query).scalar_one()
    return items, total
