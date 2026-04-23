from datetime import datetime

from pydantic import BaseModel
from pydantic import ConfigDict
from pydantic import Field


class EndpointRegistrationRequest(BaseModel):
    hostname: str = Field(min_length=1, max_length=255)
    ip_address: str = Field(min_length=1, max_length=64)
    operating_system: str = Field(min_length=1, max_length=255)
    agent_version: str = Field(min_length=1, max_length=64)
    status: str = Field(default="online", min_length=1, max_length=32)
    last_seen_ip: str | None = Field(default=None, max_length=64)
    notes: str | None = None


class EndpointMetricCreateRequest(BaseModel):
    cpu_usage: float = Field(ge=0, le=100)
    memory_usage: float = Field(ge=0, le=100)
    disk_usage: float = Field(ge=0, le=100)
    uptime_seconds: float = Field(ge=0)
    process_count: int = Field(ge=0)
    metric_source: str = Field(default="agent", min_length=1, max_length=64)
    collected_at: datetime


class EndpointMetricResponse(BaseModel):
    id: int
    endpoint_id: int
    cpu_usage: float
    memory_usage: float
    disk_usage: float
    uptime_seconds: float
    process_count: int
    metric_source: str
    collected_at: datetime
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EndpointResponse(BaseModel):
    id: int
    hostname: str
    ip_address: str
    operating_system: str
    agent_version: str
    status: str
    last_seen_ip: str | None
    notes: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EndpointMonitoringSummary(BaseModel):
    endpoint: EndpointResponse
    latest_metric: EndpointMetricResponse | None


class EndpointListResponse(BaseModel):
    items: list[EndpointMonitoringSummary]
    total: int
    skip: int
    limit: int


class MonitoringOverviewResponse(BaseModel):
    total_hosts: int
    online_hosts: int
    offline_hosts: int
    average_cpu_usage: float
    average_memory_usage: float
    average_disk_usage: float
    active_alerts: int


class EndpointDetailResponse(BaseModel):
    endpoint: EndpointResponse
    latest_metric: EndpointMetricResponse | None
    recent_metrics: list[EndpointMetricResponse]
