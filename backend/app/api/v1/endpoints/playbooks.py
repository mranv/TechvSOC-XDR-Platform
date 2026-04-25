from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import Query
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.playbook import Playbook
from app.models.user import User
from app.schemas.playbook import PlaybookCreateRequest
from app.schemas.playbook import PlaybookExecutionListResponse
from app.schemas.playbook import PlaybookExecutionResponse
from app.schemas.playbook import PlaybookListResponse
from app.schemas.playbook import PlaybookResponse
from app.schemas.playbook import PlaybookUpdateRequest
from app.services.playbook_service import create_playbook
from app.services.playbook_service import delete_playbook
from app.services.playbook_service import get_playbook_by_id
from app.services.playbook_service import list_playbook_executions
from app.services.playbook_service import list_playbooks
from app.services.playbook_service import update_playbook

router = APIRouter(prefix="/playbooks")


@router.post(
    "/",
    response_model=PlaybookResponse,
    summary="Create playbook",
)
async def create_playbook_endpoint(
    payload: PlaybookCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.ANALYST)),
) -> PlaybookResponse:
    playbook = create_playbook(
        db,
        name=payload.name,
        description=payload.description,
        rules_json=[r.model_dump() for r in payload.rules_json],
        is_enabled=payload.is_enabled,
        created_by_id=current_user.id,
    )
    return PlaybookResponse.model_validate(playbook)


@router.get(
    "/",
    response_model=PlaybookListResponse,
    summary="List playbooks",
)
async def get_playbooks(
    enabled_only: bool = Query(default=False),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
    ),
) -> PlaybookListResponse:
    items, total = list_playbooks(db, enabled_only=enabled_only, skip=skip, limit=limit)
    return PlaybookListResponse(
        items=[PlaybookResponse.model_validate(item) for item in items],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/{playbook_id}",
    response_model=PlaybookResponse,
    summary="Get playbook details",
)
async def get_playbook(
    playbook_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
    ),
) -> PlaybookResponse:
    playbook = get_playbook_by_id(db, playbook_id)
    if playbook is None:
        raise HTTPException(status_code=404, detail="Playbook not found.")
    return PlaybookResponse.model_validate(playbook)


@router.patch(
    "/{playbook_id}",
    response_model=PlaybookResponse,
    summary="Update playbook",
)
async def patch_playbook(
    playbook_id: int,
    payload: PlaybookUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.ANALYST)),
) -> PlaybookResponse:
    playbook = get_playbook_by_id(db, playbook_id)
    if playbook is None:
        raise HTTPException(status_code=404, detail="Playbook not found.")
    updated = update_playbook(
        db,
        playbook,
        name=payload.name,
        description=payload.description,
        rules_json=[r.model_dump() for r in payload.rules_json] if payload.rules_json is not None else None,
        is_enabled=payload.is_enabled,
    )
    return PlaybookResponse.model_validate(updated)


@router.delete(
    "/{playbook_id}",
    summary="Delete playbook",
)
async def delete_playbook_endpoint(
    playbook_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
) -> dict[str, str]:
    playbook = get_playbook_by_id(db, playbook_id)
    if playbook is None:
        raise HTTPException(status_code=404, detail="Playbook not found.")
    delete_playbook(db, playbook)
    return {"detail": f"Playbook {playbook_id} deleted."}


@router.get(
    "/{playbook_id}/executions",
    response_model=PlaybookExecutionListResponse,
    summary="List playbook execution logs",
)
async def get_playbook_executions(
    playbook_id: int,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
    ),
) -> PlaybookExecutionListResponse:
    items, total = list_playbook_executions(db, playbook_id=playbook_id, skip=skip, limit=limit)
    return PlaybookExecutionListResponse(
        items=[PlaybookExecutionResponse.model_validate(item) for item in items],
        total=total,
        skip=skip,
        limit=limit,
    )

