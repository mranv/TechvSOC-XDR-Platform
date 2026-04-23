from datetime import datetime

from pydantic import BaseModel
from pydantic import ConfigDict
from pydantic import Field

from app.models.enums import LogLevel


class LogCreateRequest(BaseModel):
    source: str = Field(min_length=1, max_length=255)
    event_type: str = Field(min_length=1, max_length=255)
    message: str = Field(min_length=1)
    raw_log: str = Field(min_length=1)
    severity: LogLevel = LogLevel.INFO
    event_timestamp: datetime
    endpoint_id: int | None = None
    metadata_json: dict | None = None


class BatchLogCreateRequest(BaseModel):
    logs: list[LogCreateRequest] = Field(min_length=1, max_length=500)


class LogResponse(BaseModel):
    id: int
    source: str
    event_type: str
    message: str
    raw_log: str
    severity: LogLevel
    event_timestamp: datetime
    endpoint_id: int | None
    metadata_json: dict | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LogUploadResponse(BaseModel):
    filename: str
    imported_count: int
    logs: list[LogResponse]


class LogListResponse(BaseModel):
    items: list[LogResponse]
    total: int
    skip: int
    limit: int
