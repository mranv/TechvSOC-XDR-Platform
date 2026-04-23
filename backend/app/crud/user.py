from sqlalchemy import func
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.enums import UserRole
from app.models.user import User


def get_user_by_email(db: Session, email: str) -> User | None:
    statement = select(User).where(User.email == email.lower())
    return db.execute(statement).scalar_one_or_none()


def get_user_by_id(db: Session, user_id: int) -> User | None:
    statement = select(User).where(User.id == user_id)
    return db.execute(statement).scalar_one_or_none()


def list_users(db: Session) -> list[User]:
    statement = select(User).order_by(User.created_at.desc())
    return list(db.execute(statement).scalars().all())


def count_users(db: Session) -> int:
    statement = select(func.count(User.id))
    return db.execute(statement).scalar_one()


def create_user(
    db: Session,
    *,
    full_name: str,
    email: str,
    password_hash: str,
    role: UserRole,
) -> User:
    user = User(
        full_name=full_name,
        email=email.lower(),
        password_hash=password_hash,
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
