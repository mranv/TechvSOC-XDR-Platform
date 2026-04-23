from datetime import datetime

from pydantic import BaseModel
from pydantic import Field


class EndpointRegistrationPayload(BaseModel):
    hostname: str
    ip_address: str
    operating_system: str
    agent_version: str
    status: str = "online"
    last_seen_ip: str | None = None
    notes: str | None = None


class MetricPayload(BaseModel):
    cpu_usage: float = Field(ge=0, le=100)
    memory_usage: float = Field(ge=0, le=100)
    disk_usage: float = Field(ge=0, le=100)
    uptime_seconds: float = Field(ge=0)
    process_count: int = Field(ge=0)
    metric_source: str = "agent"
    collected_at: datetime


class LogEventPayload(BaseModel):
    source: str
    event_type: str
    message: str
    raw_log: str
    severity: str
    event_timestamp: datetime
    endpoint_id: int | None = None
    metadata_json: dict | None = None


class LogBatchPayload(BaseModel):
    logs: list[LogEventPayload]
