# SmartSeason Field Monitoring System — Complete Build Brief

> **Read this entire document before writing a single line of code.**
> Every decision is already made. Your job is to implement exactly what is described here.
> When in doubt, do less, not more. Do not add features not listed.

---

## 1. What You Are Building

A web application called **SmartSeason** for tracking crop progress across multiple agricultural fields during a growing season.

- Two user roles: **Admin (Coordinator)** and **Field Agent**
- Authentication is required — unauthenticated users see only the login page
- The app must be **fully deployed and publicly accessible** via a live URL before submission
- Deadline: **25 April 2026**

---

## 2. Tech Stack — Use Exactly This. No Substitutions.

| Layer | Technology |
|---|---|
| Backend | FastAPI (Python 3.11+) |
| Database | PostgreSQL 15 |
| ORM | SQLAlchemy 2.x + Alembic for migrations |
| Auth | JWT — access token (30 min) + refresh token (7 days) in Authorization header |
| Password hashing | bcrypt via passlib |
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS v3 + shadcn/ui |
| Icons | lucide-react |
| Charts | recharts |
| State management | Zustand (auth state only) |
| HTTP client | axios with request interceptor that attaches Bearer token |
| Backend deploy | Railway (via Dockerfile) |
| Frontend deploy | Vercel |
| Database deploy | Railway PostgreSQL addon |

**Do not use:** Redux, Next.js, Celery, Redis, websockets, background tasks, email sending, file uploads, or any service not listed above.

---

## 3. Project Structure — Create Exactly This

```
smartseason/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── database.py
│   │   │   └── security.py
│   │   ├── models/
│   │   │   └── models.py
│   │   ├── schemas/
│   │   │   └── schemas.py
│   │   ├── routers/
│   │   │   ├── auth.py
│   │   │   ├── fields.py
│   │   │   ├── updates.py
│   │   │   ├── users.py
│   │   │   └── dashboard.py
│   │   └── crud/
│   │       ├── fields.py
│   │       └── users.py
│   ├── alembic/
│   ├── seed.py
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   ├── ProtectedRoute.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── FieldBadges.tsx
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Fields.tsx
│   │   │   ├── FieldDetail.tsx
│   │   │   ├── FieldForm.tsx
│   │   │   └── Agents.tsx
│   │   ├── hooks/
│   │   │   └── useAuth.ts
│   │   ├── store/
│   │   │   └── authStore.ts
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

---

## 4. Database Schema — Exact Tables, No Extra Columns

```sql
-- TABLE: users
id            UUID        PRIMARY KEY DEFAULT gen_random_uuid()
name          VARCHAR(100) NOT NULL
email         VARCHAR(150) UNIQUE NOT NULL
password_hash VARCHAR(255) NOT NULL
role          VARCHAR(10)  NOT NULL CHECK (role IN ('admin', 'agent'))
created_at    TIMESTAMP    NOT NULL DEFAULT NOW()

-- TABLE: fields
id                UUID        PRIMARY KEY DEFAULT gen_random_uuid()
name              VARCHAR(150) NOT NULL
crop_type         VARCHAR(100) NOT NULL
planting_date     DATE         NOT NULL
stage             VARCHAR(20)  NOT NULL CHECK (stage IN ('planted', 'growing', 'ready', 'harvested'))
location          VARCHAR(200)
assigned_agent_id UUID         REFERENCES users(id) ON DELETE SET NULL
created_at        TIMESTAMP    NOT NULL DEFAULT NOW()
updated_at        TIMESTAMP    NOT NULL DEFAULT NOW()

-- TABLE: field_updates
id         UUID      PRIMARY KEY DEFAULT gen_random_uuid()
field_id   UUID      NOT NULL REFERENCES fields(id) ON DELETE CASCADE
agent_id   UUID      NOT NULL REFERENCES users(id)
note       TEXT      NOT NULL
stage      VARCHAR(20) NOT NULL  -- the stage value at time of this update
created_at TIMESTAMP NOT NULL DEFAULT NOW()
```

**Rules:**
- `status` is NOT a column. It is computed in Python every time a field is returned. Never store it.
- `last_update_at` is NOT a column. It is computed as the latest `field_updates.created_at` for that field via a subquery or joined query.
- Do not add any columns not listed above.

---

## 5. Field Status Logic — Computed in Python, Never Stored

Add this function to `app/core/security.py` or a `app/core/utils.py` file. Call it whenever building a field response object.

```python
from datetime import date, datetime

STAGE_DEADLINE_DAYS = {
    "planted": 14,   # must advance to 'growing' within 14 days of planting
    "growing": 44,   # must advance to 'ready' within 44 days of planting
    "ready":   51,   # must advance to 'harvested' within 51 days of planting
}

def compute_field_status(stage: str, planting_date: date, last_update_at: datetime | None) -> str:
    if stage == "harvested":
        return "completed"

    days_since_planting = (date.today() - planting_date).days

    if days_since_planting > STAGE_DEADLINE_DAYS[stage]:
        return "at_risk"

    if last_update_at is not None:
        days_since_update = (datetime.now() - last_update_at).days
        if days_since_update > 14:
            return "at_risk"

    return "active"
```

**Status values returned to the frontend:** `"active"` | `"at_risk"` | `"completed"`

---

## 6. Stage Progression Rule

Stages move in this order only: `planted → growing → ready → harvested`

When an agent or admin updates a field's stage:
- Determine the current stage index in the list `["planted", "growing", "ready", "harvested"]`
- The new stage index must be **exactly current_index + 1**
- If the submitted stage is the same as current, lower, or skips more than one step → return `400 Bad Request` with body `{"detail": "Stage can only advance one step forward"}`

Enforce this in the `PUT /api/v1/fields/{id}` router and in `POST /api/v1/fields/{id}/updates`.

---

## 7. API Endpoints — Exact Routes and Behaviours

All routes are prefixed with `/api/v1`.  
All protected routes require header: `Authorization: Bearer <access_token>`.  
All responses are JSON.

### Auth

```
POST /api/v1/auth/login
  Body:    { "email": string, "password": string }
  Returns: { "access_token": string, "token_type": "bearer", "user": { "id", "name", "email", "role" } }
  Errors:  401 if credentials invalid

POST /api/v1/auth/refresh
  Body:    { "refresh_token": string }
  Returns: { "access_token": string }
  Errors:  401 if refresh token invalid or expired

POST /api/v1/auth/logout
  Protected: yes
  Returns: { "message": "Logged out successfully" }
```

### Fields

```
GET /api/v1/fields
  Protected: yes
  Admin gets: all fields
  Agent gets: only fields where assigned_agent_id = their user id
  Returns: array of FieldResponse objects (see Section 8)

POST /api/v1/fields
  Protected: yes, admin only (403 if agent)
  Body: { "name", "crop_type", "planting_date", "stage", "location", "assigned_agent_id" }
  assigned_agent_id is optional (can be null)
  stage must be "planted" on creation — reject any other value with 400
  Returns: FieldResponse

GET /api/v1/fields/{id}
  Protected: yes
  Admin: can get any field
  Agent: can only get their assigned fields (403 otherwise)
  Returns: FieldDetailResponse (FieldResponse + updates array, see Section 8)

PUT /api/v1/fields/{id}
  Protected: yes
  Admin: can update all fields — name, crop_type, planting_date, stage, location, assigned_agent_id
  Agent: can only update stage and must submit a note at the same time
         Agent cannot update name, crop_type, planting_date, location, assigned_agent_id
         Agent can only update their own assigned fields (403 otherwise)
  Stage change rule applies (Section 6)
  When stage changes, automatically create a field_update record
  Updates fields.updated_at to NOW()
  Returns: FieldResponse

DELETE /api/v1/fields/{id}
  Protected: yes, admin only (403 if agent)
  Returns: { "message": "Field deleted successfully" }
```

### Field Updates

```
GET /api/v1/fields/{id}/updates
  Protected: yes
  Admin: any field
  Agent: assigned fields only
  Returns: array of UpdateResponse objects ordered by created_at DESC

POST /api/v1/fields/{id}/updates
  Protected: yes
  Admin: any field
  Agent: assigned fields only (403 otherwise)
  Body: { "note": string (min 10 chars), "stage": string }
  Stage change rule applies (Section 6)
  This creates a field_updates record AND updates fields.stage and fields.updated_at
  Returns: UpdateResponse
```

### Users (Agents)

```
GET /api/v1/users
  Protected: yes, admin only (403 if agent)
  Returns: array of UserResponse objects where role = 'agent'

POST /api/v1/users
  Protected: yes, admin only (403 if agent)
  Body: { "name", "email", "password", "role" }
  role must be "agent" — admin cannot create another admin via this endpoint
  Returns: UserResponse

DELETE /api/v1/users/{id}
  Protected: yes, admin only (403 if agent)
  Cannot delete self (400 if id matches current user)
  Returns: { "message": "Agent deleted successfully" }
```

### Dashboard

```
GET /api/v1/dashboard
  Protected: yes
  Admin gets stats across ALL fields
  Agent gets stats across their ASSIGNED fields only
  Returns:
  {
    "total_fields": int,
    "by_status": { "active": int, "at_risk": int, "completed": int },
    "by_stage": { "planted": int, "growing": int, "ready": int, "harvested": int },
    "recent_updates": [
      {
        "field_name": string,
        "agent_name": string,
        "note": string,
        "stage": string,
        "created_at": ISO8601 string
      }
    ]  -- last 5 updates only, ordered by created_at DESC
  }
```

---

## 8. Response Shapes — Exact JSON

### FieldResponse (returned by list and single field endpoints)

```json
{
  "id": "uuid-string",
  "name": "North Field A",
  "crop_type": "Maize",
  "planting_date": "2026-02-10",
  "stage": "growing",
  "status": "active",
  "location": "Nakuru, Kenya",
  "assigned_agent": {
    "id": "uuid-string",
    "name": "Amara Osei"
  },
  "last_update_at": "2026-04-15T10:30:00",
  "created_at": "2026-02-10T08:00:00",
  "updated_at": "2026-04-15T10:30:00"
}
```

`assigned_agent` is `null` if no agent is assigned.  
`last_update_at` is `null` if no updates have been posted yet.  
`status` is always present and always one of `"active"`, `"at_risk"`, `"completed"`.

### FieldDetailResponse (returned by GET /fields/{id})

Same as FieldResponse but with an additional `updates` array:

```json
{
  ...all FieldResponse fields...,
  "updates": [
    {
      "id": "uuid-string",
      "note": "Crops showing healthy leaf development",
      "stage": "growing",
      "agent": { "id": "uuid-string", "name": "Amara Osei" },
      "created_at": "2026-04-15T10:30:00"
    }
  ]
}
```

Updates ordered by `created_at` descending (newest first).

### UpdateResponse

```json
{
  "id": "uuid-string",
  "note": "Crops showing healthy leaf development",
  "stage": "growing",
  "agent": { "id": "uuid-string", "name": "Amara Osei" },
  "created_at": "2026-04-15T10:30:00"
}
```

### UserResponse

```json
{
  "id": "uuid-string",
  "name": "Amara Osei",
  "email": "amara@smartseason.app",
  "role": "agent",
  "created_at": "2026-01-01T00:00:00"
}
```

---

## 9. Authorization Matrix

| Action | Admin | Agent |
|---|---|---|
| Login | ✅ | ✅ |
| View all fields | ✅ | ❌ (own assigned only) |
| Create field | ✅ | ❌ → 403 |
| Edit full field details | ✅ | ❌ → 403 |
| Update stage + add note on assigned field | ✅ | ✅ |
| Delete field | ✅ | ❌ → 403 |
| View all agents | ✅ | ❌ → 403 |
| Create agent account | ✅ | ❌ → 403 |
| Delete agent | ✅ | ❌ → 403 |
| View dashboard | ✅ (all data) | ✅ (own data) |

Unauthenticated request → `401 Unauthorized`  
Authenticated but wrong role → `403 Forbidden`

---

## 10. Backend Implementation Notes

### `app/core/config.py`
Use `pydantic_settings.BaseSettings`. Load from `.env` file.

```python
class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    FRONTEND_URL: str

    class Config:
        env_file = ".env"
