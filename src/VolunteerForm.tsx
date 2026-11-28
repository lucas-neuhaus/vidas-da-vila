import { useLayoutEffect, useRef, useState, type FormEvent, type InputHTMLAttributes } from "react";
import { ApiError } from "./api";
import { states } from "./states";

export type Volunteer = Record<
  "nome" | "email" | "data_nascimento" | "cpf" | "telefone" | "cep" |
  "endereco" | "cidade" | "estado" | "mensagem",
  string
>;

type Field = keyof Volunteer;
type InputField = InputHTMLAttributes<HTMLInputElement> & {
  name: Field;
  label: string;
};

const groups: { title: string; fields: InputField[] }[] = [
  { title: "Identificação", fields: [
    { name: "nome", label: "Nome completo", autoComplete: "name", minLength: 5, maxLength: 120 },
    { name: "data_nascimento", label: "Data de nascimento", type: "date", autoComplete: "bday",
      min: "1900-01-01" },
    { name: "cpf", label: "CPF", inputMode: "numeric", pattern: "[0-9]{3}\\.[0-9]{3}\\.[0-9]{3}-[0-9]{2}",
      placeholder: "000.000.000-00" },
  ] },
  { title: "Contato", fields: [
    { name: "email", label: "Email", type: "email", autoComplete: "email", maxLength: 254 },
    { name: "telefone", label: "Telefone", type: "tel", inputMode: "numeric", autoComplete: "tel",
      pattern: "\\([0-9]{2}\\) [0-9]{4,5}-[0-9]{4}", placeholder: "(00) 00000-0000" },
  ] },
  { title: "Endereço", fields: [
    { name: "cep", label: "CEP", inputMode: "numeric", autoComplete: "postal-code",
      pattern: "[0-9]{5}-[0-9]{3}", placeholder: "00000-000" },
    { name: "endereco", label: "Endereço (rua e número)", autoComplete: "address-line1",
      minLength: 3, maxLength: 200, placeholder: "Rua das Palmeiras, 245" },
    { name: "cidade", label: "Cidade", autoComplete: "address-level2", minLength: 2, maxLength: 100 },
  ] },
];

const fieldLabels = new Map<string, string>([
  ...groups.flatMap(({ fields }) => fields.map(({ name, label }) => [name, label] as const)),
  ["estado", "Estado"],
  ["mensagem", "Motivação"],
]);

function digits(value: string, length: number) {
  return value.replace(/\D/g, "").slice(0, length);
}

const masks: Partial<Record<Field, (value: string) => string>> = {
  cpf: (value) => digits(value, 11).replace(/(\d{3})(?=\d)/g, "$1.")
    .replace(/^(\d{3}\.\d{3}\.\d{3})\./, "$1-"),
  telefone: (value) => digits(value, 11).replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{4,5})(\d{4})$/, "$1-$2"),
  cep: (value) => digits(value, 8).replace(/^(\d{5})(\d)/, "$1-$2"),
};

const formatErrors: Partial<Record<Field, string>> = {
  cpf: "Informe os 11 dígitos do CPF.",
  telefone: "Informe o DDD e o telefone com 8 ou 9 dígitos.",
  cep: "Informe os 8 dígitos do CEP.",
};

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function validationMessage(control: Control) {
  const { validity, name } = control;
  if (validity.valueMissing) return name === "estado" ? "Selecione um estado." : "Preencha este campo.";
  if (validity.badInput || validity.rangeUnderflow || validity.rangeOverflow) {
    return "Informe uma data de nascimento válida.";
  }
  if (validity.typeMismatch) return "Informe um email válido.";
  if (validity.patternMismatch) return formatErrors[name as Field] ?? "Verifique o formato deste campo.";
  if ("minLength" in control && control.minLength > 0 && control.value.trim().length < control.minLength) {
    return `Informe pelo menos ${control.minLength} caracteres.`;
  }
  return validity.valid ? "" : control.validationMessage;
}

function apiFieldMessage(name: string, message: string) {
  if (message.startsWith("Value error, ")) return message.slice("Value error, ".length);
  if (name === "email") return "Informe um email válido.";
  const length = message.match(/^String should have at (least|most) (\d+) characters/);
  if (length) return `Informe ${length[1] === "least" ? "pelo menos" : "no máximo"} ${length[2]} caracteres.`;
  return "Verifique o valor deste campo.";
}

