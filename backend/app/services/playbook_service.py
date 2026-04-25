from __future__ import annotations

import logging
from datetime import UTC
from datetime import datetime

from sqlalchemy import func
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.enums import IncidentSeverity
from app.models.playbook import Playbook
from app.models.playbook import PlaybookExecution
from app.services.soar_service import create_soar_action

logger = logging.getLogger("techvsoc.playbook")


def create_playbook(
    db: Session,
    *,
    name: str,
    description: str,
    rules_json: list[dict],
    is_enabled: bool,
    created_by_id: int | None,
) -> Playbook:
    playbook = Playbook(
        name=name,
        description=description,
        rules_json=rules_json,
        is_enabled=is_enabled,
        created_by_id=created_by_id,
    )
    db.add(playbook)
    db.commit()
    db.refresh(playbook)
    return playbook


def get_playbook_by_id(db: Session, playbook_id: int) -> Playbook | None:
    return db.execute(
        select(Playbook).where(Playbook.id == playbook_id)
    ).scalar_one_or_none()


def list_playbooks(
    db: Session,
    *,
    enabled_only: bool = False,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[Playbook], int]:
    query = select(Playbook)
    count_query = select(func.count(Playbook.id))
    if enabled_only:
        query = query.where(Playbook.is_enabled == True)
        count_query = count_query.where(Playbook.is_enabled == True)
    query = query.order_by(Playbook.created_at.desc()).offset(skip).limit(limit)
    items = list(db.execute(query).scalars().all())
    total = db.execute(count_query).scalar_one()
    return items, total


def update_playbook(
    db: Session,
    playbook: Playbook,
    *,
    name: str | None = None,
    description: str | None = None,
    rules_json: list[dict] | None = None,
    is_enabled: bool | None = None,
) -> Playbook:
    if name is not None:
        playbook.name = name
    if description is not None:
        playbook.description = description
    if rules_json is not None:
        playbook.rules_json = rules_json
    if is_enabled is not None:
        playbook.is_enabled = is_enabled
    db.add(playbook)
    db.commit()
    db.refresh(playbook)
    return playbook


def delete_playbook(db: Session, playbook: Playbook) -> None:
    db.delete(playbook)
    db.commit()


def evaluate_playbooks_for_incident(db: Session, incident: object) -> list[PlaybookExecution]:
    """Evaluate all enabled playbooks against an incident and auto-execute actions."""
    playbooks, _ = list_playbooks(db, enabled_only=True, skip=0, limit=100)
    executions: list[PlaybookExecution] = []

    severity_map = {
        "low": 1,
        "medium": 2,
        "high": 3,
        "critical": 4,
    }
    incident_sev_score = severity_map.get(str(incident.severity).lower(), 0)

    for playbook in playbooks:
        for rule in playbook.rules_json:
            condition = rule.get("condition", {})
            action = rule.get("action", {})

            matched = _match_condition(condition, incident, incident_sev_score)
            if not matched:
                continue

            execution = _execute_playbook_action(
                db,
                playbook_id=playbook.id,
                incident_id=incident.id,
                rule_name=rule.get("name", "unknown"),
                action=action,
            )
            executions.append(execution)
            logger.info(
                "Playbook '%s' rule '%s' matched incident %s and executed %s",
                playbook.name,
                rule.get("name"),
                incident.id,
                action.get("type"),
            )

    return executions


def _match_condition(condition: dict, incident: object, incident_sev_score: int) -> bool:
    """Simple rule condition matcher."""
    if not condition:
        return False

    required_severity = condition.get("severity")
    if required_severity:
        req_score = {"low": 1, "medium": 2, "high": 3, "critical": 4}.get(required_severity.lower(), 0)
        if incident_sev_score < req_score:
            return False

    required_type = condition.get("incident_type")
    if required_type:
        attack_chain = incident.attack_chain_json or {}
        if attack_chain.get("incident_type") != required_type:
            return False

    required_status = condition.get("status")
    if required_status:
        if str(incident.status).lower() != required_status.lower():
            return False

    return True


def _execute_playbook_action(
    db: Session,
    *,
    playbook_id: int,
    incident_id: int,
    rule_name: str,
    action: dict,
) -> PlaybookExecution:
    action_type = action.get("type", "unknown")
    target = action.get("target", "")
    reason = action.get("reason", f"Automated by playbook rule: {rule_name}")

    result = {"action": action_type, "target": target, "simulated": True}
    status = "success"

    try:
        if action_type == "block_ip" and target:
            from app.models.enums import SoarActionType
            soar_action = create_soar_action(
                db,
                action_type=SoarActionType.BLOCK_IP,
                target_value=target,
                reason=reason,
            )
            result["soar_action_id"] = soar_action.id
        elif action_type == "disable_user" and target:
            from app.models.enums import SoarActionType
            soar_action = create_soar_action(
                db,
                action_type=SoarActionType.DISABLE_USER,
                target_value=target,
                reason=reason,
            )
            result["soar_action_id"] = soar_action.id
        elif action_type == "isolate_endpoint" and target:
            from app.models.enums import SoarActionType
            soar_action = create_soar_action(
                db,
                action_type=SoarActionType.ISOLATE_ENDPOINT,
                target_value=target,
                reason=reason,
            )
            result["soar_action_id"] = soar_action.id
        else:
            result["message"] = "No specific action handler; rule logged only."
    except Exception as exc:
        status = "failed"
        result["error"] = str(exc)

    execution = PlaybookExecution(
        playbook_id=playbook_id,
        incident_id=incident_id,
        trigger_event="incident_created",
        action_type=action_type,
        target_value=target,
        result_json=result,
        status=status,
    )
    db.add(execution)
    db.commit()
    db.refresh(execution)
    return execution


def list_playbook_executions(
    db: Session,
    *,
    playbook_id: int | None = None,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[PlaybookExecution], int]:
    query = select(PlaybookExecution)
    count_query = select(func.count(PlaybookExecution.id))
    if playbook_id is not None:
        query = query.where(PlaybookExecution.playbook_id == playbook_id)
        count_query = count_query.where(PlaybookExecution.playbook_id == playbook_id)
    query = query.order_by(PlaybookExecution.created_at.desc()).offset(skip).limit(limit)
    items = list(db.execute(query).scalars().all())
    total = db.execute(count_query).scalar_one()
    return items, total

