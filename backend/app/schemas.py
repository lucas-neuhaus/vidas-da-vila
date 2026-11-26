import re
from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

State = Literal[
    "AC",
    "AL",
    "AP",
    "AM",
    "BA",
    "CE",
    "DF",
    "ES",
    "GO",
    "MA",
    "MT",
    "MS",
    "MG",
    "PA",
    "PB",
    "PR",
    "PE",
    "PI",
    "RJ",
    "RN",
    "RS",
    "RO",
    "RR",
    "SC",
    "SP",
    "SE",
    "TO",
]


class VolunteerInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    nome: str = Field(min_length=5, max_length=120)
    email: EmailStr = Field(max_length=254)
    data_nascimento: date
    cpf: str = Field(max_length=14)
    telefone: str = Field(max_length=15)
    cep: str = Field(max_length=9)
    endereco: str = Field(min_length=3, max_length=200)
    cidade: str = Field(min_length=2, max_length=100)
    estado: State
    mensagem: str = Field(min_length=20, max_length=500)

    @field_validator("nome")
    @classmethod
    def complete_name(cls, value: str) -> str:
        parts = value.split()
        if (
            len(parts) < 2
            or not all(
                char.isalpha() or char in "-'’" for part in parts for char in part
            )
            or not all(any(char.isalpha() for char in part) for part in parts)
        ):
            raise ValueError("Informe seu nome completo.")
        return " ".join(parts)

    @field_validator("data_nascimento")
    @classmethod
    def birth_date(cls, value: date) -> date:
        if not date(1900, 1, 1) <= value <= date.today():
            raise ValueError("Informe uma data de nascimento válida.")
        return value

    @field_validator("cpf")
    @classmethod
    def cpf_digits(cls, value: str) -> str:
        if not re.fullmatch(r"[0-9]{11}|[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2}", value):
            raise ValueError("Informe um CPF válido.")
        digits = re.sub(r"[^0-9]", "", value)
        if len(set(digits)) == 1:
            raise ValueError("Informe um CPF válido.")
        for length in (9, 10):
            total = sum(int(digits[i]) * (length + 1 - i) for i in range(length))
            if (total * 10 % 11) % 10 != int(digits[length]):
                raise ValueError("Informe um CPF válido.")
        return digits

    @field_validator("telefone")
    @classmethod
    def phone_digits(cls, value: str) -> str:
        if not re.fullmatch(r"[0-9]{10,11}|\([0-9]{2}\) [0-9]{4,5}-[0-9]{4}", value):
            raise ValueError("Informe o telefone com DDD.")
        return re.sub(r"[^0-9]", "", value)

    @field_validator("cep")
    @classmethod
    def postal_digits(cls, value: str) -> str:
        if not re.fullmatch(r"[0-9]{5}-?[0-9]{3}", value):
            raise ValueError("Informe um CEP de oito dígitos.")
        return value.replace("-", "")

    @field_validator("cidade", "endereco")
    @classmethod
    def contains_letters(cls, value: str) -> str:
        if not any(char.isalpha() for char in value):
            raise ValueError("Informe um texto válido.")
        return value


class VolunteerDetail(VolunteerInput):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime


class VolunteerSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    nome: str
    created_at: datetime


class ProjectDetail(BaseModel):
    slug: str
    title: str
    description: str
    status: str
    label: str
