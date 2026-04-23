from __future__ import annotations

import logging
import sys
import time

import requests

from techvsoc_agent.client import TechvSOCClient
from techvsoc_agent.config import get_settings
from techvsoc_agent.log_reader import OffsetStore
from techvsoc_agent.log_reader import read_new_logs
from techvsoc_agent.system_info import collect_endpoint_registration
from techvsoc_agent.system_info import collect_metrics

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger("techvsoc-agent")


def main() -> None:
    settings = get_settings()
    if not settings.token.strip():
        logger.error("TECHVSOC_AGENT_TOKEN is required.")
        sys.exit(1)

    client = TechvSOCClient(base_url=settings.backend_url, token=settings.token)
    offset_store = OffsetStore(settings.state_path)

    try:
        endpoint = client.register_endpoint(
            collect_endpoint_registration(settings.agent_version)
        )
    except requests.RequestException as exc:
        logger.error("Failed to register endpoint with backend: %s", exc)
        sys.exit(1)

    endpoint_id = int(endpoint["id"])
    logger.info("Registered endpoint %s with id %s", endpoint["hostname"], endpoint_id)

    last_log_sync = 0.0
    while True:
        try:
            metric = collect_metrics()
            client.send_metric(endpoint_id, metric)
            logger.info(
                "Sent metrics for endpoint %s: CPU %.2f%% MEM %.2f%% DISK %.2f%%",
                endpoint_id,
                metric.cpu_usage,
                metric.memory_usage,
                metric.disk_usage,
            )

            now = time.time()
            if settings.log_files and now - last_log_sync >= settings.log_interval_seconds:
                batch = read_new_logs(
                    file_paths=settings.log_files,
                    offset_store=offset_store,
                    endpoint_id=endpoint_id,
                    default_source=settings.default_log_source,
                )
                if batch.logs:
                    client.send_logs(batch)
                    logger.info("Sent %s log events", len(batch.logs))
                last_log_sync = now
        except requests.RequestException as exc:
            logger.warning("Backend communication failed: %s", exc)
        except Exception as exc:  # noqa: BLE001
            logger.exception("Agent loop failed: %s", exc)

        time.sleep(settings.interval_seconds)
