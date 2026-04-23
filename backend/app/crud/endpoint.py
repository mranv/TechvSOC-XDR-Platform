from datetime import datetime

from sqlalchemy import func
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.endpoint_metric import EndpointMetric
from app.models.endpoint_registration import EndpointRegistration


def get_endpoint_by_id(db: Session, endpoint_id: int) -> EndpointRegistration | None:
    statement = select(EndpointRegistration).where(EndpointRegistration.id == endpoint_id)
    return db.execute(statement).scalar_one_or_none()


def get_endpoint_by_hostname(db: Session, hostname: str) -> EndpointRegistration | None:
    statement = select(EndpointRegistration).where(EndpointRegistration.hostname == hostname)
    return db.execute(statement).scalar_one_or_none()


def list_endpoints(
    db: Session,
    *,
    status: str | None = None,
    is_active: bool | None = None,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[EndpointRegistration], int]:
    filters = []
    if status:
        filters.append(EndpointRegistration.status == status)
    if is_active is not None:
        filters.append(EndpointRegistration.is_active.is_(is_active))

    query = select(EndpointRegistration)
    count_query = select(func.count(EndpointRegistration.id))
    if filters:
        query = query.where(*filters)
        count_query = count_query.where(*filters)

    query = query.order_by(EndpointRegistration.updated_at.desc()).offset(skip).limit(limit)
    items = list(db.execute(query).scalars().all())
    total = db.execute(count_query).scalar_one()
    return items, total


def create_endpoint(
    db: Session,
    *,
    hostname: str,
    ip_address: str,
    operating_system: str,
    agent_version: str,
    status: str = "online",
    last_seen_ip: str | None = None,
    notes: str | None = None,
) -> EndpointRegistration:
    endpoint = EndpointRegistration(
        hostname=hostname,
        ip_address=ip_address,
        operating_system=operating_system,
        agent_version=agent_version,
        status=status,
        last_seen_ip=last_seen_ip or ip_address,
        notes=notes,
        is_active=True,
    )
    db.add(endpoint)
    db.commit()
    db.refresh(endpoint)
    return endpoint


def update_endpoint(
    db: Session,
    endpoint: EndpointRegistration,
    *,
    ip_address: str,
    operating_system: str,
    agent_version: str,
    status: str,
    last_seen_ip: str | None = None,
    notes: str | None = None,
) -> EndpointRegistration:
    endpoint.ip_address = ip_address
    endpoint.operating_system = operating_system
    endpoint.agent_version = agent_version
    endpoint.status = status
    endpoint.last_seen_ip = last_seen_ip or ip_address
    endpoint.notes = notes
    db.add(endpoint)
    db.commit()
    db.refresh(endpoint)
    return endpoint


def create_metric(
    db: Session,
    *,
    endpoint_id: int,
    cpu_usage: float,
    memory_usage: float,
    disk_usage: float,
    uptime_seconds: float,
    process_count: int,
    metric_source: str,
    collected_at: datetime,
) -> EndpointMetric:
    metric = EndpointMetric(
        endpoint_id=endpoint_id,
        cpu_usage=cpu_usage,
        memory_usage=memory_usage,
        disk_usage=disk_usage,
        uptime_seconds=uptime_seconds,
        process_count=process_count,
        metric_source=metric_source,
        collected_at=collected_at,
    )
    db.add(metric)
    db.commit()
    db.refresh(metric)
    return metric


def list_endpoint_metrics(
    db: Session,
    *,
    endpoint_id: int,
    skip: int = 0,
    limit: int = 100,
) -> list[EndpointMetric]:
    query = (
        select(EndpointMetric)
        .where(EndpointMetric.endpoint_id == endpoint_id)
        .order_by(EndpointMetric.collected_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return list(db.execute(query).scalars().all())


def get_latest_metric_for_endpoint(
    db: Session,
    *,
    endpoint_id: int,
) -> EndpointMetric | None:
    query = (
        select(EndpointMetric)
        .where(EndpointMetric.endpoint_id == endpoint_id)
        .order_by(EndpointMetric.collected_at.desc())
        .limit(1)
    )
    return db.execute(query).scalar_one_or_none()
