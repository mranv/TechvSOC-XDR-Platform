from datetime import datetime

from pydantic import BaseModel
from pydantic import ConfigDict
from pydantic import Field

from app.models.enums import AlertSeverity
from app.models.enums import RuleType


class DetectionRuleCreateRequest(BaseModel):
    name: str = Field(min_length=3, max_length=255)
    description: str = Field(min_length=5)
    rule_type: RuleType
    pattern: str = Field(min_length=1)
    condition_json: dict | None = None
    severity: AlertSeverity = AlertSeverity.MEDIUM
    is_enabled: bool = True


class DetectionRuleResponse(BaseModel):
    id: int
    name: str
    description: str
    rule_type: RuleType
    pattern: str
    condition_json: dict | None
    severity: AlertSeverity
    is_enabled: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DetectionRunResponse(BaseModel):
    rules_evaluated: int
    logs_scanned: int
    alerts_created: int
    alerts: list[int]
    window_start: datetime
    window_end: datetime
