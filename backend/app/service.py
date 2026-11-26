from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .models import Volunteer
from .schemas import VolunteerInput


def find_volunteer(db: Session, volunteer_id: UUID) -> Volunteer:
    volunteer = db.get(Volunteer, volunteer_id)
    if volunteer is None:
        raise HTTPException(404, "Cadastro não encontrado.")
    return volunteer


def save_volunteer(
    db: Session, data: VolunteerInput, volunteer: Volunteer | None = None
) -> Volunteer:
    if volunteer is None:
        volunteer = Volunteer()
        db.add(volunteer)

    for field, value in data.model_dump().items():
        setattr(volunteer, field, value)

    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        if getattr(error.orig, "sqlstate", None) == "23505":
            raise HTTPException(409, "Já existe um cadastro com esse CPF.") from error
        raise
    return volunteer
