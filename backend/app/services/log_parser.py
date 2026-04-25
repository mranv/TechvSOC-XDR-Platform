import json
import re
from datetime import UTC
from datetime import datetime
from pathlib import Path

from app.models.enums import LogLevel
from app.schemas.logs import LogCreateRequest

SYSLOG_PATTERN = re.compile(
    r"^(?P<timestamp>\w{3}\s+\d{1,2}\s\d{2}:\d{2}:\d{2})\s+"
    r"(?P<source>[A-Za-z0-9_.:-]+)\s+"
    r"(?P<event_type>[A-Za-z0-9_.-]+)(?:\[\d+\])?:\s*"
    r"(?P<message>.+)$"
)

ISO_PREFIX_PATTERN = re.compile(
    r"^(?P<timestamp>\d{4}-\d{2}-\d{2}[T ][^ ]+)\s+"
    r"(?P<severity>DEBUG|INFO|WARNING|WARN|ERROR|CRITICAL)?\s*"
    r"(?P<message>.+)$",
    re.IGNORECASE,
)

SEVERITY_KEYWORDS = {
    "critical": LogLevel.CRITICAL,
    "fatal": LogLevel.CRITICAL,
    "error": LogLevel.ERROR,
    "failed": LogLevel.ERROR,
    "warning": LogLevel.WARNING,
    "warn": LogLevel.WARNING,
    "info": LogLevel.INFO,
    "debug": LogLevel.DEBUG,
}


def infer_severity(message: str) -> LogLevel:
    lowered = message.lower()
    for keyword, severity in SEVERITY_KEYWORDS.items():
        if keyword in lowered:
            return severity
    return LogLevel.INFO


def normalize_timestamp(value: str | datetime | None) -> datetime:
    if isinstance(value, datetime):
        timestamp = value
    elif isinstance(value, str):
        candidate = value.strip()
        if not candidate:
            return datetime.now(UTC)

        if candidate.endswith("Z"):
            candidate = candidate.replace("Z", "+00:00")

        try:
            timestamp = datetime.fromisoformat(candidate)
        except ValueError:
            try:
                parsed = datetime.strptime(candidate, "%b %d %H:%M:%S")
                timestamp = parsed.replace(year=datetime.now(UTC).year)
            except ValueError:
                return datetime.now(UTC)
    else:
        return datetime.now(UTC)

    if timestamp.tzinfo is None:
        return timestamp.replace(tzinfo=UTC)
    return timestamp.astimezone(UTC)


def parse_json_record(record: dict, default_source: str) -> LogCreateRequest:
    message = str(record.get("message") or record.get("msg") or record.get("log") or "")
    raw_log = json.dumps(record, ensure_ascii=True)
    source = str(record.get("source") or record.get("host") or default_source)
    event_type = str(record.get("event_type") or record.get("type") or "json_event")
    severity_value = str(record.get("severity") or record.get("level") or "").lower()
    severity = LogLevel(severity_value) if severity_value in LogLevel._value2member_map_ else infer_severity(message)
    endpoint_id = record.get("endpoint_id")
    metadata_json = {
        key: value
        for key, value in record.items()
        if key not in {"message", "msg", "log", "source", "host", "event_type", "type", "severity", "level", "timestamp", "event_timestamp", "endpoint_id"}
    } or None

    return LogCreateRequest(
        source=source,
        event_type=event_type,
        message=message or "Structured log event",
        raw_log=raw_log,
        severity=severity,
        event_timestamp=normalize_timestamp(record.get("event_timestamp") or record.get("timestamp")),
        endpoint_id=endpoint_id if isinstance(endpoint_id, int) else None,
        metadata_json=metadata_json,
    )


def parse_text_line(line: str, default_source: str) -> LogCreateRequest:
    stripped = line.strip()
    if not stripped:
        raise ValueError("Empty log line.")

    syslog_match = SYSLOG_PATTERN.match(stripped)
    if syslog_match:
        groups = syslog_match.groupdict()
        message = groups["message"].strip()
        return LogCreateRequest(
            source=groups["source"],
            event_type=groups["event_type"],
            message=message,
            raw_log=stripped,
            severity=infer_severity(message),
            event_timestamp=normalize_timestamp(groups["timestamp"]),
            metadata_json={"parser": "syslog"},
        )

    iso_match = ISO_PREFIX_PATTERN.match(stripped)
    if iso_match:
        groups = iso_match.groupdict()
        message = groups["message"].strip()
        severity_raw = (groups.get("severity") or "").lower().replace("warn", "warning")
        severity = LogLevel(severity_raw) if severity_raw in LogLevel._value2member_map_ else infer_severity(message)
        return LogCreateRequest(
            source=default_source,
            event_type="text_event",
            message=message,
            raw_log=stripped,
            severity=severity,
            event_timestamp=normalize_timestamp(groups["timestamp"]),
            metadata_json={"parser": "iso_prefix"},
        )

    return LogCreateRequest(
        source=default_source,
        event_type="text_event",
        message=stripped,
        raw_log=stripped,
        severity=infer_severity(stripped),
        event_timestamp=datetime.now(UTC),
        metadata_json={"parser": "plain_text"},
    )


def _coerce_severity(value: str | None) -> LogLevel:
    if not value:
        return LogLevel.INFO
    lowered = value.lower()
    if lowered in LogLevel._value2member_map_:
        return LogLevel(lowered)
    return infer_severity(lowered)


def parse_uploaded_logs(
    *,
    filename: str,
    content: bytes,
    source_override: str | None = None,
    endpoint_id: int | None = None,
) -> list[LogCreateRequest]:
    suffix = Path(filename).suffix.lower()
    text = content.decode("utf-8", errors="ignore")
    default_source = source_override or Path(filename).stem or "uploaded_log"
    parsed_logs: list[LogCreateRequest] = []

    if suffix == ".json":
        payload = json.loads(text)
        if isinstance(payload, list):
            records = payload
        elif isinstance(payload, dict):
            records = [payload]
        else:
            raise ValueError("Unsupported JSON log payload.")

        for record in records:
            if not isinstance(record, dict):
                continue
            parsed = parse_json_record(record, default_source)
            if endpoint_id is not None:
                parsed.endpoint_id = endpoint_id
            parsed_logs.append(parsed)
        return parsed_logs

    if suffix == ".jsonl":
        for line in text.splitlines():
            stripped = line.strip()
            if not stripped:
                continue
            record = json.loads(stripped)
            if not isinstance(record, dict):
                continue
            parsed = parse_json_record(record, default_source)
            if endpoint_id is not None:
                parsed.endpoint_id = endpoint_id
            parsed_logs.append(parsed)
        return parsed_logs

    for line in text.splitlines():
        if not line.strip():
            continue
        parsed = parse_text_line(line, default_source)
        if endpoint_id is not None:
            parsed.endpoint_id = endpoint_id
        parsed_logs.append(parsed)

    return parsed_logs
