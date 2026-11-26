"""Seed the institutional project catalog."""

import sqlalchemy as sa
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None

statuses = sa.table("project_statuses", sa.column("code"), sa.column("label"))
projects = sa.table(
    "projects",
    sa.column("slug"),
    sa.column("title"),
    sa.column("description"),
    sa.column("status"),
    sa.column("position"),
)
STATUSES = [
    ("active", "Em Andamento"),
    ("volunteers", "Aceitando Voluntários"),
    ("monthly", "Ação Mensal"),
]
PROJECTS = [
    (
        "reforco-escolar",
        "Reforço Escolar Comunitário",
        "Aulas de português e matemática de segunda a sexta, no contraturno escolar, para crianças e adolescentes de 7 a 14 anos moradores do Vila Aparecida. Vagas limitadas por sala.",
        "active",
        1,
    ),
    (
        "futebol",
        "Bola pra Frente",
        "Time de futebol comunitário aos sábados de manhã, aberto a crianças e adolescentes de 8 a 16 anos. Além do esporte, o projeto trabalha disciplina, trabalho em equipe e permanência escolar.",
        "volunteers",
        2,
    ),
    (
        "cestas",
        "Cestas Solidárias",
        "Distribuição mensal de cestas básicas para famílias cadastradas em situação de vulnerabilidade, com prioridade para famílias com crianças pequenas ou idosos.",
        "monthly",
        3,
    ),
]


def upgrade() -> None:
    op.bulk_insert(
        statuses, [{"code": code, "label": label} for code, label in STATUSES]
    )
    op.bulk_insert(
        projects,
        [
            {
                "slug": slug,
                "title": title,
                "description": description,
                "status": status,
                "position": position,
            }
            for slug, title, description, status, position in PROJECTS
        ],
    )


def downgrade() -> None:
    for slug, *_ in PROJECTS:
        op.execute(projects.delete().where(projects.c.slug == slug))
    for code, _ in STATUSES:
        op.execute(statuses.delete().where(statuses.c.code == code))
