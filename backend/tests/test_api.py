import os

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import select, text

from app.db import engine
from app.main import app
from app.models import Volunteer

RECORD = {
    "nome": "Pessoa Exemplo",
    "email": "voluntaria@example.org",
    "data_nascimento": "1990-03-15",
    "cpf": "123.456.789-09",
    "telefone": "(48) 91234-5678",
    "cep": "88000-000",
    "endereco": "Rua de Exemplo, 42",
    "cidade": "Florianópolis",
    "estado": "SC",
    "mensagem": "Gostaria de ajudar na organização das atividades.",
}


@pytest.fixture
def client():
    if not engine.url.database or not engine.url.database.endswith("_test"):
        pytest.fail("Use um PostgreSQL dedicado com nome terminado em _test.")
    command.upgrade(Config("alembic.ini"), "head")
    with engine.begin() as connection:
        connection.execute(text("TRUNCATE volunteers"))
    with TestClient(app) as test_client:
        yield test_client


def admin_headers():
    return {"Authorization": f"Bearer {os.environ['ADMIN_API_TOKEN']}"}


def test_catalog_and_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}
    projects = client.get("/api/projects").json()
    assert [project["slug"] for project in projects] == [
        "reforco-escolar",
        "futebol",
        "cestas",
    ]


def test_registration_and_administrative_crud(client):
    assert client.get("/api/volunteers/count").json() == {"total": 0}
    created = client.post("/api/volunteers", json=RECORD)
    assert created.status_code == 202, created.json()
    assert client.get("/api/volunteers/count").json() == {"total": 1}
    with engine.connect() as connection:
        volunteer_id = connection.scalar(select(Volunteer.id))
        assert connection.scalar(select(Volunteer.cpf)) == "12345678909"
    url = f"/api/admin/volunteers/{volunteer_id}"
    headers = admin_headers()
    denied = client.get(url, headers={"Authorization": "Bearer wrong"})
    assert denied.status_code == 401
    assert denied.headers["cache-control"] == "no-store"
    assert client.get("/api/admin/volunteers").status_code == 401
    assert client.put(url, json=RECORD).status_code == 401
    assert client.delete(url).status_code == 401
    listing = client.get("/api/admin/volunteers?limit=1", headers=headers).json()
    assert listing[0]["id"] == str(volunteer_id)
    assert "cpf" not in listing[0]
    assert client.get(url, headers=headers).json()["cpf"] == "12345678909"
    changed = client.put(url, json=RECORD | {"cidade": "São José"}, headers=headers)
    assert changed.status_code == 200
    with engine.connect() as connection:
        assert connection.scalar(select(Volunteer.cidade)) == "São José"
    assert client.delete(url, headers=headers).status_code == 204
    assert client.get(url, headers=headers).status_code == 404
    assert client.get("/api/volunteers/count").json() == {"total": 0}


def test_invalid_and_duplicate_registrations(client):
    invalid = client.post(
        "/api/volunteers", json=RECORD | {"cpf": "11111111111", "estado": "XX"}
    )
    assert invalid.status_code == 422
    assert set(invalid.json()["fields"]) == {"cpf", "estado"}
    assert "11111111111" not in invalid.text
    assert client.post("/api/volunteers", json=RECORD).status_code == 202
    assert (
        client.post("/api/volunteers", json=RECORD | {"cpf": "12345678909"}).status_code
        == 202
    )
    assert client.get("/api/volunteers/count").json() == {"total": 1}
