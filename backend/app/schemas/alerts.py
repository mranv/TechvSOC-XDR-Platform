from datetime import datetime

from pydantic import BaseModel
from pydantic import ConfigDict

from app.models.enums import AlertSeverity
from app.models.enums import AlertStatus


class AlertResponse(BaseModel):
    id: int
    title: str
    description: str
    severity: AlertSeverity
    status: AlertStatus
    endpoint_id: int | None
    log_entry_id: int | None
    rule_id: int | None
    owner_id: int | None
    source: str
    timeline_json: list[dict] | None
    triggered_at: datetime
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AlertListResponse(BaseModel):
    items: list[AlertResponse]
    total: int
    skip: int
    limit: int
