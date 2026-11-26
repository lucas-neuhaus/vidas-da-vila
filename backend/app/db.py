import os
from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

engine = create_engine(
    os.environ["DATABASE_URL"], pool_pre_ping=True, hide_parameters=True
)


def session() -> Iterator[Session]:
    with Session(engine) as db:
        yield db
