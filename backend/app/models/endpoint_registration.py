from sqlalchemy import Boolean
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import Text
from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column
from sqlalchemy.orm import relationship

from app.models.base import Base
from app.models.base import TimestampMixin


class EndpointRegistration(TimestampMixin, Base):
    __tablename__ = "endpoint_registrations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    hostname: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    ip_address: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    operating_system: Mapped[str] = mapped_column(String(255), nullable=False)
    agent_version: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="online", nullable=False)
    last_seen_ip: Mapped[str | None] = mapped_column(String(64), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    metrics = relationship("EndpointMetric", back_populates="endpoint")
    logs = relationship("LogEntry", back_populates="endpoint")
    alerts = relationship("Alert", back_populates="endpoint")
    scan_results = relationship("ScanResult", back_populates="endpoint")
