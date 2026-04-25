from __future__ import annotations

import ipaddress
import random
from datetime import UTC
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.threat_intel import ThreatIntelRecord


MOCK_COUNTRIES = [
    "United States",
    "China",
    "Russia",
    "North Korea",
    "Iran",
    "Brazil",
    "India",
    "Germany",
    "United Kingdom",
    "Netherlands",
]

MOCK_ASNS = [
    "AS1234 Example ISP",
    "AS5678 Cloud Corp",
    "AS9012 Hosting Ltd",
    "AS3456 Telecom Group",
    "AS7890 Data Center Inc",
]

MOCK_CATEGORIES = [
    "botnet",
    "malware_distribution",
    "phishing",
    "scanning",
    "brute_force",
    "proxy",
]


def _hash_ip(ip: str) -> int:
    try:
        return int(ipaddress.ip_address(ip))
    except ValueError:
        return hash(ip) & 0xFFFFFFFF


def enrich_ip(ip_address: str, db: Session) -> ThreatIntelRecord:
    existing = db.execute(
        select(ThreatIntelRecord).where(ThreatIntelRecord.ip_address == ip_address)
    ).scalar_one_or_none()

    if existing:
        return existing

    seed = _hash_ip(ip_address)
    rng = random.Random(seed)

    is_malicious = rng.random() < 0.3
    reputation_score = rng.randint(0, 100)
    if is_malicious:
        reputation_score = max(reputation_score, 70)

    country = rng.choice(MOCK_COUNTRIES)
    asn = rng.choice(MOCK_ASNS)

    categories = None
    if is_malicious:
        categories = ", ".join(rng.sample(MOCK_CATEGORIES, k=rng.randint(1, 3)))

    record = ThreatIntelRecord(
        ip_address=ip_address,
        country=country,
        asn=asn,
        reputation_score=reputation_score,
        is_malicious=is_malicious,
        threat_categories=categories,
        source="mock_enrichment",
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def get_threat_intel_for_ip(db: Session, ip_address: str) -> ThreatIntelRecord:
    return enrich_ip(ip_address, db)


def batch_enrich_ips(db: Session, ip_addresses: list[str]) -> list[ThreatIntelRecord]:
    return [enrich_ip(ip, db) for ip in set(ip_addresses) if ip]