```

### `app/core/database.py`
Standard SQLAlchemy async or sync session setup. Use sync SQLAlchemy (not async) to keep it simple. Provide a `get_db` dependency that yields a session.

### `app/core/security.py`
- `hash_password(plain: str) -> str` using `passlib[bcrypt]`
- `verify_password(plain: str, hashed: str) -> bool`
- `create_access_token(data: dict) -> str` — expires in 30 min
- `create_refresh_token(data: dict) -> str` — expires in 7 days
- `decode_token(token: str) -> dict` — raises `HTTPException 401` if invalid
- `get_current_user(token, db)` — FastAPI dependency that returns the User ORM object
- `require_admin(current_user)` — FastAPI dependency that raises `403` if role != 'admin'

### `app/main.py`
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import auth, fields, updates, users, dashboard

app = FastAPI(title="SmartSeason API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(fields.router, prefix="/api/v1/fields", tags=["fields"])
app.include_router(updates.router, prefix="/api/v1/fields", tags=["updates"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["dashboard"])

@app.get("/health")
def health():
    return {"status": "ok"}
```

### `requirements.txt`
```
fastapi==0.111.0
uvicorn[standard]==0.29.0
sqlalchemy==2.0.30
alembic==1.13.1
psycopg2-binary==2.9.9
pydantic-settings==2.2.1
passlib[bcrypt]==1.7.4
python-jose[cryptography]==3.3.0
python-multipart==0.0.9
```

### `Dockerfile`
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### `.env.example`
```
DATABASE_URL=postgresql://user:password@host:5432/smartseason
SECRET_KEY=change-this-to-a-256-bit-random-string
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
FRONTEND_URL=https://your-vercel-url.vercel.app
```

---

## 11. Frontend — Base Template Setup

**Do not scaffold React from scratch. Clone and adapt this existing template.**

```bash
git clone https://github.com/satnaing/shadcn-admin
cd shadcn-admin
npm install
```

This template provides: sidebar layout, auth page shells, data tables, dark/light mode, and shadcn/ui fully configured. Adapt it — do not rebuild it.

### Immediate Changes After Cloning

**Step 1 — Change primary color to green.**

Find the CSS variables file (likely `src/index.css` or `src/styles/globals.css`) and update:

```css
:root {
  --primary: oklch(0.55 0.18 142);
  --primary-foreground: oklch(0.98 0 0);
}
.dark {
  --primary: oklch(0.65 0.18 142);
  --primary-foreground: oklch(0.1 0 0);
}
```

**Step 2 — Change the sidebar logo.**

Find the sidebar component and replace whatever logo/brand is there with:

```tsx
import { Leaf } from "lucide-react"

// Replace brand section with:
<div className="flex items-center gap-2">
  <Leaf className="h-6 w-6 text-primary" />
  <span className="font-bold text-lg tracking-tight">SmartSeason</span>
</div>
```

**Step 3 — Delete all demo pages not in the pages list below.**

Remove: tasks, mail, settings, kanban, or any other demo pages. Keep only the layout shell: sidebar, header, auth layout wrappers.

**Step 4 — Keep the table and auth components.**

