from fastapi import APIRouter
from fastapi import Depends
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.services.testing_service import generate_demo_data

router = APIRouter(prefix="/testing")


@router.post(
    "/generate-demo-data",
    summary="Generate demo data",
)
async def generate_demo_data_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.ANALYST)),
) -> dict:
    result = generate_demo_data(db)
    return result

