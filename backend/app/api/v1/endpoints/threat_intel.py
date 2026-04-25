from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.threat_intel import ThreatIntelLookupRequest
from app.schemas.threat_intel import ThreatIntelResponse
from app.services.threat_intel_service import get_threat_intel_for_ip

router = APIRouter(prefix="/threat-intel")


@router.post(
    "/lookup",
    response_model=ThreatIntelResponse,
    summary="Lookup threat intel for IP",
)
async def lookup_threat_intel(
    payload: ThreatIntelLookupRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
    ),
) -> ThreatIntelResponse:
    record = get_threat_intel_for_ip(db, payload.ip_address)
    return ThreatIntelResponse.model_validate(record)


@router.get(
    "/lookup/{ip_address}",
    response_model=ThreatIntelResponse,
    summary="Lookup threat intel for IP (GET)",
)
async def lookup_threat_intel_get(
    ip_address: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
    ),
) -> ThreatIntelResponse:
    record = get_threat_intel_for_ip(db, ip_address)
    return ThreatIntelResponse.model_validate(record)

