import os
import secrets
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Query, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import func, select
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from .db import session
from .models import Project, ProjectStatus, Volunteer
from .schemas import ProjectDetail, VolunteerDetail, VolunteerInput, VolunteerSummary
from .service import find_volunteer, save_volunteer

app = FastAPI(
    title="Instituto Vidas da Vila Aparecida",
    docs_url="/api/docs",
    redoc_url=None,
    openapi_url="/api/openapi.json",
)
api = APIRouter(prefix="/api")
DB = Annotated[Session, Depends(session)]
bearer = HTTPBearer(auto_error=False)
admin_token = os.getenv("ADMIN_API_TOKEN", "")
if len(admin_token) < 32 or not admin_token.isascii():
    raise RuntimeError("ADMIN_API_TOKEN deve conter pelo menos 32 caracteres ASCII.")


def require_admin(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> None:
    if credentials is None or not secrets.compare_digest(
        credentials.credentials.encode(), admin_token.encode()
    ):
        raise HTTPException(
            401,
            "Credencial administrativa inválida.",
            headers={"WWW-Authenticate": "Bearer"},
        )


admin = APIRouter(prefix="/admin/volunteers", dependencies=[Depends(require_admin)])


@app.middleware("http")
async def prevent_sensitive_caching(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/api/admin/"):
        response.headers["Cache-Control"] = "no-store"
    return response


@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, error: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Verifique os campos informados.",
            "fields": {
                item["loc"][1]: item["msg"]
                for item in error.errors()
                if len(item["loc"]) > 1 and item["loc"][0] == "body"
            },
        },
    )


@app.exception_handler(OperationalError)
async def database_unavailable(_: Request, _error: OperationalError) -> JSONResponse:
    return JSONResponse(
        status_code=503, content={"detail": "Banco de dados indisponível."}
    )


@api.get("/health")
def health(db: DB) -> dict[str, str]:
    db.execute(select(1))
    return {"status": "ok"}


@api.get("/projects", response_model=list[ProjectDetail])
def projects(db: DB):
    return (
        db.execute(
            select(
                Project.slug,
                Project.title,
                Project.description,
                Project.status,
                ProjectStatus.label,
            )
            .join(ProjectStatus)
            .order_by(Project.position)
        )
        .mappings()
        .all()
    )


@api.get("/volunteers/count")
def volunteer_count(db: DB) -> dict[str, int]:
    return {"total": db.scalar(select(func.count()).select_from(Volunteer)) or 0}


@api.post("/volunteers", status_code=202)
def register(data: VolunteerInput, db: DB) -> dict[str, str]:
    try:
        save_volunteer(db, data)
    except HTTPException as error:
        if error.status_code != 409:
            raise
    return {"message": "Solicitação de cadastro recebida."}


@admin.get("", response_model=list[VolunteerSummary])
def list_volunteers(
    db: DB,
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    return db.scalars(
        select(Volunteer)
        .order_by(Volunteer.created_at.desc(), Volunteer.id)
        .limit(limit)
        .offset(offset)
    ).all()


@admin.get("/{volunteer_id}", response_model=VolunteerDetail)
def get_volunteer(volunteer_id: UUID, db: DB) -> Volunteer:
    return find_volunteer(db, volunteer_id)


@admin.put("/{volunteer_id}", response_model=VolunteerDetail)
def update_volunteer(volunteer_id: UUID, data: VolunteerInput, db: DB) -> Volunteer:
    return save_volunteer(db, data, find_volunteer(db, volunteer_id))


@admin.delete("/{volunteer_id}", status_code=204)
def delete_volunteer(volunteer_id: UUID, db: DB) -> Response:
    db.delete(find_volunteer(db, volunteer_id))
    db.commit()
    return Response(status_code=204)


api.include_router(admin)
app.include_router(api)
