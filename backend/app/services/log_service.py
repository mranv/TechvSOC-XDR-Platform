from fastapi import HTTPException
from fastapi import UploadFile
from fastapi import status
from sqlalchemy.orm import Session

from app.crud.endpoint import get_endpoint_by_id
from app.crud.log_entry import create_log_entries
from app.crud.log_entry import get_log_by_id
from app.crud.log_entry import search_logs
from app.models.log_entry import LogEntry
from app.models.user import User
from app.schemas.logs import BatchLogCreateRequest
from app.schemas.logs import LogCreateRequest
from app.services.log_parser import parse_uploaded_logs


def _validate_endpoint(db: Session, endpoint_id: int | None) -> None:
    if endpoint_id is None:
        return
    endpoint = get_endpoint_by_id(db, endpoint_id)
    if endpoint is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Endpoint {endpoint_id} was not found.",
        )


def _to_model(payload: LogCreateRequest) -> LogEntry:
    return LogEntry(
        source=payload.source,
        event_type=payload.event_type,
        message=payload.message,
        raw_log=payload.raw_log,
        severity=payload.severity,
        event_timestamp=payload.event_timestamp,
        endpoint_id=payload.endpoint_id,
        metadata_json=payload.metadata_json,
    )


def create_logs_from_payload(
    db: Session,
    payload: BatchLogCreateRequest,
) -> list[LogEntry]:
    for item in payload.logs:
        _validate_endpoint(db, item.endpoint_id)
    models = [_to_model(item) for item in payload.logs]
    return create_log_entries(db, models)


async def import_logs_from_upload(
    db: Session,
    *,
    file: UploadFile,
    source_override: str | None,
    endpoint_id: int | None,
) -> list[LogEntry]:
    _validate_endpoint(db, endpoint_id)

    content = await file.read()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded log file is empty.",
        )

    try:
        parsed_logs = parse_uploaded_logs(
            filename=file.filename or "uploaded.log",
            content=content,
            source_override=source_override,
            endpoint_id=endpoint_id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    if not parsed_logs:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid log entries were found in the uploaded file.",
        )

    models = [_to_model(item) for item in parsed_logs]
    return create_log_entries(db, models)


def get_log_or_404(db: Session, log_id: int) -> LogEntry:
    log = get_log_by_id(db, log_id)
    if log is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Log entry {log_id} was not found.",
        )
    return log


def search_logs_for_user(
    db: Session,
    *,
    q: str | None,
    source: str | None,
    event_type: str | None,
    severity,
    endpoint_id: int | None,
    start_time,
    end_time,
    skip: int,
    limit: int,
    current_user: User,
) -> tuple[list[LogEntry], int]:
    return search_logs(
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
    )
