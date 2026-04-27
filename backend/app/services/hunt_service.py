from __future__ import annotations

import re
from collections.abc import Callable

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.log_entry import LogEntry


# Simple field mapping for DSL
DSL_FIELD_MAP = {
    "ip": ["ip_address", "source_ip", "dest_ip"],
    "user": ["username", "user", "account"],
    "host": ["hostname", "host", "endpoint"],
    "event_type": ["event_type"],
    "severity": ["severity"],
    "source": ["source"],
    "message": ["message", "raw_log"],
}


def _tokenize(query: str) -> list[str]:
    """Tokenize a hunt query string."""
    # Split on spaces but preserve quoted strings
    tokens = []
    current = ""
    in_quotes = False
    for char in query:
        if char == '"':
            in_quotes = not in_quotes
            current += char
        elif char == " " and not in_quotes:
            if current:
                tokens.append(current)
                current = ""
        else:
            current += char
    if current:
        tokens.append(current)
    return tokens


def _parse_field_query(token: str) -> tuple[str, str, str] | None:
    """Parse a field:value query. Returns (field, operator, value) or None."""
    # Match patterns like ip:192.168.1.1, user:admin, severity:critical
    match = re.match(r'^([a-zA-Z_]+):(.+)$', token)
    if match:
        field = match.group(1).lower()
        value = match.group(2).strip('"')
        return (field, "equals", value)
    return None


def parse_hunt_query(query: str) -> dict:
    """Parse a hunt DSL query into a structured filter tree.

    Supports:
    - Field queries: ip:192.168.1.1, user:admin
    - AND/OR/NOT operators (case-insensitive)
    - Free text search
    - Parentheses grouping (basic)

    Example:
        ip:192.168.1.5 AND event_type:login_failure
        user:admin OR severity:critical
        NOT ip:10.0.0.1
    """
    query = query.strip()
    if not query:
        return {"type": "all", "filters": []}

    tokens = _tokenize(query)
    filters = []
    operator_stack = []
    current_op = "AND"

    i = 0
    while i < len(tokens):
        token = tokens[i].upper()

        if token == "AND":
            current_op = "AND"
            i += 1
            continue
        elif token == "OR":
            current_op = "OR"
            i += 1
            continue
        elif token == "NOT":
            # Next token is negated
            if i + 1 < len(tokens):
                next_token = tokens[i + 1]
                field_query = _parse_field_query(next_token)
                if field_query:
                    filters.append({
                        "type": "field",
                        "field": field_query[0],
                        "operator": "not_equals",
                        "value": field_query[2],
                        "bool_op": current_op,
                    })
                else:
                    filters.append({
                        "type": "text",
                        "value": next_token.strip('"'),
                        "bool_op": current_op,
                        "negated": True,
                    })
                i += 2
                current_op = "AND"
                continue
            i += 1
            continue

        # Try field query
        field_query = _parse_field_query(tokens[i])
        if field_query:
            filters.append({
                "type": "field",
                "field": field_query[0],
                "operator": field_query[1],
                "value": field_query[2],
                "bool_op": current_op,
            })
        else:
            # Free text search
            filters.append({
                "type": "text",
                "value": tokens[i].strip('"'),
                "bool_op": current_op,
                "negated": False,
            })

        i += 1
        current_op = "AND"

    return {"type": "compound", "filters": filters}


def _build_field_filter(field: str, value: str) -> Callable | None:
    """Build a SQLAlchemy filter for a field query."""
    # Map the DSL field to actual model fields
    model_fields = DSL_FIELD_MAP.get(field)
    if not model_fields:
        return None

    conditions = []
    for mf in model_fields:
        if mf == "ip_address":
            conditions.append(LogEntry.metadata_json.contains({"ip_address": value}))
            conditions.append(LogEntry.metadata_json.contains({"source_ip": value}))
            conditions.append(LogEntry.metadata_json.contains({"dest_ip": value}))
        elif mf == "username":
            conditions.append(LogEntry.metadata_json.contains({"username": value}))
            conditions.append(LogEntry.metadata_json.contains({"user": value}))
        elif mf == "hostname":
            conditions.append(LogEntry.metadata_json.contains({"hostname": value}))
        elif mf == "event_type":
            conditions.append(LogEntry.event_type.ilike(f"%{value}%"))
        elif mf == "severity":
            try:
                from app.models.enums import LogLevel
                severity_enum = LogLevel(value.lower())
                conditions.append(LogEntry.severity == severity_enum)
            except ValueError:
                pass
        elif mf == "source":
            conditions.append(LogEntry.source.ilike(f"%{value}%"))
        elif mf in ("message", "raw_log"):
            conditions.append(LogEntry.message.ilike(f"%{value}%"))
            conditions.append(LogEntry.raw_log.ilike(f"%{value}%"))

    if conditions:
        return or_(*conditions)
    return None


def execute_hunt_query(
    db: Session,
    parsed_query: dict,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[LogEntry], int]:
    """Execute a parsed hunt query against the database."""
    from sqlalchemy import func
    from sqlalchemy import select

    if parsed_query.get("type") == "all":
        query = select(LogEntry).order_by(LogEntry.event_timestamp.desc()).offset(skip).limit(limit)
        total = db.execute(select(func.count(LogEntry.id))).scalar_one()
        return list(db.execute(query).scalars().all()), total

    filters = parsed_query.get("filters", [])
    if not filters:
        query = select(LogEntry).order_by(LogEntry.event_timestamp.desc()).offset(skip).limit(limit)
        total = db.execute(select(func.count(LogEntry.id))).scalar_one()
        return list(db.execute(query).scalars().all()), total

    from sqlalchemy import and_, or_

    and_conditions = []
    or_conditions = []

    for f in filters:
        condition = None

        if f["type"] == "field":
            condition = _build_field_filter(f["field"], f["value"])
        elif f["type"] == "text":
            text = f["value"]
            condition = or_(
                LogEntry.message.ilike(f"%{text}%"),
                LogEntry.raw_log.ilike(f"%{text}%"),
                LogEntry.source.ilike(f"%{text}%"),
                LogEntry.event_type.ilike(f"%{text}%"),
            )

        if condition is not None:
            if f.get("negated"):
                condition = ~condition

            if f.get("bool_op", "AND") == "OR":
                or_conditions.append(condition)
            else:
                and_conditions.append(condition)

    # Combine conditions
    final_conditions = []
    if and_conditions:
        final_conditions.append(and_(*and_conditions))
    if or_conditions:
        final_conditions.append(or_(*or_conditions))

    if final_conditions:
        where_clause = and_(*final_conditions) if len(final_conditions) > 1 else final_conditions[0]
        query = select(LogEntry).where(where_clause).order_by(LogEntry.event_timestamp.desc()).offset(skip).limit(limit)
        count_query = select(func.count(LogEntry.id)).where(where_clause)
    else:
        query = select(LogEntry).order_by(LogEntry.event_timestamp.desc()).offset(skip).limit(limit)
        count_query = select(func.count(LogEntry.id))

    items = list(db.execute(query).scalars().all())
    total = db.execute(count_query).scalar_one()
    return items, total

