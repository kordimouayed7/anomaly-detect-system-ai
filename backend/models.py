import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class UserDB(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    name = Column(String, nullable=True, default="Admin")
    alert_email = Column(String, nullable=True, default="admin@neopolis.com")
    avatar = Column(String, nullable=True, default=None)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.datetime.now(datetime.timezone.utc),
    )


class ProjectDB(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    user_email = Column(String, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    api_key = Column(String, unique=True, nullable=False, index=True)
    created_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.datetime.now(datetime.timezone.utc),
    )


class LogDB(Base):
    __tablename__ = "logs"

    id = Column(Integer, primary_key=True, index=True)
    level = Column(String, index=True, nullable=False)
    message = Column(String, nullable=False)
    timestamp = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.datetime.now(datetime.timezone.utc),
        index=True,
    )
    cpu_percent = Column(Float, nullable=True)
    ram_percent = Column(Float, nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True, index=True)
    is_anomaly = Column(Boolean, nullable=False, default=False, index=True)


class NotificationDB(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    level = Column(String, nullable=True, default="info")
    project_name = Column(String, nullable=True)
    is_read = Column(Boolean, nullable=False, default=False, index=True)
    created_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.datetime.now(datetime.timezone.utc),
        index=True,
    )
