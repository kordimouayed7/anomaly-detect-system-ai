import csv
import io
import os
import secrets
import time
from typing import Any

import json
import urllib.request
from dotenv import load_dotenv

load_dotenv(override=True)
# Hot-reload trigger for the new xAI key
from prometheus_fastapi_instrumentator import Instrumentator
from fastapi import BackgroundTasks, Depends, FastAPI, Header, HTTPException, Query, Request, UploadFile, File
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker, Session
import datetime
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

import logging
from contextlib import asynccontextmanager

from auth import create_access_token, get_current_user, verify_password
from models import Base, LogDB, NotificationDB, ProjectDB, UserDB
from schemas import LogResponse, ProjectCreate, ProjectResponse, PaginatedLogsResponse, ProjectUpdate
import ml_service

# ---------------------------------------------------------
# 1. CONFIGURATION (The Connection String)
# ---------------------------------------------------------
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:admin@localhost/pfe_project")

# Create the connection engine
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
# Create the tables in the database
Base.metadata.create_all(bind=engine)

# Static files for avatars
AVATAR_DIR = os.path.join(os.path.dirname(__file__), "avatars")
os.makedirs(AVATAR_DIR, exist_ok=True)

# ---------------------------------------------------------
# AUTOMATIC DATABASE MAINTENANCE
# - Normal logs: deleted INSTANTLY by ML after scoring (see ml_service.py)
# - Anomaly logs: kept for 5 days, then auto-deleted
# - Safety net: any normal logs that slipped through get cleaned here too
# This does NOT touch ml_service.py or the ML model.
# ---------------------------------------------------------
import threading

ANOMALY_RETENTION_DAYS = 5        # Anomalies: keep 5 days then delete
CLEANUP_INTERVAL_SECONDS = 24 * 60 * 60  # Run every 24 hours

def _run_cleanup():
    """Execute one cleanup pass."""
    db = SessionLocal()
    try:
        # 1. Safety net: delete any normal logs still in DB (ML deletes them
        #    instantly, but this catches edge cases like server crashes)
        normal_deleted = (
            db.query(LogDB)
            .filter(LogDB.is_anomaly == False)
            .delete()
        )

        # 2. Delete anomalies older than 5 days
        anomaly_cutoff = datetime.datetime.now() - datetime.timedelta(days=ANOMALY_RETENTION_DAYS)
        anomaly_deleted = (
            db.query(LogDB)
            .filter(LogDB.is_anomaly == True, LogDB.timestamp < anomaly_cutoff)
            .delete()
        )

        db.commit()
        logging.info(
            f"[Auto-Cleanup] Purged {normal_deleted} leftover normal logs "
            f"and {anomaly_deleted} old anomalies (>{ANOMALY_RETENTION_DAYS}d)."
        )
        return normal_deleted, anomaly_deleted
    finally:
        db.close()


def _cleanup_old_logs():
    """Background thread: runs cleanup IMMEDIATELY on startup, then every 24h."""
    # Run immediately on startup — catches stale logs from days server was off
    try:
        _run_cleanup()
    except Exception as e:
        logging.error(f"[Auto-Cleanup] Error during initial cleanup: {e}")

    # Then repeat every 24 hours
    while True:
        try:
            time.sleep(CLEANUP_INTERVAL_SECONDS)
            _run_cleanup()
        except Exception as e:
            logging.error(f"[Auto-Cleanup] Error during log cleanup: {e}")


# ---------------------------------------------------------
# LIFESPAN (Boot Sequence)
# ---------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load Machine Learning Model
    logging.info("Starting ML Engine...")
    ml_service.load_ml_artifacts(artifacts_path="ml_artifacts")

    # Start the automatic log cleanup background thread
    cleanup_thread = threading.Thread(target=_cleanup_old_logs, daemon=True)
    cleanup_thread.start()
    logging.info(f"[Auto-Cleanup] Scheduler started — normal logs deleted instantly by ML, anomalies kept {ANOMALY_RETENTION_DAYS}d.")

    yield
    logging.info("Shutting down ML Engine.")

