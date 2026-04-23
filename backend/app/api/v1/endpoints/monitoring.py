from fastapi import APIRouter
from fastapi import Depends
from fastapi import Query
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.monitoring import EndpointDetailResponse
from app.schemas.monitoring import EndpointListResponse
from app.schemas.monitoring import EndpointMetricCreateRequest
from app.schemas.monitoring import EndpointMetricResponse
from app.schemas.monitoring import EndpointMonitoringSummary
from app.schemas.monitoring import EndpointRegistrationRequest
from app.schemas.monitoring import EndpointResponse
from app.schemas.monitoring import MonitoringOverviewResponse
from app.services.monitoring_service import build_monitoring_overview
from app.services.monitoring_service import get_endpoint_detail
from app.services.monitoring_service import ingest_endpoint_metric
from app.services.monitoring_service import list_monitoring_endpoints
from app.services.monitoring_service import register_or_update_endpoint

router = APIRouter(prefix="/monitoring")


@router.post(
    "/endpoints/register",
    response_model=EndpointResponse,
    summary="Register or update endpoint",
)
async def register_endpoint(
    payload: EndpointRegistrationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.ANALYST)),
) -> EndpointResponse:
    endpoint = register_or_update_endpoint(db, payload)
    return EndpointResponse.model_validate(endpoint)


@router.post(
    "/endpoints/{endpoint_id}/metrics",
    response_model=EndpointMetricResponse,
    summary="Ingest endpoint metrics",
)
async def create_endpoint_metric(
    endpoint_id: int,
    payload: EndpointMetricCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.ANALYST)),
) -> EndpointMetricResponse:
    metric = ingest_endpoint_metric(db, endpoint_id=endpoint_id, payload=payload)
    return EndpointMetricResponse.model_validate(metric)


@router.get(
    "/overview",
    response_model=MonitoringOverviewResponse,
    summary="Monitoring overview",
)
async def monitoring_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
    ),
) -> MonitoringOverviewResponse:
    return MonitoringOverviewResponse(**build_monitoring_overview(db))


@router.get(
    "/endpoints",
    response_model=EndpointListResponse,
    summary="List monitored endpoints",
)
async def get_endpoints(
    status: str | None = Query(default=None, max_length=32),
    is_active: bool | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
    ),
) -> EndpointListResponse:
    items, total = list_monitoring_endpoints(
        db,
        status=status,
        is_active=is_active,
        skip=skip,
        limit=limit,
    )
    return EndpointListResponse(
        items=[
            EndpointMonitoringSummary(
                endpoint=EndpointResponse.model_validate(endpoint),
                latest_metric=(
                    EndpointMetricResponse.model_validate(metric) if metric else None
                ),
            )
            for endpoint, metric in items
        ],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/endpoints/{endpoint_id}",
    response_model=EndpointDetailResponse,
    summary="Endpoint monitoring detail",
)
async def get_endpoint_monitoring_detail(
    endpoint_id: int,
    metrics_limit: int = Query(default=24, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
    ),
) -> EndpointDetailResponse:
    endpoint, latest_metric, recent_metrics = get_endpoint_detail(
        db,
        endpoint_id=endpoint_id,
        metrics_limit=metrics_limit,
    )
    return EndpointDetailResponse(
        endpoint=EndpointResponse.model_validate(endpoint),
        latest_metric=(
            EndpointMetricResponse.model_validate(latest_metric)
            if latest_metric
            else None
        ),
        recent_metrics=[
            EndpointMetricResponse.model_validate(metric) for metric in recent_metrics
        ],
    )
