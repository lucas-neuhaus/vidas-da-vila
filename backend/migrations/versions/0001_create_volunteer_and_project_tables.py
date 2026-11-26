"""Create volunteer and project tables"""

import sqlalchemy as sa
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "project_statuses",
        sa.Column("code", sa.String(length=16), nullable=False),
        sa.Column("label", sa.String(length=60), nullable=False),
        sa.PrimaryKeyConstraint("code"),
    )
    op.create_table(
        "volunteers",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("nome", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=254), nullable=False),
        sa.Column("data_nascimento", sa.Date(), nullable=False),
        sa.Column("cpf", sa.String(length=11), nullable=False),
        sa.Column("telefone", sa.String(length=11), nullable=False),
        sa.Column("cep", sa.String(length=8), nullable=False),
        sa.Column("endereco", sa.String(length=200), nullable=False),
        sa.Column("cidade", sa.String(length=100), nullable=False),
        sa.Column("estado", sa.String(length=2), nullable=False),
        sa.Column("mensagem", sa.String(length=500), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("cep ~ '^[0-9]{8}$'", name="cep_digits"),
        sa.CheckConstraint("cpf ~ '^[0-9]{11}$'", name="cpf_digits"),
        sa.CheckConstraint(
            "estado IN ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')",
            name="valid_state",
        ),
        sa.CheckConstraint("telefone ~ '^[0-9]{10,11}$'", name="telefone_digits"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("cpf"),
    )
    op.create_index(
        op.f("ix_volunteers_created_at"), "volunteers", ["created_at"], unique=False
    )
    op.create_table(
        "projects",
        sa.Column("slug", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["status"],
            ["project_statuses.code"],
        ),
        sa.PrimaryKeyConstraint("slug"),
        sa.UniqueConstraint("position"),
    )
    op.create_index(op.f("ix_projects_status"), "projects", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_projects_status"), table_name="projects")
    op.drop_table("projects")
    op.drop_index(op.f("ix_volunteers_created_at"), table_name="volunteers")
    op.drop_table("volunteers")
    op.drop_table("project_statuses")
