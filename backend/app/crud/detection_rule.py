from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.detection_rule import DetectionRule
from app.models.enums import RuleType


def list_rules(
    db: Session,
    *,
    enabled_only: bool = False,
    rule_type: RuleType | None = None,
) -> list[DetectionRule]:
    query = select(DetectionRule).order_by(DetectionRule.created_at.desc())
    if enabled_only:
        query = query.where(DetectionRule.is_enabled.is_(True))
    if rule_type is not None:
        query = query.where(DetectionRule.rule_type == rule_type)
    return list(db.execute(query).scalars().all())


def get_rule_by_name(db: Session, name: str) -> DetectionRule | None:
    query = select(DetectionRule).where(DetectionRule.name == name)
    return db.execute(query).scalar_one_or_none()


def get_rule_by_id(db: Session, rule_id: int) -> DetectionRule | None:
    query = select(DetectionRule).where(DetectionRule.id == rule_id)
    return db.execute(query).scalar_one_or_none()


def create_rule(db: Session, rule: DetectionRule) -> DetectionRule:
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule
