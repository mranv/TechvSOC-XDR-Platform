from datetime import datetime

from pydantic import BaseModel
from pydantic import ConfigDict
from pydantic import Field


class IncidentNoteCreate(BaseModel):
    content: str = Field(min_length=1, max_length=4000)


class IncidentNoteResponse(BaseModel):
    id: int
    incident_id: int
    author_id: int | None
    author_name: str | None = None
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class IncidentActivityResponse(BaseModel):
    id: int
    incident_id: int
    actor_id: int | None
    actor_name: str | None = None
    action: str
    old_value: str | None
    new_value: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
