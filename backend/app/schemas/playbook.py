from datetime import datetime

from pydantic import BaseModel
from pydantic import ConfigDict
from pydantic import Field


class PlaybookRule(BaseModel):
    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    condition: dict
    action: dict


class PlaybookCreateRequest(BaseModel):
    name: str = Field(min_length=3, max_length=255)
    description: str = Field(min_length=5)
    rules_json: list[PlaybookRule] = Field(default_factory=list)
    is_enabled: bool = True


class PlaybookUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=3, max_length=255)
    description: str | None = Field(default=None, min_length=5)
    rules_json: list[PlaybookRule] | None = None
    is_enabled: bool | None = None


class PlaybookResponse(BaseModel):
    id: int
    name: str
    description: str
    rules_json: list[dict]
    is_enabled: bool
    created_by_id: int | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PlaybookListResponse(BaseModel):
    items: list[PlaybookResponse]
    total: int
    skip: int
    limit: int


class PlaybookExecutionResponse(BaseModel):
    id: int
    playbook_id: int
    incident_id: int | None
    alert_id: int | None
    trigger_event: str
    action_type: str
    target_value: str | None
    result_json: dict | None
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PlaybookExecutionListResponse(BaseModel):
    items: list[PlaybookExecutionResponse]
    total: int
    skip: int
    limit: int

