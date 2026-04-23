from fastapi import APIRouter
from fastapi import Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import AccessTokenResponse
from app.schemas.auth import AuthenticatedUserResponse
from app.schemas.auth import UserLoginRequest
from app.schemas.auth import UserRegisterRequest
from app.schemas.auth import UserResponse
from app.services.auth_service import authenticate_user
from app.services.auth_service import register_user

router = APIRouter(prefix="/auth")


@router.post("/register", response_model=UserResponse, summary="Register user")
async def register(
    payload: UserRegisterRequest,
    db: Session = Depends(get_db),
) -> UserResponse:
    user = register_user(db, payload)
    return UserResponse.model_validate(user)


@router.post("/login", response_model=AccessTokenResponse, summary="Login user")
async def login(
    payload: UserLoginRequest,
    db: Session = Depends(get_db),
) -> AccessTokenResponse:
    return authenticate_user(db, payload)


@router.get("/me", response_model=AuthenticatedUserResponse, summary="Current user")
async def me(current_user: User = Depends(get_current_user)) -> AuthenticatedUserResponse:
    return AuthenticatedUserResponse(user=UserResponse.model_validate(current_user))
