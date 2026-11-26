from datetime import date, datetime
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class ProjectStatus(Base):
    __tablename__ = "project_statuses"

    code: Mapped[str] = mapped_column(String(16), primary_key=True)
    label: Mapped[str] = mapped_column(String(60))


class Project(Base):
    __tablename__ = "projects"

    slug: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(ForeignKey("project_statuses.code"), index=True)
    position: Mapped[int] = mapped_column(unique=True)


class Volunteer(Base):
    __tablename__ = "volunteers"
    __table_args__ = (
        CheckConstraint("cpf ~ '^[0-9]{11}$'", name="cpf_digits"),
        CheckConstraint("cep ~ '^[0-9]{8}$'", name="cep_digits"),
        CheckConstraint("telefone ~ '^[0-9]{10,11}$'", name="telefone_digits"),
        CheckConstraint(
            "estado IN ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')",
            name="valid_state",
        ),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    nome: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(254))
    data_nascimento: Mapped[date]
    cpf: Mapped[str] = mapped_column(String(11), unique=True)
    telefone: Mapped[str] = mapped_column(String(11))
    cep: Mapped[str] = mapped_column(String(8))
    endereco: Mapped[str] = mapped_column(String(200))
    cidade: Mapped[str] = mapped_column(String(100))
    estado: Mapped[str] = mapped_column(String(2))
    mensagem: Mapped[str] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
