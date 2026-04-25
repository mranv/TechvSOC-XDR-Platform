from __future__ import annotations

import logging
from datetime import UTC
from datetime import datetime

from sqlalchemy import func
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.enums import SoarActionType
from app.models.soar_action import SoarAction

logger = logging.getLogger("techvsoc.soar")


def create_soar_action(
    db: Session,
    *,
    action_type: SoarActionType,
    target_value: str,
    reason: str,
    parameters_json: dict | None = None,
    executed_by_id: int | None = None,
) -> SoarAction:
    action = SoarAction(
        action_type=action_type,
        target_value=target_value,
        reason=reason,
        parameters_json=parameters_json,
        status="simulated_success",
        executed_by_id=executed_by_id,
    )
    db.add(action)
    db.commit()
    db.refresh(action)

    # Simulate execution result
    result = _simulate_action(action_type, target_value, parameters_json)
    action.result_json = result
    action.status = "completed"
    db.add(action)
    db.commit()
    db.refresh(action)

    logger.info(
        "SOAR action %s executed: %s -> %s",
        action_type.value,
        target_value,
        result.get("message", "done"),
    )
    return action


def _simulate_action(
    action_type: SoarActionType,
    target_value: str,
    parameters_json: dict | None,
) -> dict:
    if action_type == SoarActionType.BLOCK_IP:
        return {
            "action": "block_ip",
            "target": target_value,
            "simulated": True,
            "message": f"IP {target_value} added to simulated firewall blocklist.",
            "duration_minutes": parameters_json.get("duration_minutes", 60) if parameters_json else 60,
            "timestamp": datetime.now(UTC).isoformat(),
        }
    if action_type == SoarActionType.DISABLE_USER:
        return {
            "action": "disable_user",
            "target": target_value,
            "simulated": True,
            "message": f"User account {target_value} disabled in simulated identity provider.",
            "timestamp": datetime.now(UTC).isoformat(),
        }
    if action_type == SoarActionType.ISOLATE_ENDPOINT:
        return {
            "action": "isolate_endpoint",
            "target": target_value,
            "simulated": True,
            "message": f"Endpoint {target_value} isolated in simulated EDR console.",
            "timestamp": datetime.now(UTC).isoformat(),
        }
    return {
        "action": action_type.value,
        "target": target_value,
        "simulated": True,
        "message": "Action simulated with no specific handler.",
        "timestamp": datetime.now(UTC).isoformat(),
    }


def list_soar_actions(
    db: Session,
    *,
    action_type: SoarActionType | None = None,
    status: str | None = None,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[SoarAction], int]:
    filters = []
    if action_type:
        filters.append(SoarAction.action_type == action_type)
    if status:
        filters.append(SoarAction.status == status)

    query = select(SoarAction).order_by(SoarAction.created_at.desc())
    count_query = select(func.count(SoarAction.id))

    if filters:
        query = query.where(*filters)
        count_query = count_query.where(*filters)

    query = query.offset(skip).limit(limit)
    items = list(db.execute(query).scalars().all())
    total = db.execute(count_query).scalar_one()
    return items, total


def get_soar_action_by_id(db: Session, action_id: int) -> SoarAction | None:
    return db.execute(
        select(SoarAction).where(SoarAction.id == action_id)
    ).scalar_one_or_none()

