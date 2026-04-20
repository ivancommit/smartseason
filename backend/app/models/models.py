from sqlalchemy import Column, String, Date, Text, ForeignKey, TIMESTAMP, text, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(10), nullable=False)
    created_at = Column(TIMESTAMP, nullable=False, server_default=text("NOW()"))

    __table_args__ = (
        CheckConstraint("role IN ('admin', 'agent')", name="role_check"),
    )

class Field(Base):
    __tablename__ = "fields"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    name = Column(String(150), nullable=False)
    crop_type = Column(String(100), nullable=False)
    planting_date = Column(Date, nullable=False)
    stage = Column(String(20), nullable=False)
    location = Column(String(200))
    assigned_agent_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    created_at = Column(TIMESTAMP, nullable=False, server_default=text("NOW()"))
    updated_at = Column(TIMESTAMP, nullable=False, server_default=text("NOW()"))

    assigned_agent = relationship("User", foreign_keys=[assigned_agent_id])
    updates = relationship("FieldUpdate", back_populates="field", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("stage IN ('planted', 'growing', 'ready', 'harvested')", name="stage_check"),
    )

class FieldUpdate(Base):
    __tablename__ = "field_updates"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    field_id = Column(UUID(as_uuid=True), ForeignKey("fields.id", ondelete="CASCADE"), nullable=False)
    agent_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    note = Column(Text, nullable=False)
    stage = Column(String(20), nullable=False)
    created_at = Column(TIMESTAMP, nullable=False, server_default=text("NOW()"))

    field = relationship("Field", back_populates="updates")
    agent = relationship("User", foreign_keys=[agent_id])
