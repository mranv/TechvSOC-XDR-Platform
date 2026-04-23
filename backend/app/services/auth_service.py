from fastapi import HTTPException
from fastapi import status
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.core.security import get_password_hash
from app.core.security import verify_password
from app.crud.user import count_users
from app.crud.user import create_user
from app.crud.user import get_user_by_email
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.auth import AccessTokenResponse
from app.schemas.auth import UserCreateRequest
from app.schemas.auth import UserLoginRequest
from app.schemas.auth import UserRegisterRequest


def register_user(db: Session, payload: UserRegisterRequest) -> User:
    existing_user = get_user_by_email(db, payload.email)
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists.",
        )

    assigned_role = UserRole.ADMIN if count_users(db) == 0 else UserRole.VIEWER

    return create_user(
        db,
        full_name=payload.full_name,
        email=payload.email,
        password_hash=get_password_hash(payload.password),
        role=assigned_role,
    )


def create_user_with_role(db: Session, payload: UserCreateRequest) -> User:
    existing_user = get_user_by_email(db, payload.email)
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists.",
        )

    return create_user(
        db,
        full_name=payload.full_name,
        email=payload.email,
        password_hash=get_password_hash(payload.password),
        role=payload.role,
    )


def authenticate_user(db: Session, payload: UserLoginRequest) -> AccessTokenResponse:
    user = get_user_by_email(db, payload.email)
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive.",
        )

    token = create_access_token(subject=str(user.id))
    return AccessTokenResponse(access_token=token)
