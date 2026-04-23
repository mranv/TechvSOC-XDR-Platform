from fastapi import APIRouter
from fastapi import Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.schemas.database import DatabaseStatusResponse
from app.schemas.health import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse, summary="Application health")
async def health_check() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service=settings.app_name,
        environment=settings.app_env,
        version="0.1.0",
    )


@router.get("/health/db", response_model=DatabaseStatusResponse, summary="Database health")
async def database_health_check(
    db: Session = Depends(get_db),
) -> DatabaseStatusResponse:
    db.execute(text("SELECT 1"))
    return DatabaseStatusResponse(status="ok", database="postgresql")
