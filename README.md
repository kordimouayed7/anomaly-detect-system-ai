# Windows Logs AI Anomaly Detection System

An end-to-end anomaly detection platform that collects Windows event logs in real-time, scores them using a trained Isolation Forest machine learning model, and presents the results through an interactive React dashboard. The system includes an integrated AI diagnostic assistant, automated email alerting, and full observability via Prometheus and Grafana.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Project Structure](#project-structure)
3. [Prerequisites](#prerequisites)
4. [Installation and Setup](#installation-and-setup)
   - [Database Setup](#1-database-setup)
   - [Backend Setup](#2-backend-setup)
   - [Frontend Setup](#3-frontend-setup)
5. [Running the System](#running-the-system)
   - [Start the Backend Server](#1-start-the-backend-server)
   - [Start the OS Agent](#2-start-the-os-agent)
   - [Start the Frontend](#3-start-the-frontend)
   - [Start Monitoring Stack (Docker)](#4-start-monitoring-stack-docker)
6. [Configuration](#configuration)
   - [Backend Environment Variables](#backend-environment-variables-backendenv)
   - [Agent Configuration](#agent-configuration-backendloganentyaml)
7. [API Endpoints](#api-endpoints)
   - [Authentication](#authentication)
   - [Projects](#projects)
   - [Logs](#logs)
   - [AI Diagnostics](#ai-diagnostics)
   - [Monitoring](#monitoring)
8. [Machine Learning Pipeline](#machine-learning-pipeline)
   - [Model Architecture](#model-architecture)
   - [Feature Engineering (25 Features)](#feature-engineering-25-features)
   - [ML Artifacts](#ml-artifacts)
   - [Scoring and Threshold](#scoring-and-threshold)
9. [OS Agent](#os-agent)
   - [Log Collection](#log-collection)
   - [Heuristic Pre-Filter](#heuristic-pre-filter)
   - [Offline Buffering](#offline-buffering)
10. [Notification System](#notification-system)
11. [Frontend Dashboard](#frontend-dashboard)
12. [Database Schema](#database-schema)
13. [Docker and Observability](#docker-and-observability)

---

## Architecture Overview

The system is composed of four independent components communicating over HTTP REST:

```
+------------------+        HTTP POST        +-------------------+
|                  | ----------------------> |                   |
|    OS Agent      |    (X-API-Key Header)   |   FastAPI Server  |
|  (os_agent.py)   |                         |    (main.py)      |
|                  | <---------------------- |                   |
+------------------+     200 OK / 403        +--------+----------+
  Runs on endpoint                                    |
  Windows machines                                    | SQLAlchemy ORM
                                                      v
                                              +-------+--------+
                                              |   PostgreSQL   |
                                              |  (pfe_project) |
                                              +-------+--------+
                                                      ^
                                                      |
                                              +-------+--------+
                                              | ML Service     |
                                              | (ml_service.py)|
                                              | Isolation Forest|
                                              +----------------+

+------------------+        HTTP GET         +-------------------+
|                  | ----------------------> |                   |
|  React Frontend  |    (Bearer JWT Token)   |   FastAPI Server  |
|  (Vite + React)  |                         |                   |
|                  | <---------------------- |                   |
+------------------+     JSON responses      +-------------------+

+------------------+        Scrape /metrics  +-------------------+
|   Prometheus     | ----------------------> |   FastAPI Server  |
|   + Grafana      |    (every 5 seconds)    |                   |
+------------------+                         +-------------------+
```

**Data Flow:**
1. The OS Agent reads Windows Application, System, and Security event logs.
2. Logs pass through a heuristic pre-filter that drops known-benign noise.
3. Remaining logs are batched and sent to the FastAPI server via HTTP POST with API key authentication.
4. The server stores the log in PostgreSQL, then sends it to the ML service as a background task.
5. The ML service constructs a 25-feature vector and runs it through the Isolation Forest model.
6. If the anomaly score falls below the threshold (`-0.0900`), the log is flagged as an anomaly and an email alert is sent.
7. If the log is normal, it is deleted from the database immediately.
8. The React frontend polls the server and displays only anomalies.

---

## Project Structure

```
project-root/
|
+-- backend/
|   +-- main.py                  # FastAPI application (all routes, lifespan, auth)
|   +-- ml_service.py            # ML inference engine (Isolation Forest scoring)
|   +-- feature_translator.py    # TF-IDF + SVD text vectorization bridge
|   +-- os_agent.py              # Windows event log collector agent
|   +-- models.py                # SQLAlchemy ORM models (UserDB, ProjectDB, LogDB)
|   +-- schemas.py               # Pydantic request/response schemas
|   +-- auth.py                  # JWT authentication (bcrypt hashing, token creation)
|   +-- init_db.py               # Database initialization and admin user seeding
|   +-- notifications.py         # SMTP email alert system with debounce throttling
|   +-- logagent.yaml            # Agent configuration (server URL, API key, intervals)
|   +-- .env                     # Environment variables (SMTP, API keys)
|   +-- docker-compose.yml       # Prometheus + Grafana stack
|   +-- prometheus.yml           # Prometheus scrape configuration
|   +-- local_buffer.db          # SQLite offline buffer (auto-created by agent)
|   +-- ml_artifacts/            # Pre-trained ML model files
|       +-- model_final.pkl      # Isolation Forest model
|       +-- scaler_final.pkl     # StandardScaler for feature normalization
|       +-- tfidf_final.pkl      # TF-IDF vectorizer for log message text
|       +-- svd_final.pkl        # Truncated SVD dimensionality reducer
|       +-- features_final.pkl   # Ordered feature name list (25 features)
|       +-- threshold_final.pkl  # Calibrated decision threshold
|
+-- frontend/
|   +-- index.html               # Entry point
|   +-- package.json             # Node.js dependencies
|   +-- vite.config.js           # Vite bundler configuration
|   +-- tailwind.config.js       # Tailwind CSS configuration
|   +-- src/
|       +-- App.jsx              # Root component with routing
|       +-- components/
|           +-- Navbar.jsx                  # Top navigation bar
|           +-- Sidebar.jsx                 # Side navigation menu
|           +-- DashboardView.jsx           # Main dashboard layout
|           +-- AnomaliesPage.jsx           # Anomaly list page
|           +-- AnomaliesTable.jsx          # Sortable anomaly data table
|           +-- AnomalySeverityDoughnut.jsx  # Doughnut chart: anomalies by severity
|           +-- AnomalyFrequencyChart.jsx   # Bar chart: anomaly frequency over time
|           +-- ErrorsLineChart.jsx         # Line chart: error trend over time
|           +-- LogDistributionDoughnut.jsx  # Doughnut chart: log level distribution
|           +-- KPICards.jsx                # Key performance indicator summary cards
|           +-- LogExplorerPage.jsx         # Full log search and exploration
|           +-- ProjectsPage.jsx            # Project management (create, revoke, rotate keys)
|           +-- AIDiagnosticAssistant.jsx   # AI-powered log analysis chat interface
|           +-- Beams.jsx                   # Animated background visual effect
```

---

## Prerequisites

Before starting, ensure the following are installed on your system:

| Software       | Version   | Purpose                                      |
|----------------|-----------|----------------------------------------------|
| Python         | 3.10+     | Backend server and OS agent                  |
| Node.js        | 18+       | Frontend build and development server        |
| PostgreSQL     | 14+       | Primary database                             |
| Docker Desktop | Latest    | Prometheus and Grafana monitoring (optional)  |
| Git            | Latest    | Version control                              |

The OS Agent (`os_agent.py`) requires **Windows 10/11** because it reads Windows Event Logs using the `pywin32` library.

---

## Installation and Setup

### 1. Database Setup

Create the PostgreSQL database:

```sql
CREATE DATABASE pfe_project;
```

The default connection string used by the application is:

```
postgresql://postgres:admin@localhost/pfe_project
```

If your PostgreSQL credentials differ, set the `DATABASE_URL` environment variable before running the server.

Initialize the database tables and seed the default admin user:

```bash
cd backend
python init_db.py
```

This creates all tables (`users`, `projects`, `logs`) and inserts a default admin account:
- Email: `admin@neopolis.com`
- Password: `admin123`

### 2. Backend Setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/Mac

# Install all Python dependencies
pip install fastapi uvicorn sqlalchemy psycopg2-binary python-jose bcrypt python-dotenv
pip install scikit-learn pandas numpy joblib
pip install pywin32 psutil pyyaml requests
pip install prometheus-fastapi-instrumentator slowapi
pip install python-multipart
```

### 3. Frontend Setup

```bash
cd frontend

# Install all Node.js dependencies
npm install
```

---

## Running the System

You need three terminals running simultaneously, plus an optional fourth for Docker.

### 1. Start the Backend Server

```bash
cd backend
uvicorn main:app --reload
```

The server starts at `http://localhost:8000`. The `--reload` flag enables automatic restart on file changes during development.

On startup, the server will:
- Create database tables if they do not exist.
- Load all ML artifacts into memory (`ml_artifacts/` directory).
- Start the automatic log cleanup background thread.
- Expose the `/metrics` endpoint for Prometheus.

### 2. Start the OS Agent

```bash
cd backend
python os_agent.py
```

The agent will:
- Load its configuration from `logagent.yaml`.
- Load its local ML brain from `translator.pkl` and `smart_agent_brain.pkl` (if available).
- Initialize cursors at the latest Windows event log record numbers.
- Begin streaming new events from the Application, System, and Security logs.
- Apply the heuristic pre-filter to drop known-benign noise.
- Batch and send remaining logs to the server every 5 seconds (or when batch size reaches 100).

### 3. Start the Frontend

```bash
cd frontend
npm run dev
```

The React development server starts at `http://localhost:5173`. Open this URL in your browser to access the dashboard.

### 4. Start Monitoring Stack (Docker)

```bash
cd backend
docker-compose up -d
```

This starts:
- **Prometheus** on `http://localhost:9090` — scrapes `/metrics` from the FastAPI server every 5 seconds.
- **Grafana** on `http://localhost:3000` — connect it to Prometheus as a data source to build custom dashboards. Default Grafana credentials: `admin` / `admin`.

---

## Configuration

### Backend Environment Variables (`backend/.env`)

| Variable         | Description                                    | Example                          |
|------------------|------------------------------------------------|----------------------------------|
| `SMTP_SERVER`    | SMTP server hostname for email alerts          | `smtp.gmail.com`                 |
| `SMTP_PORT`      | SMTP server port                               | `587`                            |
| `SMTP_USERNAME`  | Email account for sending alerts               | `user@gmail.com`                 |
| `SMTP_PASSWORD`  | App-specific password for the email account    | `abcdefghijklmnop`               |
| `ADMIN_EMAIL`    | Recipient email for anomaly alerts             | `admin@company.com`              |
| `GROK_API_KEY`   | xAI Grok API key for the AI diagnostic assistant (optional) | `xai-...`              |
| `DATABASE_URL`   | PostgreSQL connection string (optional override)| `postgresql://user:pass@host/db` |

### Agent Configuration (`backend/logagent.yaml`)

```yaml
server_url: http://localhost:8000/api/logs/ingest
api_key: YOUR_PROJECT_API_KEY_HERE
batch_size: 100
poll_interval_seconds: 5
flush_interval_seconds: 60
sqlite_db_path: local_buffer.db
```

| Field                    | Description                                                    |
|--------------------------|----------------------------------------------------------------|
| `server_url`             | Full URL to the FastAPI log ingest endpoint                    |
| `api_key`                | Project-specific API key (generated from the Projects page)     |
| `batch_size`             | Maximum logs per HTTP POST request                             |
| `poll_interval_seconds`  | How often (in seconds) the agent checks for new Windows events |
| `flush_interval_seconds` | Maximum wait time before sending a partial batch               |
| `sqlite_db_path`         | Local SQLite file used for offline buffering                   |

To obtain a valid `api_key`: log into the dashboard, navigate to the Projects page, create a new project, and copy the generated API key into this file.

---

## API Endpoints

All endpoints are served at `http://localhost:8000`.

### Authentication

| Method | Path           | Auth     | Description                              |
|--------|----------------|----------|------------------------------------------|
| POST   | `/api/login`   | None     | Login with email/password. Returns JWT.  |

Request body:
```json
{
  "email": "admin@neopolis.com",
  "password": "admin123"
}
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer"
}
```

All subsequent API calls require the `Authorization: Bearer <token>` header.

### Projects

| Method | Path                              | Auth    | Description                              |
|--------|-----------------------------------|---------|------------------------------------------|
| GET    | `/api/projects`                   | JWT     | List all projects                        |
| POST   | `/api/projects`                   | JWT     | Create a new project (auto-generates API key) |
| DELETE | `/api/projects/{id}`              | JWT     | Delete a project                         |
| POST   | `/api/projects/{id}/revoke`       | JWT     | Revoke a project's API key               |
| POST   | `/api/projects/{id}/unrevoke`     | JWT     | Reactivate a revoked API key             |
| POST   | `/api/projects/{id}/rotate`       | JWT     | Generate a new API key for the project   |

### Logs

| Method | Path                    | Auth        | Description                                         |
|--------|-------------------------|-------------|-----------------------------------------------------|
| POST   | `/api/logs/ingest`      | X-API-Key   | Ingest a batch of logs from the OS agent             |
| GET    | `/api/logs`             | JWT         | Query logs with pagination and filtering             |
| GET    | `/api/logs/export`      | JWT         | Export logs as CSV                                   |

Query parameters for `GET /api/logs`:

| Parameter      | Type    | Default | Description                              |
|----------------|---------|---------|------------------------------------------|
| `page`         | int     | 1       | Page number                              |
| `page_size`    | int     | 50      | Results per page                         |
| `anomaly_only` | bool    | false   | Return only anomaly-flagged logs         |
| `level`        | string  | null    | Filter by log level (ERROR, WARNING, etc)|
| `project_id`   | int     | null    | Filter by project                        |

### AI Diagnostics

| Method | Path              | Auth | Description                                    |
|--------|-------------------|------|------------------------------------------------|
| POST   | `/api/diagnose`   | JWT  | Send a raw log or question to the AI assistant |

Request body:
```json
{
  "raw_log": "S-1-5-21-xxx | ERROR | svchost.exe crashed with 0xc000006d"
}
```

### Monitoring

| Method | Path        | Auth | Description                                |
|--------|-------------|------|--------------------------------------------|
| GET    | `/metrics`  | None | Prometheus-compatible metrics endpoint     |

Exposed metrics include:
- `neopolis_anomalies_detected` — Counter of total anomalies detected by the ML model.
- Standard HTTP request duration, count, and status code metrics (auto-instrumented).

---

## Machine Learning Pipeline

### Model Architecture

The system uses **Isolation Forest**, an unsupervised anomaly detection algorithm from scikit-learn. Isolation Forest works by recursively partitioning data with random splits. Anomalies require fewer splits to isolate, producing lower anomaly scores.

### Feature Engineering (25 Features)

Each incoming log is transformed into a 25-dimensional floating-point vector before scoring:

| Category               | Features                                                                                          |
|------------------------|---------------------------------------------------------------------------------------------------|
| Binary indicator       | `is_error` (1 if level is ERROR, CRITICAL, or WARNING; 0 otherwise)                               |
| Sliding window counts  | `Errors_Last_30s`, `Errors_Last_1_Min`, `Errors_Last_5_Min`, `Errors_Last_10_Min`, `Errors_Last_15_Min`, `Errors_Last_60_Min` |
| Drift detection        | `CUSUM_Errors` (Cumulative Sum tracker for error frequency drift)                                  |
| Ratio features         | `Short_Long_Ratio` (1min/60min), `Mid_Long_Ratio` (15min/60min)                                   |
| Trend features         | `Error_Trend_Slope` (5min count minus 15min count, normalized)                                     |
| Density features       | `Error_Density_5Min`, `Error_Density_15Min`                                                       |
| Hardware velocity      | `CPU_Velocity`, `RAM_Velocity` (rate of change per minute)                                         |
| Cyclical time encoding | `Hour_sin`, `Hour_cos`, `Day_sin`, `Day_cos`                                                      |
| NLP text features      | TF-IDF vectorization of the log message text, reduced to components via Truncated SVD              |

All sliding window counts and hardware velocities are computed in-memory using `deque` data structures — no database queries are performed during inference.

### ML Artifacts

The pre-trained model files are stored in `backend/ml_artifacts/`:

| File                   | Description                                                  |
|------------------------|--------------------------------------------------------------|
| `model_final.pkl`      | Trained Isolation Forest model                               |
| `scaler_final.pkl`     | StandardScaler fitted on the training feature distributions   |
| `tfidf_final.pkl`      | TF-IDF vectorizer fitted on training log messages             |
| `svd_final.pkl`        | Truncated SVD model for dimensionality reduction of TF-IDF    |
| `features_final.pkl`   | Ordered list of the 25 feature names expected by the model    |
| `threshold_final.pkl`  | Calibrated threshold value                                    |

### Scoring and Threshold

- The model's `decision_function()` outputs a floating-point anomaly score for each log.
- The production threshold is set to `-0.0900`.
- Logs scoring **below** this threshold are classified as anomalies.
- Logs scoring **above** this threshold are classified as normal and are deleted from the database immediately.

---

## OS Agent

### Log Collection

The agent (`os_agent.py`) monitors three Windows event log channels:
- **Application** — Application crashes, errors, and informational messages.
- **System** — Kernel, driver, and service-level events.
- **Security** — Authentication attempts, privilege usage, and audit events.

It uses the `pywin32` library (`win32evtlog`) to read events sequentially, tracking the latest record number per log channel to avoid duplicates.

### Heuristic Pre-Filter

Before sending any log to the server, the agent runs it through `is_known_noise()`, a rule-based filter that drops known-benign Windows noise patterns. This reduces false positives and unnecessary network traffic.

Filtered patterns include:

| Pattern                               | Description                                                   |
|---------------------------------------|---------------------------------------------------------------|
| WidgetService legitimate paths        | Microsoft Store WidgetService with verified paths and arguments|
| NT AUTHORITY\SYSTEM routine logons    | Standard S-1-5-18 SYSTEM account privilege assignments         |
| svchost.exe SID enumeration           | Routine user account lookups by svchost.exe in WORKGROUP       |
| Builtin account enumeration           | Administrateur, Invité, DefaultAccount, Guest, WDAGUtilityAccount |
| WORKGROUP 0x2020 audit events         | Standard WORKGROUP audit logon type 0x2020                     |
| MicrosoftAccount login events         | Normal interactive logons via MicrosoftAccount credentials     |

Any log matching a known-benign pattern **but** originating from a suspicious filesystem path (e.g., `C:\Temp`, `AppData`, `Downloads`) is NOT filtered — it is forwarded to the ML model for scoring.

### Offline Buffering

If the backend server is unreachable, the agent does not lose logs. It stores unsent payloads in a local SQLite database (`local_buffer.db`). On each polling cycle, the agent attempts to replay buffered logs before processing new events. Successfully replayed logs are deleted from the local buffer.

---

## Notification System

When the ML model detects an anomaly, the `notifications.py` module sends an HTML-formatted email alert to the configured admin email address.

Features:
- **Debounce throttling**: A 5-minute cooldown per project prevents email spam during anomaly bursts. Only one email is sent per project within any 5-minute window.
- **SMTP via Gmail**: Configured through environment variables in `.env`. Uses TLS on port 587.
- **Simulation mode**: If SMTP credentials are not configured, alerts are printed to the console instead of being emailed.

---

## Frontend Dashboard

The frontend is built with React 19, Vite, Tailwind CSS, Chart.js, and Lucide icons.

| Page / Component             | Description                                                      |
|------------------------------|------------------------------------------------------------------|
| Dashboard                    | Overview with KPI cards, error trend line chart, and log distribution doughnut chart |
| Anomalies                    | Filtered view showing only anomaly-flagged logs with severity doughnut and frequency charts |
| Log Explorer                 | Full searchable log table with pagination, level filtering, and CSV export |
| Projects                     | Admin panel to create, delete, revoke, unrevoke, and rotate API keys for projects |
| AI Diagnostic Assistant      | Floating chat panel powered by generative AI for interactive log analysis |

The frontend communicates with the backend using `axios`. All API calls include the JWT token obtained at login via the `Authorization: Bearer <token>` header.

---

## Database Schema

### users

| Column          | Type     | Description                    |
|-----------------|----------|--------------------------------|
| id              | Integer  | Primary key                    |
| email           | String   | Unique admin email             |
| hashed_password | String   | bcrypt-hashed password         |
| is_active       | Boolean  | Account active status          |
| created_at      | DateTime | Account creation timestamp     |

### projects

| Column      | Type     | Description                          |
|-------------|----------|--------------------------------------|
| id          | Integer  | Primary key                          |
| name        | String   | Project display name                 |
| description | String   | Optional project description         |
| is_active   | Boolean  | Whether the project is active        |
| api_key     | String   | Unique API key for agent authentication |
| created_at  | DateTime | Project creation timestamp           |

### logs

| Column      | Type     | Description                                    |
|-------------|----------|------------------------------------------------|
| id          | Integer  | Primary key                                    |
| level       | String   | Log level (INFO, WARNING, ERROR, CRITICAL)     |
| message     | String   | Raw log message content                        |
| timestamp   | DateTime | When the event occurred                        |
| cpu_percent | Float    | CPU usage percentage at time of log capture     |
| ram_percent | Float    | RAM usage percentage at time of log capture     |
| project_id  | Integer  | Foreign key to the projects table               |
| is_anomaly  | Boolean  | Whether the ML model flagged this as an anomaly |

---

## Docker and Observability

The `docker-compose.yml` in the backend directory defines two monitoring services:

```yaml
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    depends_on:
      - prometheus
```

Prometheus is configured in `prometheus.yml` to scrape the FastAPI server's `/metrics` endpoint every 5 seconds:

```yaml
global:
  scrape_interval: 5s

scrape_configs:
  - job_name: 'fastapi_backend'
    static_configs:
      - targets: ['host.docker.internal:8000']
```

`host.docker.internal` allows the Docker container to access the FastAPI server running on the host machine's localhost.

To start:
```bash
cd backend
docker-compose up -d
```

To stop:
```bash
cd backend
docker-compose down
```

Access Grafana at `http://localhost:3000`, add Prometheus (`http://prometheus:9090`) as a data source, and build dashboards to visualize request rates, anomaly detection counts, and response latencies.
