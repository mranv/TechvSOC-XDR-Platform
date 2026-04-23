from datetime import datetime

from pydantic import BaseModel
from pydantic import ConfigDict
from pydantic import Field

from app.models.enums import ScanStatus


class ScanRequest(BaseModel):
    target: str | None = Field(default=None, min_length=1, max_length=255)
    endpoint_id: int | None = None
    ports: str | None = Field(default=None, max_length=255)
    arguments: list[str] | None = None


class OpenPortResponse(BaseModel):
    port: int
    protocol: str
    service: str
    state: str


class ScanResultResponse(BaseModel):
    id: int
    endpoint_id: int | None
    target: str
    status: ScanStatus
    scanner: str
    open_ports_json: list[dict] | None
    raw_output: str | None
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ScanListResponse(BaseModel):
    items: list[ScanResultResponse]
    total: int
    skip: int
    limit: int
