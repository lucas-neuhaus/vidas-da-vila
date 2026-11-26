import { useEffect, useState } from "react";
import { InformationDialog } from "./InformationDialog";
import { api } from "./api";

type Project = {
  slug: string;
  title: string;
  description: string;
  status: string;
  label: string;
};

const badges: Record<string, string> = {
  active: "badge-sucesso",
  volunteers: "badge-aviso",
  monthly: "badge-info",
};

function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    api<Project[]>("/projects", { signal: controller.signal }).then(
      (items) => { setProjects(items); setStatus("ready"); },
      () => { if (!controller.signal.aborted) setStatus("error"); },
    );
    return () => controller.abort();
  }, [attempt]);

  if (status === "loading") return <p role="status">Carregando projetos…</p>;
  if (status === "error") {
    return <div className="alerta alerta-erro" role="alert">
      <p>Não foi possível carregar os projetos.</p>
      <button onClick={() => { setStatus("loading"); setAttempt(attempt + 1); }}>
        Tentar novamente
      </button>
    </div>;
  }
  if (!projects.length) return <p>Nenhum projeto disponível.</p>;

  return <div className="grid-12">
    {projects.map((project) => (
      <article key={project.slug} className="col-md-6 col-lg-4">
        <div className="cabecalho-card">
          <span className={`badge ${badges[project.status] ?? "badge-info"}`}>{project.label}</span>
          <h3>{project.title}</h3>
        </div>
        <p>{project.description}</p>
      </article>
    ))}
  </div>;
}

export function Projects() {
  return (
    <>
    <section aria-labelledby="titulo-projetos">
      <h2 id="titulo-projetos">Nossos Projetos</h2>

      <ProjectList />
    </section>

    <section id="voluntariado" aria-labelledby="titulo-voluntariado">
      <h2 id="titulo-voluntariado">Como se Voluntariar</h2>

      <p>
        Cada uma das nossas frentes de atuação depende de voluntários para
        funcionar. Confira as oportunidades abertas no momento:
      </p>

      <ul>
        <li>Professor(a) voluntário(a) no reforço escolar</li>
        <li>Técnico(a) ou auxiliar no time de futebol</li>
        <li>Apoio na triagem e entrega das cestas solidárias</li>
      </ul>

      <p>
        <a className="acao-voluntariado" href="#/cadastro">Quero me cadastrar como voluntário</a>
      </p>
    </section>

    <section id="doacao" aria-labelledby="titulo-doacao">
      <h2 id="titulo-doacao">Como Doar</h2>

      <p>
        As doações sustentam diretamente os três projetos acima. Você pode
        contribuir das seguintes formas:
      </p>

      <dl>
        <dt>Pix</dt>
        <dd>doacoes@vidasvilaaparecida.org.br</dd>

        <dt>Transferência bancária</dt>
        <dd>Banco 000, Agência 0001, Conta 00000-0</dd>

        <dt>Doação de itens</dt>
        <dd>
          Alimentos não perecíveis e materiais escolares podem ser entregues
          na sede, de segunda a sexta, das 9h às 17h.
        </dd>
      </dl>

      <InformationDialog id="doacao-info" title="Orientações para doação" trigger="Ver orientações para doação">
<p>
          Antes de realizar uma doação de itens, entre em contato com o
          Instituto para confirmar quais materiais são necessários no momento.
        </p>
<p>
          Alimentos devem estar dentro do prazo de validade e com a embalagem
          íntegra.
        </p>
</InformationDialog>
    </section>
    </>
  );
}
