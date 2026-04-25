from pydantic import BaseModel
from pydantic import ConfigDict
from pydantic import Field

from app.models.enums import SoarActionType


class SoarActionRequest(BaseModel):
    action_type: SoarActionType
    target_value: str = Field(min_length=1, max_length=255)
    reason: str = Field(min_length=1)
    parameters_json: dict | None = None


class SoarActionResponse(BaseModel):
    id: int
    action_type: SoarActionType
    target_value: str
    reason: str
    parameters_json: dict | None
    result_json: dict | None
    status: str
    executed_by_id: int | None
    created_at: str
    updated_at: str

    model_config = ConfigDict(from_attributes=True)


class SoarActionListResponse(BaseModel):
    items: list[SoarActionResponse]
    total: int
    skip: int
    limit: int


class BlockIpRequest(BaseModel):
    ip_address: str = Field(min_length=1, max_length=64)
    reason: str = Field(min_length=1)
    duration_minutes: int = Field(default=60, ge=1)


class DisableUserRequest(BaseModel):
    username: str = Field(min_length=1, max_length=255)
    reason: str = Field(min_length=1)

