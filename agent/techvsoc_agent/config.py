from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class AgentSettings(BaseSettings):
    agent_name: str = Field(
        default="TechvSOC XDR Platform Agent",
        alias="TECHVSOC_AGENT_NAME",
    )
    backend_url: str = Field(
        default="http://localhost:8000/api/v1",
        alias="TECHVSOC_AGENT_BACKEND_URL",
    )
    token: str = Field(default="", alias="TECHVSOC_AGENT_TOKEN")
    interval_seconds: int = Field(default=30, alias="TECHVSOC_AGENT_INTERVAL_SECONDS")
    log_interval_seconds: int = Field(
        default=60,
        alias="TECHVSOC_AGENT_LOG_INTERVAL_SECONDS",
    )
    agent_version: str = Field(default="1.0.0", alias="TECHVSOC_AGENT_VERSION")
    default_log_source: str = Field(
        default="endpoint-agent",
        alias="TECHVSOC_AGENT_DEFAULT_LOG_SOURCE",
    )
    log_files: list[str] = Field(default_factory=list, alias="TECHVSOC_AGENT_LOG_FILES")
    state_path: str = Field(default=".agent-state.json", alias="TECHVSOC_AGENT_STATE_PATH")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @field_validator("log_files", mode="before")
    @classmethod
    def parse_log_files(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @field_validator("backend_url")
    @classmethod
    def strip_backend_url(cls, value: str) -> str:
        return value.rstrip("/")

    @field_validator("state_path")
    @classmethod
    def normalize_state_path(cls, value: str) -> str:
        return str(Path(value))


@lru_cache
def get_settings() -> AgentSettings:
    return AgentSettings()
