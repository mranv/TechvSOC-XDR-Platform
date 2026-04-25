from fastapi import APIRouter
from fastapi import Depends
from fastapi import Query
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.services.entity_service import get_entity_profile
from app.services.entity_service import search_entities

router = APIRouter(prefix="/entities")


@router.get(
    "/search",
    summary="Search for entities (IP, User, Host)",
)
async def entity_search(
    q: str = Query(min_length=1, max_length=100),
    type: str | None = Query(default=None, pattern=r"^(ip|user|host)$"),
    hours: int = Query(default=168, ge=1, le=720),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
    ),
) -> list[dict]:
    return search_entities(
        db,
        q=q,
        entity_type=type,
        hours=hours,
        limit=limit,
    )


@router.get(
    "/profile/{entity_type}/{entity_value}",
    summary="Get full profile for an entity",
)
async def entity_profile(
    entity_type: str,
    entity_value: str,
    hours: int = Query(default=168, ge=1, le=720),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
    ),
) -> dict:
    return get_entity_profile(
        db,
        entity_type=entity_type,
        entity_value=entity_value,
        hours=hours,
    )

