from fastapi import APIRouter

from app.api.v1.endpoints import auth
from app.api.v1.endpoints import detections
from app.api.v1.endpoints import health
from app.api.v1.endpoints import logs
from app.api.v1.endpoints import monitoring
from app.api.v1.endpoints import scanner
from app.api.v1.endpoints import users

api_router = APIRouter()
api_router.include_router(auth.router, tags=["auth"])
api_router.include_router(detections.router, tags=["detections"])
api_router.include_router(health.router, tags=["health"])
api_router.include_router(logs.router, tags=["logs"])
api_router.include_router(monitoring.router, tags=["monitoring"])
api_router.include_router(scanner.router, tags=["scanner"])
api_router.include_router(users.router, tags=["users"])