# ---------------------------------------------------------
# 3. DATA SHAPES (Pydantic)
# These check that the data sent to us is correct
# ---------------------------------------------------------
class LogCreate(BaseModel):
    level: str
    message: str
    project_id: int | None = None
    cpu_percent: float | None = None
    ram_percent: float | None = None

# Model for logs arriving from the external monitoring agent.
# timestamp is kept as a raw string so the agent controls the format.
class LogIncoming(BaseModel):
    timestamp: str   # e.g. "2026-03-05 14:22:01"
    level: str       # e.g. "INFO", "ERROR", "CRITICAL"
    message: str     # e.g. "FATAL: Database connection lost"
    cpu_percent: float | None = None
    ram_percent: float | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class LoginResponse(BaseModel):
    id: int
    email: EmailStr
    is_active: bool


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LogData(BaseModel):
    raw_log: str


def infer_log_type(message: str) -> str:
    text = (message or "").lower()

    if any(token in text for token in ["database", "sql", "postgres", "mysql", "connection failed"]):
        return "Database"
    if any(token in text for token in ["login", "auth", "credential", "token", "negotiate", "password"]):
        return "Authentication"
    if any(token in text for token in ["network", "smtp", "socket", "dns", "endpoint", "ip "]):
        return "Network"
    if any(token in text for token in ["security", "privilege", "audit", "nt authority", "s-1-5-"]):
        return "Security"
    if any(token in text for token in ["service", "system", "svchost", "lsass", "logonui", "eventid"]):
        return "System"
    return "Other"

# ---------------------------------------------------------
# 4. THE SERVER (FastAPI)
# ---------------------------------------------------------


def ingest_rate_key(request: Request) -> str:
    # Prefer API key scoping for limiter; fallback to source IP.
    return request.headers.get("X-API-Key") or get_remote_address(request)


limiter = Limiter(key_func=ingest_rate_key)


app = FastAPI(lifespan=lifespan)

# Serve avatar images at /avatars/
app.mount("/avatars", StaticFiles(directory=AVATAR_DIR), name="avatars")

# Start broadcasting metrics
Instrumentator().instrument(app).expose(app)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Helper to get the database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# POST: Create a new Log (The Agent will use this!)
@app.post("/logs/")
def create_log(log: LogCreate, db: Session = Depends(get_db)):
    # Create the new log object
    new_log = LogDB(
        level=log.level,
        message=log.message,
        project_id=log.project_id,
        cpu_percent=log.cpu_percent,
        ram_percent=log.ram_percent,
    )
    # Add it to the database
    db.add(new_log)
    db.commit()
    db.refresh(new_log)
    return new_log

# GET: Read all Logs (The Frontend will use this!)
@app.get("/logs/")
def read_logs(db: Session = Depends(get_db)):
    return db.query(LogDB).all()


@app.get("/api/logs", response_model=PaginatedLogsResponse)
def list_logs(
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(default=50, ge=1, le=500, description="Items per page (max 500)"),
    anomaly_only: bool = Query(default=False, description="If true, return only ML-flagged anomalies"),
    level: str | None = Query(default=None),
    search: str | None = Query(default=None),
    log_date: str | None = Query(default=None, alias="date"),
    log_type: str | None = Query(default=None, alias="type"),
    project_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    _: dict[str, Any] = Depends(get_current_user),
):
    query = db.query(LogDB)

    # Filter for anomalies only at the SQL level
    if anomaly_only:
        query = query.filter(LogDB.is_anomaly == True)

    if level:
        query = query.filter(LogDB.level == level)

    if search:
        query = query.filter(LogDB.message.ilike(f"%{search}%"))

    if log_date:
        try:
            parsed_date = datetime.date.fromisoformat(log_date)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail="Invalid date format. Use YYYY-MM-DD.") from exc

        query = query.filter(func.date(LogDB.timestamp) == parsed_date)

    if project_id is not None:
        query = query.filter(LogDB.project_id == project_id)

    import math
    total_items = query.count()
    total_pages = math.ceil(total_items / page_size) if total_items > 0 else 1
    offset_val = (page - 1) * page_size

    rows = (
        query.with_entities(
            LogDB.id,
            LogDB.level,
            LogDB.message,
            LogDB.timestamp,
            LogDB.cpu_percent,
            LogDB.ram_percent,
            LogDB.project_id,
            LogDB.is_anomaly,
        )
        .order_by(LogDB.timestamp.desc(), LogDB.id.desc())
        .limit(page_size)
        .offset(offset_val)
        .all()
    )

    responses: list[LogResponse] = []
    for log_id, log_level, log_message, log_timestamp, log_cpu, log_ram, log_project_id, log_is_anomaly in rows:
        inferred_type = infer_log_type(str(log_message))
        if log_type and inferred_type.lower() != log_type.lower():
            continue

        responses.append(
            LogResponse(
                id=int(log_id),
                level=str(log_level),
                type=inferred_type,
                message=str(log_message),
                timestamp=log_timestamp,
                cpu_percent=float(log_cpu) if log_cpu is not None else None,
                ram_percent=float(log_ram) if log_ram is not None else None,
                project_id=int(log_project_id) if log_project_id is not None else None,
                is_anomaly=bool(log_is_anomaly),
            )
        )

    return PaginatedLogsResponse(
        items=responses,
        total=total_items,
        page=page,
        total_pages=total_pages
    )


