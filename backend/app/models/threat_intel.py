from sqlalchemy import Boolean
from sqlalchemy import String
from sqlalchemy import Text
from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column

from app.models.base import Base
from app.models.base import TimestampMixin


class ThreatIntelRecord(TimestampMixin, Base):
    __tablename__ = "threat_intel_records"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    ip_address: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    country: Mapped[str | None] = mapped_column(String(128), nullable=True)
    asn: Mapped[str | None] = mapped_column(String(255), nullable=True)
    reputation_score: Mapped[int] = mapped_column(default=0, nullable=False)
    is_malicious: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    threat_categories: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str] = mapped_column(String(64), default="mock_enrichment", nullable=False)

