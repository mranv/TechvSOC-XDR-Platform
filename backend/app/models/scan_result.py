from datetime import datetime

from sqlalchemy import DateTime
from sqlalchemy import Enum
from sqlalchemy import ForeignKey
from sqlalchemy import Integer
from sqlalchemy import JSON
from sqlalchemy import String
from sqlalchemy import Text
from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column
from sqlalchemy.orm import relationship

from app.models.base import Base
from app.models.base import TimestampMixin
from app.models.enums import ScanStatus


class ScanResult(TimestampMixin, Base):
    __tablename__ = "scan_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    endpoint_id: Mapped[int | None] = mapped_column(
        ForeignKey("endpoint_registrations.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    target: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    status: Mapped[ScanStatus] = mapped_column(
        Enum(ScanStatus, name="scan_status"),
        default=ScanStatus.QUEUED,
        nullable=False,
    )
    scanner: Mapped[str] = mapped_column(String(64), default="nmap", nullable=False)
    open_ports_json: Mapped[list[dict] | None] = mapped_column(JSON, nullable=True)
    raw_output: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    endpoint = relationship("EndpointRegistration", back_populates="scan_results")