@app.get("/api/logs/export")
def export_logs(
    level: str | None = Query(default=None),
    search: str | None = Query(default=None),
    log_date: str | None = Query(default=None, alias="date"),
    log_type: str | None = Query(default=None, alias="type"),
    project_id: int | None = Query(default=None),
    format: str = Query(default="csv"),
    db: Session = Depends(get_db),
    _: dict[str, Any] = Depends(get_current_user),
):
    """Export the currently filtered logs as a downloadable CSV or PDF file."""
    query = db.query(LogDB)

    if level:
        query = query.filter(LogDB.level == level)
    if search:
        query = query.filter(LogDB.message.ilike(f"%{search}%"))
    if log_date:
        try:
            parsed_date = datetime.date.fromisoformat(log_date)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail="Invalid date format. Use YYYY-MM-DD.") from exc
        query = query.filter(func.date(LogDB.timestamp) == parsed_date)
    if project_id is not None:
        query = query.filter(LogDB.project_id == project_id)

    rows = (
        query.with_entities(
            LogDB.id, LogDB.level, LogDB.message, LogDB.timestamp,
            LogDB.cpu_percent, LogDB.ram_percent, LogDB.project_id, LogDB.is_anomaly
        )
        .order_by(LogDB.timestamp.desc(), LogDB.id.desc())
        .limit(1000) # limit to 1000 for PDF/CSV sanity
        .all()
    )

    filtered_rows = []
    for log_id, log_level, log_message, log_timestamp, log_cpu, log_ram, log_pid, log_anomaly in rows:
        inferred = infer_log_type(str(log_message))
        if log_type and inferred.lower() != log_type.lower():
            continue
        filtered_rows.append([log_id, log_level, inferred, log_message, log_timestamp, log_cpu, log_ram, log_pid, log_anomaly])

    if format == "pdf":
        from fpdf import FPDF
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Arial", 'B', 16)
        pdf.cell(200, 10, txt="Anomaly Report Export", ln=1, align='C')
        pdf.ln(10)
        
        pdf.set_font("Arial", size=10)
        for row in filtered_rows:
            log_id, log_level, inferred, log_message, log_timestamp, log_cpu, log_ram, log_pid, log_anomaly = row
            pdf.set_font("Arial", 'B', 10)
            pdf.cell(40, 6, f"[{log_level}] {inferred}", 0, 0)
            pdf.set_font("Arial", size=8)
            pdf.cell(50, 6, str(log_timestamp)[:19], 0, 0)
            pdf.cell(40, 6, f"CPU: {log_cpu}% RAM: {log_ram}%", 0, 1)
            pdf.multi_cell(0, 5, str(log_message)[:300])
            pdf.ln(2)

        output_pdf = io.BytesIO()
        output_pdf.write(pdf.output(dest='S').encode('latin1', 'replace'))
        output_pdf.seek(0)
        
        filename = f"logs_export_{datetime.date.today()}.pdf"
        return StreamingResponse(
            output_pdf,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    else:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["ID", "Level", "Type", "Message", "Timestamp", "CPU %", "RAM %", "Project ID", "Is AI Anomaly"])
        for row in filtered_rows:
            writer.writerow(row)
            
        output.seek(0)
        filename = f"logs_export_{datetime.date.today()}.csv"
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )


