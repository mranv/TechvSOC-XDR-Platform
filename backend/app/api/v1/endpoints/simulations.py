from fastapi import APIRouter
from fastapi import Depends
from fastapi import Query
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.services.simulation_service import SCENARIO_DEFINITIONS
from app.services.simulation_service import run_simulation

router = APIRouter(prefix="/simulations")


@router.get(
    "/scenarios",
    summary="List available attack simulation scenarios",
)
async def list_scenarios(
    current_user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
    ),
) -> dict[str, dict]:
    return SCENARIO_DEFINITIONS


@router.post(
    "/run",
    summary="Run an attack simulation",
)
async def run_simulation_endpoint(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.ANALYST)),
) -> dict:
    scenario = payload.get("scenario")
    parameters = payload.get("parameters", {})
    trigger_detection = payload.get("trigger_detection", True)
    auto_correlate = payload.get("auto_correlate", True)

    result = run_simulation(
        db,
        scenario=scenario,
        parameters=parameters,
        trigger_detection=trigger_detection,
        auto_correlate=auto_correlate,
    )
    return result


@router.post(
    "/simulator/run",
    summary="Run an attack simulation (alias for /run)",
)
async def run_simulator_endpoint(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.ANALYST)),
) -> dict:
    scenario = payload.get("scenario")
    parameters = payload.get("parameters", {})
    trigger_detection = payload.get("trigger_detection", True)
    auto_correlate = payload.get("auto_correlate", True)

    result = run_simulation(
        db,
        scenario=scenario,
        parameters=parameters,
        trigger_detection=trigger_detection,
        auto_correlate=auto_correlate,
    )
    return result