The template's data table and login form shell are reusable. Wire them to your API — do not rewrite them.

**Fallback template** (if the above repo is unavailable):  
`https://github.com/shadcnstore/shadcn-dashboard-landing-template` — use the Vite + React version. Apply the same four steps above.

---

## 12. Frontend Pages — Build Exactly These

### Routing Setup (`App.tsx`)

Use `react-router-dom v6`. Structure:

```
/login                → Login page (public)
/dashboard            → Dashboard (protected)
/fields               → Fields list (protected)
/fields/new           → Create field form (admin only)
/fields/:id           → Field detail (protected)
/fields/:id/edit      → Edit field form (admin only)
/agents               → Agents list (admin only)
/agents/new           → Create agent form (admin only)
```

Create a `<ProtectedRoute>` component that:
- Checks if user is authenticated (token in Zustand store)
- If not authenticated → redirect to `/login`
- If authenticated but wrong role → redirect to `/dashboard`
- If authenticated and correct role → render children

On app load, if a token exists in localStorage, validate it by calling `GET /api/v1/dashboard`. If 401 is returned, clear the token and redirect to `/login`.

### Login Page (`/login`)

- Email input + password input + submit button
- On submit: call `POST /api/v1/auth/login`
- On success: save `access_token` and `user` object to Zustand store and localStorage, redirect to `/dashboard`
- On failure: show error message "Invalid email or password" below the form
- If already logged in, redirect to `/dashboard`

### Admin Dashboard (`/dashboard` — admin role)

Layout: stat cards row at top, then a bar chart, then a recent updates table.

**Stat cards (4 cards in a row):**
| Card | Value |
|---|---|
| Total Fields | `dashboard.total_fields` |
| Active | `dashboard.by_status.active` |
| At Risk | `dashboard.by_status.at_risk` (red accent) |
| Completed | `dashboard.by_status.completed` |

**Bar chart (recharts `BarChart`):**
- X-axis: stage names (Planted, Growing, Ready, Harvested)
- Y-axis: count
- Data: `dashboard.by_stage`
- Bar fill color: primary green

**Recent Updates table (last 5):**
Columns: Field Name | Agent | Note (truncate at 60 chars) | Stage | Time (relative, e.g. "2 hours ago")

### Agent Dashboard (`/dashboard` — agent role)

Same layout as admin dashboard but data is scoped to assigned fields only (the API already handles this). Show a notice: "Showing your assigned fields only."

### Fields List (`/fields`)

shadcn `Table` component with these columns:

| Column | Notes |
|---|---|
| Name | Clickable link → `/fields/:id` |
| Crop Type | Plain text |
| Stage | Badge (see badge colours below) |
| Status | Badge (see badge colours below) |
| Assigned Agent | Agent name or "Unassigned" |
| Last Updated | Relative time or "No updates yet" |
| Actions | Admin: Edit button + Delete button. Agent: View button only. |

Above the table: a "New Field" button (admin only, links to `/fields/new`).

Agent sees only their assigned fields.

**Stage badge colours:**
- `planted` → blue (`bg-blue-100 text-blue-800`)
- `growing` → yellow (`bg-yellow-100 text-yellow-800`)
- `ready` → green (`bg-green-100 text-green-800`)
- `harvested` → gray (`bg-gray-100 text-gray-700`)

**Status badge colours:**
- `active` → green (`bg-green-100 text-green-800`)
- `at_risk` → red (`bg-red-100 text-red-800`)
- `completed` → gray (`bg-gray-100 text-gray-700`)

### Create / Edit Field Form (`/fields/new` and `/fields/:id/edit`)

Admin only. One page component, used for both create and edit.

Fields:
- Name (text input, required)
- Crop Type (text input, required)
- Planting Date (date picker, required)
- Stage (select: planted/growing/ready/harvested — on create, locked to "planted")
- Location (text input, optional)
- Assigned Agent (select dropdown populated from `GET /api/v1/users`, shows agent names, optional)

