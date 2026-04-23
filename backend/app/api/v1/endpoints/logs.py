from datetime import datetime

from fastapi import APIRouter
from fastapi import Depends
from fastapi import File
from fastapi import Query
from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.enums import LogLevel
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.logs import BatchLogCreateRequest
from app.schemas.logs import LogListResponse
from app.schemas.logs import LogResponse
from app.schemas.logs import LogUploadResponse
from app.services.log_service import create_logs_from_payload
from app.services.log_service import get_log_or_404
from app.services.log_service import import_logs_from_upload
from app.services.log_service import search_logs_for_user

router = APIRouter(prefix="/logs")


@router.post(
    "/ingest",
    response_model=list[LogResponse],
    summary="Ingest structured logs",
)
async def ingest_logs(
    payload: BatchLogCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.ANALYST)),
) -> list[LogResponse]:
    logs = create_logs_from_payload(db, payload)
    return [LogResponse.model_validate(item) for item in logs]


@router.post(
    "/upload",
    response_model=LogUploadResponse,
    summary="Upload and parse log files",
)
async def upload_logs(
    source: str | None = Query(default=None, max_length=255),
    endpoint_id: int | None = Query(default=None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.ANALYST)),
) -> LogUploadResponse:
    logs = await import_logs_from_upload(
        db,
        file=file,
        source_override=source,
        endpoint_id=endpoint_id,
    )
    return LogUploadResponse(
        filename=file.filename or "uploaded.log",
        imported_count=len(logs),
        logs=[LogResponse.model_validate(item) for item in logs],
    )


@router.get(
    "/",
    response_model=LogListResponse,
    summary="Search and filter logs",
)
async def list_logs(
    q: str | None = Query(default=None, max_length=255),
    source: str | None = Query(default=None, max_length=255),
    event_type: str | None = Query(default=None, max_length=255),
    severity: LogLevel | None = Query(default=None),
    endpoint_id: int | None = Query(default=None),
    start_time: datetime | None = Query(default=None),
    end_time: datetime | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
    ),
) -> LogListResponse:
    logs, total = search_logs_for_user(
        db,
        q=q,
        source=source,
        event_type=event_type,
        severity=severity,
        endpoint_id=endpoint_id,
        start_time=start_time,
        end_time=end_time,
        skip=skip,
        limit=limit,
        current_user=current_user,
    )
    return LogListResponse(
        items=[LogResponse.model_validate(item) for item in logs],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/{log_id}",
    response_model=LogResponse,
    summary="Get log entry details",
)
async def get_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
    ),
) -> LogResponse:
    log = get_log_or_404(db, log_id)
    return LogResponse.model_validate(log)
