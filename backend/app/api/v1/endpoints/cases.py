from fastapi import APIRouter
from fastapi import Depends
from fastapi import Query
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.crud.case import add_incident_to_case
from app.crud.case import create_case
from app.crud.case import delete_case
from app.crud.case import get_case_by_id
from app.crud.case import list_cases
from app.crud.case import remove_incident_from_case
from app.crud.case import update_case
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.case import CaseCreateRequest
from app.schemas.case import CaseListResponse
from app.schemas.case import CaseResponse
from app.schemas.case import CaseUpdateRequest

router = APIRouter(prefix="/cases")


def _enrich_case_response(case) -> CaseResponse:
    response = CaseResponse.model_validate(case)
    response.incident_count = len(case.incidents) if case.incidents else 0
    return response


@router.post(
    "/",
    response_model=CaseResponse,
    summary="Create case",
)
async def create_case_endpoint(
    payload: CaseCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.ANALYST)),
) -> CaseResponse:
    case = create_case(
        db,
        title=payload.title,
        description=payload.description,
        priority=payload.priority,
        incident_ids=payload.incident_ids,
    )
    return _enrich_case_response(case)


@router.get(
    "/",
    response_model=CaseListResponse,
    summary="List cases",
)
async def get_cases(
    status: str | None = Query(default=None),
    priority: str | None = Query(default=None),
    assigned_to_id: int | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
    ),
) -> CaseListResponse:
    items, total = list_cases(
        db,
        status=status,
        priority=priority,
        assigned_to_id=assigned_to_id,
        skip=skip,
        limit=limit,
    )
    return CaseListResponse(
        items=[_enrich_case_response(item) for item in items],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/{case_id}",
    response_model=CaseResponse,
    summary="Get case details",
)
async def get_case(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
    ),
) -> CaseResponse:
    case = get_case_by_id(db, case_id)
    if case is None:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case {case_id} not found.")
    return _enrich_case_response(case)


@router.patch(
    "/{case_id}",
    response_model=CaseResponse,
    summary="Update case",
)
async def patch_case(
    case_id: int,
    payload: CaseUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.ANALYST)),
) -> CaseResponse:
    case = get_case_by_id(db, case_id)
    if case is None:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case {case_id} not found.")
    updated = update_case(
        db,
        case,
        title=payload.title,
        description=payload.description,
        status=payload.status,
        priority=payload.priority,
        assigned_to_id=payload.assigned_to_id,
    )
    return _enrich_case_response(updated)


@router.delete(
    "/{case_id}",
    summary="Delete case",
)
async def delete_case_endpoint(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
) -> dict[str, str]:
    case = get_case_by_id(db, case_id)
    if case is None:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case {case_id} not found.")
    delete_case(db, case)
    return {"detail": f"Case {case_id} deleted."}


@router.post(
    "/{case_id}/incidents/{incident_id}",
    response_model=CaseResponse,
    summary="Add incident to case",
)
async def add_incident_to_case_endpoint(
    case_id: int,
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.ANALYST)),
) -> CaseResponse:
    case = get_case_by_id(db, case_id)
    if case is None:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case {case_id} not found.")
    add_incident_to_case(db, case, incident_id)
    return _enrich_case_response(case)


@router.delete(
    "/{case_id}/incidents/{incident_id}",
    response_model=CaseResponse,
    summary="Remove incident from case",
)
async def remove_incident_from_case_endpoint(
    case_id: int,
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.ANALYST)),
) -> CaseResponse:
    case = get_case_by_id(db, case_id)
    if case is None:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case {case_id} not found.")
    remove_incident_from_case(db, case, incident_id)
    return _enrich_case_response(case)

