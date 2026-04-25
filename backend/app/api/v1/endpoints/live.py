from datetime import datetime

from fastapi import APIRouter
from fastapi import Depends
from fastapi import Query
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.services.live_service import get_recent_activity

router = APIRouter(prefix="/live")


@router.get(
    "/activity",
    summary="Get recent platform activity",
)
async def get_activity(
    since: datetime | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
    ),
) -> list[dict]:
    return get_recent_activity(db, since=since, limit=limit)

