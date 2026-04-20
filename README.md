# SmartSeason Field Monitoring System

## Live Demo
- Frontend: https://smartseason.vercel.app
- API Base: https://smartseason-api.railway.app

## Demo Credentials
| Role  | Email                      | Password    |
|-------|----------------------------|-------------|
| Admin | admin@smartseason.app      | Admin1234!  |
| Agent | amara@smartseason.app      | Agent1234!  |
| Agent | juma@smartseason.app       | Agent1234!  |
| Agent | fatima@smartseason.app     | Agent1234!  |

## Local Setup

### Backend
```bash
cd backend
python -m venv venv
source venv/Scripts/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # fill in your values
alembic upgrade head
python seed.py
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env      # set VITE_API_URL
npm run dev
```

## Design Decisions

- **Status is computed at query time**, not stored in the database, to prevent stale data. It is derived from the field's stage and planting date against expected crop progression timelines.
- **Stage changes are append-only and can only move forward** (planted → growing → ready → harvested). This preserves the integrity of the field update history log.
- **Role enforcement is at the API layer** via JWT claims — frontend routing is UX only, not a security boundary.
- **No pagination** — the MVP returns all records. This is intentional for simplicity at this scale.
- **Field agents cannot create or delete fields** — they can only update stage and add notes on fields assigned to them.

## Assumptions
- A field must start in the "planted" stage — no other stage is valid on creation.
- Admins are created manually (seeded) — there is no self-registration flow.
- All timestamps are stored and returned in UTC.