On submit:
- Create: `POST /api/v1/fields` → on success redirect to `/fields`
- Edit: `PUT /api/v1/fields/:id` → on success redirect to `/fields/:id`

Show inline validation errors. Show API error messages if the request fails.

### Field Detail (`/fields/:id`)

Top section — field info card:
- Name (large heading)
- Crop Type, Planting Date, Location in a grid
- Stage badge + Status badge side by side
- Assigned Agent name
- "Edit Field" button (admin only, links to `/fields/:id/edit`)

Middle section — Update History timeline:
- List of all updates from `field.updates` array
- Each item shows: agent name, stage badge, note text, relative timestamp
- Newest update first
- If no updates: show "No updates recorded yet."

Bottom section — Add Update form (shown to both admin and agents who have access):
- Stage select: shows ONLY the next valid stage. If current stage is "planted", only "growing" is shown. If "harvested", hide the form entirely and show "This field has been harvested."
- Note textarea (required, minimum 10 characters, show character count)
- Submit button: "Save Update"
- On submit: `POST /api/v1/fields/:id/updates` → on success refresh the page data

### Agents List (`/agents` — admin only)

shadcn `Table` with columns: Name | Email | Assigned Fields Count | Created At | Actions (Delete button)

Above table: "New Agent" button → `/agents/new`

Delete button: show a shadcn `AlertDialog` confirmation before calling `DELETE /api/v1/users/:id`.

### Create Agent Form (`/agents/new` — admin only)

Fields:
- Name (required)
- Email (required, email format)
- Password (required, min 8 characters)

On submit: `POST /api/v1/users` with `role: "agent"` always — do not show a role dropdown.  
On success: redirect to `/agents`.

---

## 13. Frontend API Client (`src/api/client.ts`)

```typescript
import axios from "axios"
import { useAuthStore } from "../store/authStore"

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

// Attach token to every request
client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 — clear auth and redirect to login
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = "/login"
    }
    return Promise.reject(error)
  }
)

export default client
```

---

## 14. Zustand Auth Store (`src/store/authStore.ts`)

```typescript
import { create } from "zustand"
import { persist } from "zustand/middleware"

interface User {
  id: string
  name: string
  email: string
  role: "admin" | "agent"
}

interface AuthState {
  accessToken: string | null
  user: User | null
  setAuth: (token: string, user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setAuth: (token, user) => set({ accessToken: token, user }),
      logout: () => set({ accessToken: null, user: null }),
    }),
    { name: "smartseason-auth" }
  )
)
```

---

## 15. Seed Data (`backend/seed.py`)

Run this once after migrations: `python seed.py`

Creates the following exactly:

```python
# Users
admin:   name="Season Admin",   email="admin@smartseason.app",   password="Admin1234!", role="admin"
agent1:  name="Amara Osei",     email="amara@smartseason.app",   password="Agent1234!", role="agent"
agent2:  name="Juma Kariuki",   email="juma@smartseason.app",    password="Agent1234!", role="agent"
agent3:  name="Fatima Nkosi",   email="fatima@smartseason.app",  password="Agent1234!", role="agent"
```

Create 10 fields with varied data:
- At least 2 fields per agent
- Mix of stages: 2 planted, 3 growing, 2 ready, 3 harvested
- Use planting dates that result in: at least 2 "at_risk" fields, at least 3 "active", at least 3 "completed"
- Use realistic Kenyan location names (e.g. Nakuru, Eldoret, Kisumu, Meru)
- Use realistic crop types (Maize, Wheat, Beans, Tomatoes, Sorghum, Sunflower)

Create 2–3 `field_updates` per non-planted field with realistic farming observation notes (at least 15 words each).

---

## 16. Environment Variables

### Backend `.env`
```
DATABASE_URL=postgresql://user:password@host:5432/smartseason
SECRET_KEY=generate-a-random-256-bit-string-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
FRONTEND_URL=https://your-vercel-app.vercel.app
```

