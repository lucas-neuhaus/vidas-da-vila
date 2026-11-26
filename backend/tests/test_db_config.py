from sqlalchemy import URL

from app.db import database_url


def test_connection_from_components_preserves_reserved_password_characters(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.setenv("POSTGRES_USER", "vidas")
    monkeypatch.setenv("POSTGRES_PASSWORD", "test@password:with/symbols")
    monkeypatch.setenv("POSTGRES_HOST", "db")
    monkeypatch.setenv("POSTGRES_DB", "vidas_test")

    url = database_url()
    assert isinstance(url, URL)
    assert url.drivername == "postgresql+psycopg"
    assert url.username == "vidas"
    assert url.password == "test@password:with/symbols"
    assert url.host == "db"
    assert url.port == 5432
    assert url.database == "vidas_test"


def test_explicit_database_url_takes_precedence(monkeypatch):
    url = "postgresql+psycopg://vidas:test@localhost:15432/vidas_test"
    monkeypatch.setenv("DATABASE_URL", url)
    monkeypatch.setenv("POSTGRES_HOST", "db")

    assert database_url() == url
