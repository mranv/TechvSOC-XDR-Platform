from sqlalchemy import Boolean
from sqlalchemy import Enum
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
from app.models.enums import RuleType


class DetectionRule(TimestampMixin, Base):
    __tablename__ = "detection_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    rule_type: Mapped[RuleType] = mapped_column(
        Enum(RuleType, name="rule_type"),
        nullable=False,
    )
    pattern: Mapped[str] = mapped_column(Text, nullable=False)
    condition_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    severity: Mapped[AlertSeverity] = mapped_column(
        Enum(AlertSeverity, name="alert_severity"),
        default=AlertSeverity.MEDIUM,
        nullable=False,
    )
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    alerts = relationship("Alert", back_populates="rule")
