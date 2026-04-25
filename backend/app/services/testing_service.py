from __future__ import annotations

from sqlalchemy.orm import Session

from app.services.correlation_service import correlate_alerts_into_incidents
from app.services.detection_service import run_detection_cycle
from app.services.simulation_service import run_simulation


def generate_demo_data(db: Session) -> dict:
    """Generate a complete multi-stage attack demo dataset."""
    results = []

    # Stage 1: Reconnaissance (port scan)
    results.append(
        run_simulation(
            db,
            scenario="port_scan",
            parameters={
                "target_ip": "10.0.0.5",
                "ports": [22, 80, 443, 3389, 445, 3306, 5432, 8080],
                "source_ip": "192.168.1.200",
            },
            trigger_detection=True,
        )
    )

    # Stage 2: Initial Access (brute force)
    results.append(
        run_simulation(
            db,
            scenario="brute_force",
            parameters={
                "username": "admin",
                "source_ip": "192.168.1.200",
                "count": 12,
                "add_success": True,
            },
            trigger_detection=True,
        )
    )

    # Stage 3: Execution (malware beacon)
    results.append(
        run_simulation(
            db,
            scenario="malware_beacon",
            parameters={
                "c2_ip": "185.220.101.42",
                "interval_minutes": 10,
                "count": 6,
            },
            trigger_detection=True,
        )
    )

    # Stage 4: Lateral Movement (suspicious login)
    results.append(
        run_simulation(
            db,
            scenario="suspicious_login",
            parameters={
                "username": "admin",
                "countries": ["US", "RU"],
                "ips": ["203.0.113.1", "198.51.100.2"],
            },
            trigger_detection=True,
        )
    )

    # Stage 5: Exfiltration
    results.append(
        run_simulation(
            db,
            scenario="data_exfiltration",
            parameters={
                "dest_ip": "45.142.212.100",
                "size_mb": 300,
            },
            trigger_detection=True,
        )
    )

    # Stage 6: Privilege Escalation
    results.append(
        run_simulation(
            db,
            scenario="privilege_escalation",
            parameters={
                "username": "www-data",
                "technique": "sudo_abuse",
            },
            trigger_detection=True,
        )
    )

    # Run correlation to create incidents from all generated alerts
    incidents = correlate_alerts_into_incidents(db, hours=6)

    total_logs = sum(r["logs_created"] for r in results)
    total_alerts = sum(len(r["alert_ids"]) for r in results)

    return {
        "logs_created": total_logs,
        "alerts_created": total_alerts,
        "incidents_created": len(incidents),
        "stages": [r["scenario"] for r in results],
        "message": f"Demo data generated: {total_logs} logs, {total_alerts} alerts, {len(incidents)} incidents.",
    }

