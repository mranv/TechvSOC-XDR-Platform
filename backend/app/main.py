from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.db.session import create_database_tables
from app.db.session import SessionLocal
from app.services.detection_service import seed_default_rules


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_database_tables()
    db = SessionLocal()
    try:
        seed_default_rules(db)
    finally:
        db.close()
    yield


def create_application() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        debug=settings.debug,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url=f"{settings.api_v1_prefix}/openapi.json",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router, prefix=settings.api_v1_prefix)

    @app.get("/", tags=["root"])
    async def root() -> dict[str, str]:
        return {
            "app": settings.app_name,
            "status": "running",
            "docs": "/docs",
        }

    return app


app = create_application()
