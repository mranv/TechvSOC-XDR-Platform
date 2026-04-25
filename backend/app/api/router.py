from fastapi import APIRouter

from app.api.v1.endpoints import auth
from app.api.v1.endpoints import cases
from app.api.v1.endpoints import detections
from app.api.v1.endpoints import health
from app.api.v1.endpoints import hunt
from app.api.v1.endpoints import incidents
from app.api.v1.endpoints import live
from app.api.v1.endpoints import logs
from app.api.v1.endpoints import monitoring
from app.api.v1.endpoints import entities
from app.api.v1.endpoints import playbooks
from app.api.v1.endpoints import scanner
from app.api.v1.endpoints import simulations
from app.api.v1.endpoints import soar
from app.api.v1.endpoints import testing
from app.api.v1.endpoints import threat_intel
from app.api.v1.endpoints import users

api_router = APIRouter()
api_router.include_router(auth.router, tags=["auth"])
api_router.include_router(cases.router, tags=["cases"])
api_router.include_router(detections.router, tags=["detections"])
api_router.include_router(health.router, tags=["health"])
api_router.include_router(hunt.router, tags=["hunt"])
api_router.include_router(incidents.router, tags=["incidents"])
api_router.include_router(live.router, tags=["live"])
api_router.include_router(logs.router, tags=["logs"])
api_router.include_router(monitoring.router, tags=["monitoring"])
api_router.include_router(entities.router, tags=["entities"])
api_router.include_router(playbooks.router, tags=["playbooks"])
api_router.include_router(scanner.router, tags=["scanner"])
api_router.include_router(simulations.router, tags=["simulations"])
api_router.include_router(soar.router, tags=["soar"])
api_router.include_router(testing.router, tags=["testing"])
api_router.include_router(threat_intel.router, tags=["threat-intel"])
api_router.include_router(users.router, tags=["users"])
