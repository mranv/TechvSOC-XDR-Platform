from fastapi import APIRouter
from fastapi import Depends
from fastapi import Query
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.hunt import HuntQueryRequest
from app.schemas.hunt import HuntQueryResponse
from app.schemas.hunt import SavedHuntQueryCreate
from app.schemas.hunt import SavedHuntQueryResponse
from app.services.hunt_service import execute_hunt_query
from app.services.hunt_service import parse_hunt_query

router = APIRouter(prefix="/hunt")


@router.post(
    "/query",
    response_model=HuntQueryResponse,
    summary="Execute hunt query with DSL",
)
async def hunt_query(
    payload: HuntQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
    ),
) -> HuntQueryResponse:
    parsed = parse_hunt_query(payload.query)
    items, total = execute_hunt_query(
        db,
        parsed,
        skip=payload.skip,
        limit=payload.limit,
    )

    # Convert LogEntry items to dicts for response
    item_dicts = []
    for log in items:
        item_dicts.append({
            "id": log.id,
            "source": log.source,
            "event_type": log.event_type,
            "message": log.message,
            "raw_log": log.raw_log,
            "severity": str(log.severity) if log.severity else None,
            "event_timestamp": log.event_timestamp.isoformat() if log.event_timestamp else None,
            "endpoint_id": log.endpoint_id,
            "metadata_json": log.metadata_json,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        })

    return HuntQueryResponse(
        query=payload.query,
        parsed=parsed,
        items=item_dicts,
        total=total,
        skip=payload.skip,
        limit=payload.limit,
    )


# In-memory saved queries (per user) - in production this would be in DB
_saved_queries: dict[int, list[dict]] = {}


@router.post(
    "/save",
    response_model=SavedHuntQueryResponse,
    summary="Save a hunt query",
)
async def save_hunt_query(
    payload: SavedHuntQueryCreate,
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.ANALYST)),
) -> SavedHuntQueryResponse:
    from datetime import UTC, datetime
    user_id = current_user.id
    if user_id not in _saved_queries:
        _saved_queries[user_id] = []

    query_id = len(_saved_queries[user_id]) + 1
    saved = {
        "id": query_id,
        "name": payload.name,
        "query": payload.query,
        "created_at": datetime.now(UTC).isoformat(),
    }
    _saved_queries[user_id].append(saved)
    return SavedHuntQueryResponse.model_validate(saved)


@router.get(
    "/saved",
    response_model=list[SavedHuntQueryResponse],
    summary="List saved hunt queries",
)
async def list_saved_queries(
    current_user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
    ),
) -> list[SavedHuntQueryResponse]:
    user_id = current_user.id
    queries = _saved_queries.get(user_id, [])
    return [SavedHuntQueryResponse.model_validate(q) for q in queries]

