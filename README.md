# SmartSeason

**SmartSeason** is a modern field monitoring system designed to track crop progress across multiple agricultural fields. Built for efficiency, it empowers agricultural coordinators and field agents to monitor growth stages, manage risks, and maintain detailed field history.

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)


---

## 🚀 Live Demo

- **Backend API:** [smartseason-cn2j.onrender.com](https://smartseason-cn2j.onrender.com)
- **API Documentation:** [smartseason-cn2j.onrender.com/docs](https://smartseason-cn2j.onrender.com/docs)

---

## ✨ Key Features

- **Field Management**: Track crop types, planting dates, and locations.
- **Computed Status**: Real-time status calculation (`Active`, `At Risk`, `Completed`) based on crop progression timelines.
- **Strict Progression**: Enforced stage flow (`Planted` → `Growing` → `Ready` → `Harvested`).
- **Role-Based Access**:
  - **Admins**: Full control over fields, agents, and analytics.
  - **Agents**: Direct field updates and note-taking for assigned locales.
- **Interactive Dashboard**: Visual analytics using Recharts.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | FastAPI (Python), SQLAlchemy, Alembic |
| **Database** | PostgreSQL |
| **Frontend** | React, Vite, TypeScript |
| **Styling** | Tailwind CSS, shadcn/ui |
| **Auth** | JWT (Access & Refresh Tokens) |

---

## 💻 Local Setup

### Backend
1. **Navigate & Environment**:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   ```
2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
3. **Configuration**:
   Copy `.env.example` to `.env` and fill in your database credentials and secret keys.
4. **Database Setup**:
   ```bash
   alembic upgrade head
   python seed.py
   ```
5. **Run Server**:
   ```bash
   uvicorn app.main:app --reload
   ```

### Frontend
1. **Navigate & Install**:
   ```bash
   cd frontend
   npm install
   ```
2. **Configuration**:
   Copy `.env.example` to `.env` and set `VITE_API_URL`.
3. **Run Development Server**:
   ```bash
   npm run dev
   ```

---

## 🔐 Demo Credentials

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@smartseason.app` | `Admin1234!` |
| **Agent** | `amara@smartseason.app` | `Agent1234!` |
| **Agent** | `juma@smartseason.app` | `Agent1234!` |
| **Agent** | `fatima@smartseason.app` | `Agent1234!` |

---

## 📝 Design Decisions

- **Computed Status**: Status is derived at query time from planting date and stage to ensure data freshness without database overhead.
- **Append-Only History**: Field updates are preserved in a dedicated log, ensuring an immutable audit trail of crop progression.
- **Role Enforcement**: Security is managed at the API layer via JWT claims; the UI adapts role-based visibility for a tailored experience.

---

Designed for the 2026 Growing Season.