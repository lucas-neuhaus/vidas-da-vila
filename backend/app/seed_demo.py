"""Insert an explicitly fictional record into a development database."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from .db import engine
from .models import Volunteer
from .schemas import VolunteerInput
from .service import save_volunteer

DEMO = VolunteerInput(
    nome="Pessoa Exemplo",
    email="voluntaria@example.org",
    data_nascimento="1990-03-15",
    cpf="123.456.789-09",
    telefone="(48) 91234-5678",
    cep="88000-000",
    endereco="Rua de Exemplo, 42",
    cidade="Florianópolis",
    estado="SC",
    mensagem="Cadastro fictício para demonstração do sistema.",
)


def main() -> None:
    if not (engine.url.database or "").endswith("_dev"):
        raise SystemExit("Use um banco de desenvolvimento com nome terminado em _dev.")
    with Session(engine) as db:
        if db.scalar(select(Volunteer.id).where(Volunteer.cpf == DEMO.cpf)) is None:
            save_volunteer(db, DEMO)
    print("Cadastro fictício disponível no banco de desenvolvimento.")


if __name__ == "__main__":
    main()
