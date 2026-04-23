from fastapi import APIRouter
from fastapi import Depends
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.crud.user import list_users
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.auth import UserCreateRequest
from app.schemas.auth import UserResponse
from app.services.auth_service import create_user_with_role

router = APIRouter(prefix="/users")


@router.get(
    "/",
    response_model=list[UserResponse],
    summary="List platform users",
)
async def get_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.ANALYST)),
) -> list[UserResponse]:
    return [UserResponse.model_validate(user) for user in list_users(db)]


@router.post(
    "/",
    response_model=UserResponse,
    summary="Create platform user",
)
async def create_platform_user(
    payload: UserCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
) -> UserResponse:
    user = create_user_with_role(db, payload)
    return UserResponse.model_validate(user)
