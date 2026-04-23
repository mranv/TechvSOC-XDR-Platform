from fastapi import HTTPException
from fastapi import status
from sqlalchemy import func
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud.alert import list_alerts
from app.crud.endpoint import create_endpoint
from app.crud.endpoint import create_metric
from app.crud.endpoint import get_endpoint_by_hostname
from app.crud.endpoint import get_endpoint_by_id
from app.crud.endpoint import get_latest_metric_for_endpoint
from app.crud.endpoint import list_endpoint_metrics
from app.crud.endpoint import list_endpoints
from app.crud.endpoint import update_endpoint
from app.models.alert import Alert
from app.models.endpoint_metric import EndpointMetric
from app.models.endpoint_registration import EndpointRegistration
from app.models.enums import AlertStatus
from app.schemas.monitoring import EndpointMetricCreateRequest
from app.schemas.monitoring import EndpointRegistrationRequest


def register_or_update_endpoint(
    db: Session,
    payload: EndpointRegistrationRequest,
) -> EndpointRegistration:
    existing = get_endpoint_by_hostname(db, payload.hostname)
    if existing is None:
        return create_endpoint(
            db,
            hostname=payload.hostname,
            ip_address=payload.ip_address,
            operating_system=payload.operating_system,
            agent_version=payload.agent_version,
            status=payload.status,
            last_seen_ip=payload.last_seen_ip,
            notes=payload.notes,
        )
    return update_endpoint(
        db,
        existing,
        ip_address=payload.ip_address,
        operating_system=payload.operating_system,
        agent_version=payload.agent_version,
        status=payload.status,
        last_seen_ip=payload.last_seen_ip,
        notes=payload.notes,
    )


def ingest_endpoint_metric(
    db: Session,
    *,
    endpoint_id: int,
    payload: EndpointMetricCreateRequest,
) -> EndpointMetric:
    endpoint = get_endpoint_by_id(db, endpoint_id)
    if endpoint is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Endpoint {endpoint_id} was not found.",
        )

    endpoint.status = "online"
    endpoint.last_seen_ip = endpoint.ip_address
    db.add(endpoint)
    db.commit()
    db.refresh(endpoint)

    return create_metric(
        db,
        endpoint_id=endpoint_id,
        cpu_usage=payload.cpu_usage,
        memory_usage=payload.memory_usage,
        disk_usage=payload.disk_usage,
        uptime_seconds=payload.uptime_seconds,
        process_count=payload.process_count,
        metric_source=payload.metric_source,
        collected_at=payload.collected_at,
    )


def get_endpoint_or_404(db: Session, endpoint_id: int) -> EndpointRegistration:
    endpoint = get_endpoint_by_id(db, endpoint_id)
    if endpoint is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Endpoint {endpoint_id} was not found.",
        )
    return endpoint


def build_monitoring_overview(db: Session) -> dict:
    total_hosts = db.execute(select(func.count(EndpointRegistration.id))).scalar_one()
    online_hosts = db.execute(
        select(func.count(EndpointRegistration.id)).where(
            EndpointRegistration.status == "online"
        )
    ).scalar_one()
    offline_hosts = total_hosts - online_hosts

    avg_cpu, avg_memory, avg_disk = db.execute(
        select(
            func.avg(EndpointMetric.cpu_usage),
            func.avg(EndpointMetric.memory_usage),
            func.avg(EndpointMetric.disk_usage),
        )
    ).one()

    active_alerts = db.execute(
        select(func.count(Alert.id)).where(Alert.status == AlertStatus.OPEN)
    ).scalar_one()

    return {
        "total_hosts": total_hosts,
        "online_hosts": online_hosts,
        "offline_hosts": offline_hosts,
        "average_cpu_usage": round(float(avg_cpu or 0.0), 2),
        "average_memory_usage": round(float(avg_memory or 0.0), 2),
        "average_disk_usage": round(float(avg_disk or 0.0), 2),
        "active_alerts": active_alerts,
    }


def get_endpoint_detail(
    db: Session,
    *,
    endpoint_id: int,
    metrics_limit: int = 24,
) -> tuple[EndpointRegistration, EndpointMetric | None, list[EndpointMetric]]:
    endpoint = get_endpoint_or_404(db, endpoint_id)
    latest = get_latest_metric_for_endpoint(db, endpoint_id=endpoint_id)
    recent = list_endpoint_metrics(db, endpoint_id=endpoint_id, limit=metrics_limit)
    return endpoint, latest, recent


def list_monitoring_endpoints(
    db: Session,
    *,
    status: str | None,
    is_active: bool | None,
    skip: int,
    limit: int,
) -> tuple[list[tuple[EndpointRegistration, EndpointMetric | None]], int]:
    endpoints, total = list_endpoints(
        db,
        status=status,
        is_active=is_active,
        skip=skip,
        limit=limit,
    )
    items = [
        (endpoint, get_latest_metric_for_endpoint(db, endpoint_id=endpoint.id))
        for endpoint in endpoints
    ]
    return items, total
