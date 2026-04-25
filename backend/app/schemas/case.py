from datetime import datetime

from pydantic import BaseModel
from pydantic import ConfigDict
from pydantic import Field

from app.schemas.incident import IncidentResponse


class CaseCreateRequest(BaseModel):
    title: str = Field(min_length=3, max_length=255)
    description: str = Field(min_length=5)
    priority: str = Field(default="medium")
    incident_ids: list[int] = Field(default_factory=list)


class CaseUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=255)
    description: str | None = Field(default=None, min_length=5)
    status: str | None = None
    priority: str | None = None
    assigned_to_id: int | None = None


class CaseNoteCreate(BaseModel):
    content: str = Field(min_length=1)


class CaseNoteResponse(BaseModel):
    id: int
    case_id: int
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CaseEvidenceItem(BaseModel):
    type: str
    description: str
    source: str | None = None
    timestamp: datetime | None = None


class CaseResponse(BaseModel):
    id: int
    title: str
    description: str
    status: str
    priority: str
    assigned_to_id: int | None
    closed_at: datetime | None
    created_at: datetime
    updated_at: datetime
    incidents: list[IncidentResponse] = Field(default_factory=list)
    incident_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class CaseListResponse(BaseModel):
    items: list[CaseResponse]
    total: int
    skip: int
    limit: int