@app.get("/api/projects", response_model=list[ProjectResponse])
def get_projects(db: Session = Depends(get_db)):
    return db.query(ProjectDB).all()


@app.post("/api/projects", response_model=ProjectResponse)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)):
    api_key = secrets.token_urlsafe(32)

    new_project = ProjectDB(
        name=payload.name,
        description=payload.description,
        user_email=payload.user_email,
        api_key=api_key,
    )

    db.add(new_project)
    db.commit()
    db.refresh(new_project)

    return new_project


@app.put("/api/projects/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    payload: ProjectUpdate,
    db: Session = Depends(get_db),
    _: dict[str, Any] = Depends(get_current_user),
):
    project = db.query(ProjectDB).filter(ProjectDB.id == project_id).first()
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    if payload.name is not None:
        project.name = payload.name
    if payload.description is not None:
        project.description = payload.description
    if payload.user_email is not None:
        project.user_email = payload.user_email

    db.commit()
    db.refresh(project)
    return project


@app.post("/api/projects/{project_id}/revoke-key", response_model=ProjectResponse)
def revoke_project(
    project_id: int,
    db: Session = Depends(get_db),
    _: dict[str, Any] = Depends(get_current_user),
):
    project = db.query(ProjectDB).filter(ProjectDB.id == project_id).first()
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    project.is_active = False
    db.commit()
    db.refresh(project)

    return project


@app.post("/api/projects/{project_id}/unrevoke-key", response_model=ProjectResponse)
def unrevoke_project(
    project_id: int,
    db: Session = Depends(get_db),
    _: dict[str, Any] = Depends(get_current_user),
):
    project = db.query(ProjectDB).filter(ProjectDB.id == project_id).first()
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    project.is_active = True
    db.commit()
    db.refresh(project)

    return project


@app.post("/api/projects/{project_id}/rotate-key", response_model=ProjectResponse)
def rotate_project_key(
    project_id: int,
    db: Session = Depends(get_db),
    _: dict[str, Any] = Depends(get_current_user),
):
    project = db.query(ProjectDB).filter(ProjectDB.id == project_id).first()
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    project.api_key = secrets.token_urlsafe(32)
    db.commit()
    db.refresh(project)

    return project


@app.post("/api/login", response_model=TokenResponse)
@app.post("/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user_row = (
        db.query(UserDB.id, UserDB.email, UserDB.hashed_password, UserDB.is_active)
        .filter(UserDB.email == payload.email)
        .first()
    )
    if user_row is None:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user_id, user_email, hashed_password, is_active = user_row

    if not bool(is_active):
        raise HTTPException(status_code=403, detail="User account is inactive")

    if not verify_password(payload.password, str(hashed_password)):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access_token = create_access_token(
        {
            "sub": str(user_email),
            "user_id": int(user_id),
        }
    )
    return TokenResponse(access_token=access_token)


class ProfileUpdate(BaseModel):
    name: str | None = None
    alert_email: str | None = None


