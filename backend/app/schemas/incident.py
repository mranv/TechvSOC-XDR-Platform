from datetime import datetime

from pydantic import BaseModel
from pydantic import ConfigDict
from pydantic import Field

from app.models.enums import IncidentSeverity
from app.models.enums import IncidentStatus


class IncidentCreateRequest(BaseModel):
    title: str = Field(min_length=3, max_length=255)
    description: str = Field(min_length=5)
    severity: IncidentSeverity = IncidentSeverity.MEDIUM
    alert_ids: list[int] = Field(default_factory=list)


class IncidentUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=255)
    description: str | None = Field(default=None, min_length=5)
    severity: IncidentSeverity | None = None
    status: IncidentStatus | None = None
    assigned_to_id: int | None = None


class AlertSummaryResponse(BaseModel):
    id: int
    title: str
    severity: str
    status: str
    triggered_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RecommendedAction(BaseModel):
    action: str
    target: str | None
    confidence: int
    reason: str


class BehaviorSummary(BaseModel):
    primary_tactics: list[str]
    observed_techniques: list[dict]
    behavior_pattern: str
    suspicious_indicators: int


class ExtractedEntities(BaseModel):
    ips: list[str]
    usernames: list[str]
    hostnames: list[str]
    file_paths: list[str]


class IncidentStoryResponse(BaseModel):
    what_happened: str
    how_it_happened: str
    impact: str
    recommended_next_steps: list[str]
    entities: ExtractedEntities
    behavior_summary: BehaviorSummary
    incident_type: str
    severity: str
    alert_count: int
    timeline_event_count: int
    attack_step_count: int


class ForensicsProcessNode(BaseModel):
    pid: int
    name: str
    command_line: str
    user: str
    start_time: str | None
    children: list["ForensicsProcessNode"] = []


class ForensicsFileActivity(BaseModel):
    action: str
    path: str
    timestamp: str
    size_bytes: int
    hash: str | None


class ForensicsNetworkActivity(BaseModel):
    timestamp: str
    source_ip: str
    dest_ip: str
    dest_port: int
    protocol: str
    direction: str
    bytes: int


class ForensicsRegistryActivity(BaseModel):
    action: str
    key: str
    value_name: str
    value_data: str
    timestamp: str


class ForensicsResponse(BaseModel):
    process_tree: list[ForensicsProcessNode]
    file_activity: list[ForensicsFileActivity]
    network_activity: list[ForensicsNetworkActivity]
    registry_activity: list[ForensicsRegistryActivity]
    behavior_summary: BehaviorSummary
    generated_at: str
    incident_type: str


class IncidentResponse(BaseModel):
    id: int
    title: str
    description: str
    severity: IncidentSeverity
    status: IncidentStatus
    attack_chain_json: dict | None
    timeline_json: list[dict] | None
    assigned_to_id: int | None
    resolved_at: datetime | None
    created_at: datetime
    updated_at: datetime
    alerts: list[AlertSummaryResponse] = Field(default_factory=list)
    risk_score: int = 0
    confidence_level: str = "low"
    ai_summary: str | None = None
    recommended_actions: list[RecommendedAction] = Field(default_factory=list)
    story: IncidentStoryResponse | None = None
    forensics: ForensicsResponse | None = None

    model_config = ConfigDict(from_attributes=True)


class IncidentListResponse(BaseModel):
    items: list[IncidentResponse]
    total: int
    skip: int
    limit: int

