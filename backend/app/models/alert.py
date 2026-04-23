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
from app.models.enums import AlertSeverity
from app.models.enums import AlertStatus


class Alert(TimestampMixin, Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[AlertSeverity] = mapped_column(
        Enum(AlertSeverity, name="alert_severity", create_type=False),
        nullable=False,
    )
    status: Mapped[AlertStatus] = mapped_column(
        Enum(AlertStatus, name="alert_status"),
        default=AlertStatus.OPEN,
        nullable=False,
    )
    endpoint_id: Mapped[int | None] = mapped_column(
        ForeignKey("endpoint_registrations.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    log_entry_id: Mapped[int | None] = mapped_column(
        ForeignKey("log_entries.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    rule_id: Mapped[int | None] = mapped_column(
        ForeignKey("detection_rules.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    owner_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    source: Mapped[str] = mapped_column(String(64), default="detection_engine", nullable=False)
    timeline_json: Mapped[list[dict] | None] = mapped_column(JSON, nullable=True)
    triggered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    endpoint = relationship("EndpointRegistration", back_populates="alerts")
    log_entry = relationship("LogEntry", back_populates="alerts")
    rule = relationship("DetectionRule", back_populates="alerts")
    owner = relationship("User", back_populates="alerts")