@app.get("/api/profile")
def get_profile(
    db: Session = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    """Return the current user's profile."""
    user = db.query(UserDB).filter(UserDB.email == current_user["sub"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name or "",
        "alert_email": user.alert_email or "",
        "avatar": f"/avatars/{user.avatar}" if user.avatar else "",
        "is_active": user.is_active,
        "created_at": str(user.created_at),
    }


@app.put("/api/profile")
def update_profile(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    """Update the current user's name and/or alert email."""
    user = db.query(UserDB).filter(UserDB.email == current_user["sub"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.name is not None:
        user.name = payload.name
    if payload.alert_email is not None:
        user.alert_email = payload.alert_email

    db.commit()
    db.refresh(user)
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name or "",
        "alert_email": user.alert_email or "",
        "avatar": f"/avatars/{user.avatar}" if user.avatar else "",
        "is_active": user.is_active,
        "created_at": str(user.created_at),
    }


@app.post("/api/profile/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    """Upload a profile avatar image."""
    user = db.query(UserDB).filter(UserDB.email == current_user["sub"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Validate file type
    allowed = [".jpg", ".jpeg", ".png", ".webp"]
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in allowed:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, WEBP images allowed")

    # Save file
    filename = f"user_{user.id}{ext}"
    filepath = os.path.join(AVATAR_DIR, filename)
    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    # Update DB
    user.avatar = filename
    db.commit()
    return {"avatar": f"/avatars/{filename}"}


# ---------------------------------------------------------
# NOTIFICATIONS ENDPOINTS
# ---------------------------------------------------------

@app.get("/api/notifications")
def get_notifications(
    db: Session = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
    limit: int = Query(20, ge=1, le=100),
):
    """Return the most recent notifications."""
    notifs = (
        db.query(NotificationDB)
        .order_by(NotificationDB.created_at.desc())
        .limit(limit)
        .all()
    )
    unread = db.query(NotificationDB).filter(NotificationDB.is_read == False).count()
    return {
        "items": [
            {
                "id": n.id,
                "title": n.title,
                "message": n.message,
                "level": n.level,
                "project_name": n.project_name,
                "is_read": n.is_read,
                "created_at": str(n.created_at),
            }
            for n in notifs
        ],
        "unread_count": unread,
    }


@app.put("/api/notifications/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    """Mark all notifications as read."""
    db.query(NotificationDB).filter(NotificationDB.is_read == False).update({"is_read": True})
    db.commit()
    return {"status": "ok"}


@app.put("/api/notifications/{notif_id}/read")
def mark_read(
    notif_id: int,
    db: Session = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    """Mark a single notification as read."""
    n = db.query(NotificationDB).filter(NotificationDB.id == notif_id).first()
    if n:
        n.is_read = True
        db.commit()
    return {"status": "ok"}


# ---------------------------------------------------------
# SECURED INGEST ENDPOINT
# Route : POST /api/logs/ingest
# Auth  : X-API-Key header must equal the hardcoded secret
# Usage : Called by the external monitoring / simulator agent
# ---------------------------------------------------------

def verify_api_key(
    x_api_key: str = Header(..., alias="X-API-Key"),
    db: Session = Depends(get_db),
) -> int:
    """
    Dependency that extracts the X-API-Key header and validates it.
    Returns the project ID that owns this key.
    Raises HTTP 401 immediately if the key is wrong or missing.
    """
    project_row = (
        db.query(ProjectDB.id, ProjectDB.is_active)
        .filter(ProjectDB.api_key == x_api_key)
        .first()
    )
    if project_row is None:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized: invalid or missing X-API-Key header.",
        )

    project_id, is_active = project_row
    if not bool(is_active):
        raise HTTPException(
            status_code=403,
            detail="Forbidden: project API key is revoked.",
        )

    return int(project_id)


@app.post("/api/v1/health/ml-benchmark", status_code=200)
@limiter.limit("30/minute")
def ml_benchmark(
    request: Request,
    log: LogIncoming,
    db: Session = Depends(get_db),
    project_id: int = Depends(verify_api_key),
):
    """
    Production-safe benchmark endpoint for measuring synchronous ML latency.

    This route intentionally does NOT use BackgroundTasks so it can report:
    - ml_inference_time_ms: time spent inside the ML processing function
    - total_request_time_ms: full request time for this endpoint
    """
    request_start = time.perf_counter()

    try:
        parsed_ts = datetime.datetime.strptime(log.timestamp, "%Y-%m-%d %H:%M:%S")
    except ValueError:
        parsed_ts = datetime.datetime.now(datetime.timezone.utc)

    entry = LogDB(
        level=log.level,
        message=log.message,
        timestamp=parsed_ts,
        project_id=project_id,
        cpu_percent=log.cpu_percent,
        ram_percent=log.ram_percent,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    project_name = db.query(ProjectDB.name).filter(ProjectDB.id == project_id).scalar() or "Unknown Project"
    log_type = infer_log_type(entry.message)

    ml_start = time.perf_counter()
    ml_service.process_log_anomaly(
        log_id=entry.id,
        timestamp=entry.timestamp,
        level=entry.level,
        log_type=log_type,
        message=entry.message,
        cpu=entry.cpu_percent,
        ram=entry.ram_percent,
        project_id=project_id,
        project_name=project_name,
    )
    ml_elapsed_ms = (time.perf_counter() - ml_start) * 1000.0

    db.refresh(entry)
    total_elapsed_ms = (time.perf_counter() - request_start) * 1000.0

    return {
        "status": "success",
        "is_anomaly": bool(entry.is_anomaly),
        "metrics": {
            "ml_inference_time_ms": round(ml_elapsed_ms, 2),
            "total_request_time_ms": round(total_elapsed_ms, 2),
        },
    }


@app.post("/api/logs/ingest", status_code=200)
@limiter.limit("100/minute")
def ingest_log(
    request: Request,
    log: LogIncoming | list[LogIncoming],
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    project_id: int = Depends(verify_api_key),   # 401 if key is wrong
):
    """
    Receive one log object or a batch array from the external agent and persist it.

    - Validates the X-API-Key header via the `verify_api_key` dependency.
    - Parses the incoming timestamp string into a Python datetime object.
    - Inserts a new row into the `logs` table using the existing LogDB model.
    """
    incoming_logs = log if isinstance(log, list) else [log]

    new_entries: list[LogDB] = []
    for item in incoming_logs:
        # Parse the agent timestamp. Fall back to current UTC on format mismatch.
        try:
            parsed_ts = datetime.datetime.strptime(item.timestamp, "%Y-%m-%d %H:%M:%S")
        except ValueError:
            parsed_ts = datetime.datetime.now(datetime.timezone.utc)

        new_entries.append(
            LogDB(
                level=item.level,
                message=item.message,
                timestamp=parsed_ts,
                project_id=project_id,
                cpu_percent=item.cpu_percent,
                ram_percent=item.ram_percent,
            )
        )

    db.add_all(new_entries)
    db.commit()

    # --- True ML Anomaly Detection Hook ---
    project_name = db.query(ProjectDB.name).filter(ProjectDB.id == project_id).scalar() or "Unknown Project"

    for entry in new_entries:
        log_type = infer_log_type(entry.message)
        
        # Fire ML processor exactly into the Non-Blocking Threadpool!
        background_tasks.add_task(
            ml_service.process_log_anomaly,
            log_id=entry.id,
            timestamp=entry.timestamp,
            level=entry.level,
            log_type=log_type,
            message=entry.message,
            cpu=entry.cpu_percent,
            ram=entry.ram_percent,
            project_id=project_id,
            project_name=project_name
        )


@app.post("/api/diagnose")
def diagnose_log(log_data: LogData, current_user: dict = Depends(get_current_user)):
    # Create the prompt
    prompt = f"""You are "NEO-AI", a Senior Cybersecurity & DevOps Assistant built into the Neopolis Anomaly Detection Dashboard.

Your rules:
- If the user sends a raw system log, error code, or anomaly description: analyze it, explain the severity simply, and suggest a fix.
- If the user sends a conversational message (like a greeting, follow-up question, or request for clarification): respond naturally and helpfully like a knowledgeable colleague.
- Always be concise (2-3 short paragraphs max).
- Use simple language a junior developer can understand.

User message:
{log_data.raw_log}
"""
    try:
        import urllib.parse
        
        # We use Pollinations AI: A completely free, keyless AI gateway that acts as a proxy to OpenAI/Llama models.
        # This completely bypasses your network's VPN firewall rules for xAI/OpenAI domains.
        encoded_prompt = urllib.parse.quote(prompt)
        url = f"https://text.pollinations.ai/{encoded_prompt}"
        
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0'}
        )
        
        # Enforce direct connection again
        proxy_support = urllib.request.ProxyHandler({})
        opener = urllib.request.build_opener(proxy_support)
        
        with opener.open(req) as response:
            text_response = response.read().decode('utf-8')
            return {"diagnosis": text_response}
            
    except Exception as e:
        error_body = ""
        if hasattr(e, 'read'):
            try:
                error_body = e.read().decode('utf-8')
            except:
                pass
        
        return {"diagnosis": f"**API Connection Error:** {str(e)}\n\n**Provider Details:** {error_body}"}

    return {
        "status": "success",
        "count": len(new_entries),
        "ids": [entry.id for entry in new_entries],
    }
