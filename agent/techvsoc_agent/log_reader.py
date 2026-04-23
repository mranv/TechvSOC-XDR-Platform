from __future__ import annotations

import json
from datetime import UTC
from datetime import datetime
from pathlib import Path

from techvsoc_agent.models import LogBatchPayload
from techvsoc_agent.models import LogEventPayload

SEVERITY_KEYWORDS = {
    "critical": "critical",
    "fatal": "critical",
    "error": "error",
    "failed": "error",
    "warning": "warning",
    "warn": "warning",
    "info": "info",
    "debug": "debug",
}


class OffsetStore:
    def __init__(self, path: str) -> None:
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if not self.path.exists():
            self.path.write_text("{}", encoding="utf-8")

    def load(self) -> dict[str, int]:
        try:
            return json.loads(self.path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return {}

    def save(self, offsets: dict[str, int]) -> None:
        self.path.write_text(json.dumps(offsets, indent=2, sort_keys=True), encoding="utf-8")


def infer_severity(line: str) -> str:
    lowered = line.lower()
    for keyword, severity in SEVERITY_KEYWORDS.items():
        if keyword in lowered:
            return severity
    return "info"


def read_new_logs(
    *,
    file_paths: list[str],
    offset_store: OffsetStore,
    endpoint_id: int,
    default_source: str,
    batch_limit: int = 100,
) -> LogBatchPayload:
    offsets = offset_store.load()
    collected: list[LogEventPayload] = []

    for file_path in file_paths:
        path = Path(file_path)
        if not path.exists() or not path.is_file():
            continue

        offset = offsets.get(str(path), 0)
        size = path.stat().st_size
        if size < offset:
            offset = 0

        with path.open("r", encoding="utf-8", errors="ignore") as handle:
            handle.seek(offset)
            for line in handle:
                stripped = line.strip()
                if not stripped:
                    continue
                collected.append(
                    LogEventPayload(
                        source=path.name or default_source,
                        event_type="file_log",
                        message=stripped[:5000],
                        raw_log=stripped[:10000],
                        severity=infer_severity(stripped),
                        event_timestamp=datetime.now(UTC),
                        endpoint_id=endpoint_id,
                        metadata_json={"file_path": str(path)},
                    )
                )
                if len(collected) >= batch_limit:
                    break
            offsets[str(path)] = handle.tell()

        if len(collected) >= batch_limit:
            break

    offset_store.save(offsets)
    return LogBatchPayload(logs=collected)
