import os
from collections.abc import Iterator

from sqlalchemy import URL, create_engine
from sqlalchemy.orm import Session


def database_url() -> str | URL:
    url = os.getenv("DATABASE_URL")
    if url:
        return url
    return URL.create(
        "postgresql+psycopg",
        username=os.environ["POSTGRES_USER"],
        password=os.environ["POSTGRES_PASSWORD"],
        host=os.environ["POSTGRES_HOST"],
        port=5432,
        database=os.environ["POSTGRES_DB"],
    )


engine = create_engine(database_url(), pool_pre_ping=True, hide_parameters=True)


def session() -> Iterator[Session]:
    with Session(engine) as db:
        yield db
