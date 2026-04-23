from __future__ import annotations

import re
import shutil
import subprocess
from datetime import UTC
from datetime import datetime

from fastapi import HTTPException
from fastapi import status
from sqlalchemy.orm import Session

from app.crud.endpoint import get_endpoint_by_id
from app.crud.scan_result import create_scan_result
from app.crud.scan_result import get_scan_result_by_id
from app.crud.scan_result import update_scan_result
from app.models.enums import ScanStatus
from app.models.scan_result import ScanResult
from app.schemas.scanner import ScanRequest

SAFE_ARGUMENT_PATTERN = re.compile(r"^[-A-Za-z0-9_=./,:+]+$")
PORTS_PATTERN = re.compile(r"^[0-9,\-]+$")
NMAP_PORT_PATTERN = re.compile(
    r"^(?P<port>\d+)/(tcp|udp)\s+(?P<state>\S+)\s+(?P<service>\S+)"
)


def get_scan_or_404(db: Session, scan_id: int) -> ScanResult:
    scan = get_scan_result_by_id(db, scan_id)
    if scan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scan result {scan_id} was not found.",
        )
    return scan


def _resolve_target(db: Session, payload: ScanRequest) -> tuple[str, int | None]:
    if payload.endpoint_id is not None:
        endpoint = get_endpoint_by_id(db, payload.endpoint_id)
        if endpoint is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Endpoint {payload.endpoint_id} was not found.",
            )
        return endpoint.ip_address, endpoint.id

    if payload.target:
        return payload.target.strip(), None

    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail="Either target or endpoint_id must be provided.",
    )


def _validate_scan_payload(payload: ScanRequest) -> None:
    if payload.ports and not PORTS_PATTERN.fullmatch(payload.ports):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Ports must contain only digits, commas, and hyphens.",
        )

    for arg in payload.arguments or []:
        if not SAFE_ARGUMENT_PATTERN.fullmatch(arg):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Unsafe nmap argument rejected: {arg}",
            )


def _parse_open_ports(output: str) -> list[dict]:
    ports: list[dict] = []
    for line in output.splitlines():
        match = NMAP_PORT_PATTERN.match(line.strip())
        if not match:
            continue
        protocol = line.strip().split("/", 1)[1].split()[0]
        ports.append(
            {
                "port": int(match.group("port")),
                "protocol": protocol,
                "state": match.group("state"),
                "service": match.group("service"),
            }
        )
    return ports


def _build_nmap_command(target: str, payload: ScanRequest) -> list[str]:
    command = ["nmap", "-Pn"]
    if payload.ports:
        command.extend(["-p", payload.ports])
    for arg in payload.arguments or []:
        command.append(arg)
    command.append(target)
    return command


def run_nmap_scan(db: Session, payload: ScanRequest) -> ScanResult:
    _validate_scan_payload(payload)
    target, endpoint_id = _resolve_target(db, payload)

    started_at = datetime.now(UTC)
    scan_result = create_scan_result(
        db,
        ScanResult(
            endpoint_id=endpoint_id,
            target=target,
            status=ScanStatus.RUNNING,
            scanner="nmap",
            open_ports_json=[],
            raw_output=None,
            started_at=started_at,
            completed_at=None,
        ),
    )

    nmap_path = shutil.which("nmap")
    if not nmap_path:
        scan_result.status = ScanStatus.FAILED
        scan_result.raw_output = "nmap is not installed or not available in PATH."
        scan_result.completed_at = datetime.now(UTC)
        return update_scan_result(db, scan_result)

    command = _build_nmap_command(target, payload)
    try:
        completed = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=120,
            check=False,
        )
        combined_output = "\n".join(
            part for part in [completed.stdout.strip(), completed.stderr.strip()] if part
        ).strip()
        if completed.returncode == 0:
            scan_result.status = ScanStatus.COMPLETED
            scan_result.open_ports_json = _parse_open_ports(combined_output)
            scan_result.raw_output = combined_output
        else:
            scan_result.status = ScanStatus.FAILED
            scan_result.open_ports_json = []
            scan_result.raw_output = combined_output or "nmap scan failed."
    except subprocess.TimeoutExpired:
        scan_result.status = ScanStatus.FAILED
        scan_result.open_ports_json = []
        scan_result.raw_output = "nmap scan timed out after 120 seconds."

    scan_result.completed_at = datetime.now(UTC)
    return update_scan_result(db, scan_result)