export function VolunteerForm({ initial, action, onSave }: {
  initial?: Volunteer;
  action: string;
  onSave: (volunteer: Volunteer) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const focusField = useRef(false);
  const today = new Date();
  const maxDate = [today.getFullYear(), today.getMonth() + 1, today.getDate()]
    .map((part) => String(part).padStart(2, "0")).join("-");

  useLayoutEffect(() => {
    if (busy || !focusField.current) return;
    focusField.current = false;
    const firstInvalid = formRef.current?.querySelector<Control>('[aria-invalid="true"]');
    firstInvalid?.focus({ preventScroll: true });
    firstInvalid?.closest(".campo-formulario")?.scrollIntoView({ block: "center", behavior: "instant" });
  }, [busy, fields]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (busy) return;
    setError("");
    const controls = Array.from(form.querySelectorAll<Control>("input, select, textarea"));
    const invalid = Object.fromEntries(controls.map((control) => [control.name, validationMessage(control)])
      .filter(([, message]) => message));
    if (Object.keys(invalid).length) {
      focusField.current = true;
      setFields(invalid);
      return;
    }
    const data = Object.fromEntries(new FormData(form)) as Volunteer;
    setFields({});
    setBusy(true);
    try {
      await onSave(data);
      if (!initial) form.reset();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Falha na conexão. Tente novamente.");
      if (reason instanceof ApiError) {
        const errors = Object.fromEntries(controls.filter(({ name }) => Object.hasOwn(reason.fields, name))
          .map(({ name }) => [name, apiFieldMessage(name, reason.fields[name])]));
        focusField.current = Object.keys(errors).length > 0;
        setFields(errors);
      }
    } finally {
      setBusy(false);
    }
  }

  function fieldProps(name: Field) {
    return {
      name,
      id: name,
      required: true,
      "aria-invalid": !!fields[name],
      "aria-describedby": fields[name] ? `${name}-erro` : undefined,
      onInput: () => {
        if (!fields[name]) return;
        setFields((current) => ({ ...current, [name]: "" }));
      },
    };
  }

  function fieldError(name: Field) {
    return fields[name] && <p className="erro-cadastro" id={`${name}-erro`}>{fields[name]}</p>;
  }

  const invalidFields = Object.entries(fields).filter(([, message]) => message);

  return <form ref={formRef} noValidate onSubmit={submit} aria-busy={busy}>
    {invalidFields.length > 0 ? (
      <div className="alerta alerta-erro resumo-erros" role="alert">
        <p><strong>Corrija os campos abaixo para continuar.</strong></p>
        <ul>
          {invalidFields.map(([name, message]) => (
            <li key={name}>
              <a href={`#${name}`} onClick={(event) => {
                event.preventDefault();
                const field = formRef.current?.elements.namedItem(name);
                if (field instanceof HTMLElement) {
                  field.focus({ preventScroll: true });
                  field.closest(".campo-formulario")?.scrollIntoView({ block: "center", behavior: "instant" });
                }
              }}>{fieldLabels.get(name)}: {message}</a>
            </li>
          ))}
        </ul>
      </div>
    ) : error && <p className="alerta alerta-erro" role="alert">{error}</p>}
    {groups.map(({ title, fields: inputs }) => (
      <fieldset key={title} disabled={busy}>
        <legend>{title}</legend>
        <div className="campos-cadastro">
          {inputs.map(({ name, label, ...props }) => {
            const mask = masks[name];
            return <div key={name} className="campo-formulario">
              <label htmlFor={name}>{label}</label>
              <input {...props} {...fieldProps(name)}
                max={name === "data_nascimento" ? maxDate : undefined}
                defaultValue={mask ? mask(initial?.[name] ?? "") : initial?.[name]}
                onChange={mask ? (event) => {
                  const input = event.currentTarget;
                  const before = input.value;
                  const cursor = input.selectionStart ?? before.length;
                  const masked = mask(before);
                  if (before !== masked) {
                    input.value = masked;
                    const position = Math.max(0, cursor + masked.length - before.length);
                    input.setSelectionRange(position, position);
                  }
                } : undefined}
              />
              {fieldError(name)}
            </div>;
          })}
          {title === "Endereço" && <div className="campo-formulario">
            <label htmlFor="estado">Estado</label>
            <select {...fieldProps("estado")} autoComplete="address-level1" defaultValue={initial?.estado ?? ""}>
              <option value="" disabled>Selecione...</option>
              {states.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
            </select>
            {fieldError("estado")}
          </div>}
        </div>
      </fieldset>
    ))}
    <fieldset disabled={busy}>
      <legend>Motivação</legend>
      <div className="campo-formulario">
        <label htmlFor="mensagem">Por que quer ser voluntário?</label>
        <textarea {...fieldProps("mensagem")} minLength={20} maxLength={500} defaultValue={initial?.mensagem} />
        {fieldError("mensagem")}
      </div>
    </fieldset>
    <button type="submit" disabled={busy}>{busy ? "Enviando…" : action}</button>
  </form>;
}