### Frontend `.env`
```
VITE_API_URL=https://your-railway-app.up.railway.app
```

---

## 17. Deployment Steps

### Backend on Railway

1. Push backend folder to a GitHub repository
2. Create a new Railway project
3. Add a PostgreSQL plugin — Railway provides `DATABASE_URL` automatically
4. Connect the GitHub repo — Railway auto-detects the Dockerfile
5. Add all backend environment variables in Railway dashboard
6. After first deploy: open Railway shell and run `alembic upgrade head` then `python seed.py`
7. Note the public Railway URL (e.g. `https://smartseason-api.up.railway.app`)

### Frontend on Vercel

1. Push frontend folder to GitHub (same repo or separate)
2. Import to Vercel
3. Set environment variable: `VITE_API_URL=https://your-railway-url.up.railway.app`
4. Deploy — Vercel auto-builds with Vite
5. Note the Vercel URL and update `FRONTEND_URL` in Railway environment variables
6. Redeploy backend after updating CORS origin

---

## 18. README.md — Write Exactly This Structure

```markdown
# SmartSeason Field Monitoring System

## Live Demo
- Frontend: https://your-vercel-url.vercel.app
- API Base: https://your-railway-url.up.railway.app

## Demo Credentials
| Role  | Email                      | Password    |
|-------|----------------------------|-------------|
| Admin | admin@smartseason.app      | Admin1234!  |
| Agent | amara@smartseason.app      | Agent1234!  |
| Agent | juma@smartseason.app       | Agent1234!  |
| Agent | fatima@smartseason.app     | Agent1234!  |

## Local Setup

### Backend
\`\`\`bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # fill in your values
alembic upgrade head
python seed.py
uvicorn app.main:app --reload
\`\`\`

### Frontend
\`\`\`bash
cd frontend
npm install
cp .env.example .env      # set VITE_API_URL
npm run dev
\`\`\`

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
```

---

## 19. What NOT to Build

Do not add any of the following — they are out of scope:

- User self-registration
- Password reset / forgot password
- Email notifications
- File or image uploads
- Map view of fields
- Pagination (return all records)
- Search or filter UI (nice to have, not required)
- Multiple admin accounts creation via UI
- Any dashboard charts other than the one bar chart described
- WebSockets or real-time updates
- Background jobs or scheduled tasks
- Any third-party service other than what is listed in the stack

---

## 20. Build Order

Follow this sequence. Do not jump ahead.

1. Set up PostgreSQL on Railway. Create the database.
2. Scaffold FastAPI project structure. Write models, schemas, and database connection.
3. Run `alembic init`, write migration, run `alembic upgrade head`.
4. Implement auth endpoints (`/login`, `/refresh`, `/logout`). Test with curl or Postman.
5. Implement users endpoints. Test.
6. Implement fields endpoints. Test status logic carefully.
7. Implement field updates endpoints. Test stage progression rule.
8. Implement dashboard endpoint. Test.
9. Run `python seed.py`. Verify data looks correct.
10. Deploy backend to Railway. Verify `/health` endpoint returns `{"status": "ok"}`.
11. Clone shadcn-admin template. Apply the four template changes (colour, logo, delete demo pages, keep tables).
12. Build Login page. Wire to API. Test login for both roles.
13. Build Dashboard page. Wire to API.
14. Build Fields list page. Wire to API.
15. Build Field Detail page including update form. Wire to API.
16. Build Field create/edit form. Wire to API.
17. Build Agents list and create form. Wire to API.
18. Add ProtectedRoute — verify role-based redirects work.
19. Deploy frontend to Vercel. Set environment variables. Test live.
20. Update backend CORS with Vercel URL. Redeploy backend.
21. Run seed on Railway if not done. Verify all demo credentials work on live URL.
22. Write README.md. Push everything to GitHub.
