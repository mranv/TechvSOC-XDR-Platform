from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import Query
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.enums import SoarActionType
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.soar import BlockIpRequest
from app.schemas.soar import DisableUserRequest
from app.schemas.soar import SoarActionListResponse
from app.schemas.soar import SoarActionRequest
from app.schemas.soar import SoarActionResponse
from app.services.soar_service import create_soar_action
from app.services.soar_service import get_soar_action_by_id
from app.services.soar_service import list_soar_actions

router = APIRouter(prefix="/response")


@router.post(
    "/block-ip",
    response_model=SoarActionResponse,
    summary="Block IP address (simulated)",
)
async def block_ip(
    payload: BlockIpRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.ANALYST)),
) -> SoarActionResponse:
    action = create_soar_action(
        db,
        action_type=SoarActionType.BLOCK_IP,
        target_value=payload.ip_address,
        reason=payload.reason,
        parameters_json={"duration_minutes": payload.duration_minutes},
        executed_by_id=current_user.id,
    )
    return SoarActionResponse.model_validate(action)


@router.post(
    "/disable-user",
    response_model=SoarActionResponse,
    summary="Disable user account (simulated)",
)
async def disable_user(
    payload: DisableUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.ANALYST)),
) -> SoarActionResponse:
    action = create_soar_action(
        db,
        action_type=SoarActionType.DISABLE_USER,
        target_value=payload.username,
        reason=payload.reason,
        executed_by_id=current_user.id,
    )
    return SoarActionResponse.model_validate(action)


@router.post(
    "/actions",
    response_model=SoarActionResponse,
    summary="Execute generic SOAR action",
)
async def execute_action(
    payload: SoarActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.ANALYST)),
) -> SoarActionResponse:
    action = create_soar_action(
        db,
        action_type=payload.action_type,
        target_value=payload.target_value,
        reason=payload.reason,
        parameters_json=payload.parameters_json,
        executed_by_id=current_user.id,
    )
    return SoarActionResponse.model_validate(action)


@router.get(
    "/actions",
    response_model=SoarActionListResponse,
    summary="List SOAR actions",
)
async def list_actions(
    action_type: SoarActionType | None = Query(default=None),
    status: str | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
    ),
) -> SoarActionListResponse:
    items, total = list_soar_actions(
        db,
        action_type=action_type,
        status=status,
        skip=skip,
        limit=limit,
    )
    return SoarActionListResponse(
        items=[SoarActionResponse.model_validate(item) for item in items],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/actions/{action_id}",
    response_model=SoarActionResponse,
    summary="Get SOAR action detail",
)
async def get_action(
    action_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
    ),
) -> SoarActionResponse:
    action = get_soar_action_by_id(db, action_id)
    if action is None:
        raise HTTPException(status_code=404, detail=f"Action {action_id} not found.")
    return SoarActionResponse.model_validate(action)

