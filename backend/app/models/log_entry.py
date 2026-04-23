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
from app.models.enums import LogLevel


class LogEntry(TimestampMixin, Base):
    __tablename__ = "log_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    endpoint_id: Mapped[int | None] = mapped_column(
        ForeignKey("endpoint_registrations.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    source: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    event_type: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    severity: Mapped[LogLevel] = mapped_column(
        Enum(LogLevel, name="log_level"),
        default=LogLevel.INFO,
        nullable=False,
    )
    message: Mapped[str] = mapped_column(Text, nullable=False)
    raw_log: Mapped[str] = mapped_column(Text, nullable=False)
    event_timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        index=True,
        nullable=False,
    )
    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    endpoint = relationship("EndpointRegistration", back_populates="logs")
    alerts = relationship("Alert", back_populates="log_entry")
