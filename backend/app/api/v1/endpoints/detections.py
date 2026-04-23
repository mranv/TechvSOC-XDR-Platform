from fastapi import APIRouter
from fastapi import Depends
from fastapi import Query
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.crud.alert import list_alerts
from app.crud.detection_rule import list_rules
from app.db.session import get_db
from app.models.enums import AlertSeverity
from app.models.enums import AlertStatus
from app.models.enums import RuleType
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.alerts import AlertListResponse
from app.schemas.alerts import AlertResponse
from app.schemas.detection import DetectionRuleCreateRequest
from app.schemas.detection import DetectionRuleResponse
from app.schemas.detection import DetectionRunResponse
from app.services.detection_service import create_detection_rule
from app.services.detection_service import run_detection_cycle
from app.services.detection_service import seed_default_rules

router = APIRouter(prefix="/detections")


@router.get(
    "/rules",
    response_model=list[DetectionRuleResponse],
    summary="List detection rules",
)
async def get_detection_rules(
    enabled_only: bool = Query(default=False),
    rule_type: RuleType | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
    ),
) -> list[DetectionRuleResponse]:
    seed_default_rules(db)
    return [
        DetectionRuleResponse.model_validate(rule)
        for rule in list_rules(db, enabled_only=enabled_only, rule_type=rule_type)
    ]


@router.post(
    "/rules",
    response_model=DetectionRuleResponse,
    summary="Create detection rule",
)
async def create_rule_endpoint(
    payload: DetectionRuleCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
) -> DetectionRuleResponse:
    rule = create_detection_rule(db, payload)
    return DetectionRuleResponse.model_validate(rule)


@router.post(
    "/run",
    response_model=DetectionRunResponse,
    summary="Run detection engine",
)
async def run_detections(
    hours: int = Query(default=24, ge=1, le=168),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.ANALYST)),
) -> DetectionRunResponse:
    alerts, rules_evaluated, logs_scanned, window_start, window_end = run_detection_cycle(
        db,
        hours=hours,
    )
    return DetectionRunResponse(
        rules_evaluated=rules_evaluated,
        logs_scanned=logs_scanned,
        alerts_created=len(alerts),
        alerts=[alert.id for alert in alerts],
        window_start=window_start,
        window_end=window_end,
    )


@router.get(
    "/alerts",
    response_model=AlertListResponse,
    summary="List detection alerts",
)
async def get_detection_alerts(
    severity: AlertSeverity | None = Query(default=None),
    status: AlertStatus | None = Query(default=None),
    endpoint_id: int | None = Query(default=None),
    rule_id: int | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
    ),
) -> AlertListResponse:
    alerts, total = list_alerts(
        db,
        severity=severity,
        status=status,
        endpoint_id=endpoint_id,
        rule_id=rule_id,
        skip=skip,
        limit=limit,
    )
    return AlertListResponse(
        items=[AlertResponse.model_validate(alert) for alert in alerts],
        total=total,
        skip=skip,
        limit=limit,
    )
