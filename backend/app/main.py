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
