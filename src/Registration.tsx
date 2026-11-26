import { useEffect, useState } from "react";
import { api } from "./api";
import { InformationDialog } from "./InformationDialog";
import { VolunteerForm, type Volunteer } from "./VolunteerForm";

export function Registration() {
  const [total, setTotal] = useState<number | "error" | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [confirmation, setConfirmation] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    api<{ total: number }>("/volunteers/count", { signal: controller.signal }).then(
      (response) => setTotal(response.total),
      () => { if (!controller.signal.aborted) setTotal("error"); },
    );
    return () => controller.abort();
  }, [attempt]);

  async function register(volunteer: Volunteer) {
    const result = await api<{ message: string }>("/volunteers", {
      method: "POST",
      body: JSON.stringify(volunteer),
    });
    setConfirmation(result.message);
    setAttempt((current) => current + 1);
  }

  return <section aria-labelledby="titulo-cadastro">
    <h2 id="titulo-cadastro">Formulário de Cadastro</h2>
    <div className="alerta alerta-info">
      <p><strong>Cadastro de voluntários.</strong> Preencha os campos obrigatórios.</p>
      <InformationDialog id="voluntariado-info" title="Como funciona o voluntariado?"
        trigger="Como funciona o voluntariado?">
        <p>
          Após o cadastro, a equipe da ONG poderá entrar em contato para apresentar as atividades
          disponíveis e alinhar a participação de acordo com o perfil e a disponibilidade do voluntário.
        </p>
      </InformationDialog>
    </div>
    <div className="alerta alerta-sucesso" role="status">
      {total === null ? "Carregando total de cadastros…" : total === "error"
        ? <>Total indisponível. <button onClick={() => {
          setTotal(null);
          setAttempt(attempt + 1);
        }}>Tentar novamente</button></>
        : <><strong>Voluntários cadastrados:</strong> {total}</>}
    </div>
    <VolunteerForm action="Cadastrar" onSave={register} />
    {confirmation && <div className="toast toast-sucesso" role="status">
      <strong>{confirmation}</strong>
      <button className="toast-fechar" aria-label="Fechar notificação" onClick={() => setConfirmation("")}>
        ×
      </button>
    </div>}
  </section>;
}
