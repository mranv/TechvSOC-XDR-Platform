from fastapi import APIRouter
from fastapi import Depends
from fastapi import Query
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.crud.scan_result import list_scan_results
from app.db.session import get_db
from app.models.enums import ScanStatus
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.scanner import ScanListResponse
from app.schemas.scanner import ScanRequest
from app.schemas.scanner import ScanResultResponse
from app.services.scanner_service import get_scan_or_404
from app.services.scanner_service import run_nmap_scan

router = APIRouter(prefix="/scanner")


@router.post(
    "/scan",
    response_model=ScanResultResponse,
    summary="Run nmap scan",
)
async def create_scan(
    payload: ScanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.ANALYST)),
) -> ScanResultResponse:
    scan = run_nmap_scan(db, payload)
    return ScanResultResponse.model_validate(scan)


@router.get(
    "/scans",
    response_model=ScanListResponse,
    summary="List scan results",
)
async def get_scans(
    endpoint_id: int | None = Query(default=None),
    status: ScanStatus | None = Query(default=None),
    target: str | None = Query(default=None, max_length=255),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
    ),
) -> ScanListResponse:
    items, total = list_scan_results(
        db,
        endpoint_id=endpoint_id,
        status=status,
        target=target,
        skip=skip,
        limit=limit,
    )
    return ScanListResponse(
        items=[ScanResultResponse.model_validate(item) for item in items],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/scans/{scan_id}",
    response_model=ScanResultResponse,
    summary="Get scan result detail",
)
async def get_scan(
    scan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
    ),
) -> ScanResultResponse:
    return ScanResultResponse.model_validate(get_scan_or_404(db, scan_id))
