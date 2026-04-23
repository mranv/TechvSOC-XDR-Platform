from datetime import datetime

from sqlalchemy import DateTime
from sqlalchemy import Float
from sqlalchemy import ForeignKey
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column
from sqlalchemy.orm import relationship

from app.models.base import Base
from app.models.base import TimestampMixin


class EndpointMetric(TimestampMixin, Base):
    __tablename__ = "endpoint_metrics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    endpoint_id: Mapped[int] = mapped_column(
        ForeignKey("endpoint_registrations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    cpu_usage: Mapped[float] = mapped_column(Float, nullable=False)
    memory_usage: Mapped[float] = mapped_column(Float, nullable=False)
    disk_usage: Mapped[float] = mapped_column(Float, nullable=False)
    uptime_seconds: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    process_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    metric_source: Mapped[str] = mapped_column(String(64), default="agent", nullable=False)
    collected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    endpoint = relationship("EndpointRegistration", back_populates="metrics")
