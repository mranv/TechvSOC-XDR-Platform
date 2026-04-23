from __future__ import annotations

import platform
import socket
from datetime import UTC
from datetime import datetime

import psutil

from techvsoc_agent.models import EndpointRegistrationPayload
from techvsoc_agent.models import MetricPayload


def detect_primary_ip() -> str:
    candidate = "127.0.0.1"
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.connect(("8.8.8.8", 80))
        candidate = sock.getsockname()[0]
    except OSError:
        pass
    finally:
        sock.close()
    return candidate


def collect_endpoint_registration(agent_version: str) -> EndpointRegistrationPayload:
    ip_address = detect_primary_ip()
    return EndpointRegistrationPayload(
        hostname=socket.gethostname(),
        ip_address=ip_address,
        operating_system=f"{platform.system()} {platform.release()}",
        agent_version=agent_version,
        status="online",
        last_seen_ip=ip_address,
        notes="Registered by TechvSOC XDR Platform Agent",
    )


def collect_metrics() -> MetricPayload:
    return MetricPayload(
        cpu_usage=round(psutil.cpu_percent(interval=1), 2),
        memory_usage=round(psutil.virtual_memory().percent, 2),
        disk_usage=round(psutil.disk_usage("/").percent, 2),
        uptime_seconds=max(0.0, round(datetime.now(UTC).timestamp() - psutil.boot_time(), 2)),
        process_count=len(psutil.pids()),
        metric_source="agent",
        collected_at=datetime.now(UTC),
    )
