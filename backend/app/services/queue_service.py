from __future__ import annotations

import json
import logging
from typing import Any

import redis

from app.core.config import settings

logger = logging.getLogger("techvsoc.queue")

STREAM_KEY = "techvsoc:logs:stream"
CONSUMER_GROUP = "techvsoc:workers"
CONSUMER_NAME = "worker-1"


def get_redis_client() -> redis.Redis:
    return redis.from_url(settings.redis_url, decode_responses=True)


def ensure_consumer_group() -> None:
    client = get_redis_client()
    try:
        client.xgroup_create(STREAM_KEY, CONSUMER_GROUP, id="0", mkstream=True)
        logger.info("Created Redis consumer group %s", CONSUMER_GROUP)
    except redis.ResponseError as exc:
        if "BUSYGROUP" in str(exc):
            logger.debug("Consumer group already exists")
        else:
            raise


def push_log_to_queue(log_payload: dict[str, Any]) -> str:
    client = get_redis_client()
    entry_id = client.xadd(
        STREAM_KEY,
        {"payload": json.dumps(log_payload)},
        maxlen=10000,
        approximate=True,
    )
    logger.info("Pushed log to queue: %s", entry_id)
    return entry_id


def push_batch_to_queue(logs: list[dict[str, Any]]) -> list[str]:
    client = get_redis_client()
    pipe = client.pipeline()
    for log in logs:
        pipe.xadd(
            STREAM_KEY,
            {"payload": json.dumps(log)},
            maxlen=10000,
            approximate=True,
        )
    ids = pipe.execute()
    logger.info("Pushed %s logs to queue", len(ids))
    return ids


def read_from_queue(
    count: int = 100,
    block_ms: int = 5000,
) -> list[tuple[str, dict[str, str]]]:
    client = get_redis_client()
    ensure_consumer_group()
    entries = client.xreadgroup(
        groupname=CONSUMER_GROUP,
        consumername=CONSUMER_NAME,
        streams={STREAM_KEY: ">"},
        count=count,
        block=block_ms,
    )
    results: list[tuple[str, dict[str, str]]] = []
    for stream_name, messages in entries:
        for message_id, fields in messages:
            results.append((message_id, fields))
    return results


def ack_message(message_id: str) -> None:
    client = get_redis_client()
    client.xack(STREAM_KEY, CONSUMER_GROUP, message_id)


def get_queue_info() -> dict[str, Any]:
    client = get_redis_client()
    info = client.xinfo_stream(STREAM_KEY)
    groups = client.xinfo_groups(STREAM_KEY)
    pending = 0
    for group in groups:
        pending += group.get("pending", 0)
    return {
        "length": info.get("length", 0),
        "pending": pending,
        "consumer_groups": len(groups),
    }

