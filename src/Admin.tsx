import { useRef, useState, type FormEvent } from "react";
import { api, ApiError } from "./api";
import { VolunteerForm, type Volunteer } from "./VolunteerForm";

type Summary = { id: string; nome: string; created_at: string };
type Detail = Volunteer & Summary;
const path = "/admin/volunteers";
const pageSize = 25;

export function Admin() {
  const [token, setToken] = useState("");
  const [records, setRecords] = useState<Summary[]>([]);
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<Detail | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const confirmDelete = useRef<HTMLDialogElement>(null);

  function signOut() {
    setToken("");
    setRecords([]);
    setSelected(null);
    setOffset(0);
    setNotice("");
    setError("");
  }

  function report(reason: unknown) {
    if (reason instanceof ApiError && reason.status === 401) signOut();
    setError(reason instanceof ApiError ? reason.message : "Falha na conexão. Tente novamente.");
  }

  async function load(credential: string, position: number) {
    const list = await api<Summary[]>(`${path}?limit=${pageSize}&offset=${position}`, {}, credential);
    setRecords(list);
    setOffset(position);
  }

  async function run(operation: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try { await operation(); } catch (reason) { report(reason); } finally { setBusy(false); }
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const credential = String(new FormData(event.currentTarget).get("token")).trim();
    await run(async () => {
      await load(credential, 0);
      setToken(credential);
    });
  }

  async function save(volunteer: Volunteer) {
    if (!selected) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const updated = await api<Detail>(`${path}/${selected.id}`, {
        method: "PUT", body: JSON.stringify(volunteer),
      }, token);
      setSelected(updated);
      setRecords((list) => list.map((item) => item.id === updated.id ? updated : item));
      setNotice("Cadastro atualizado.");
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) report(reason);
      throw reason;
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!selected) return;
    confirmDelete.current?.close();
    await run(async () => {
      await api<void>(`${path}/${selected.id}`, { method: "DELETE" }, token);
      setSelected(null);
      setRecords((list) => list.filter((item) => item.id !== selected.id));
      setNotice("Cadastro excluído.");
      await load(token, records.length === 1 ? Math.max(0, offset - pageSize) : offset);
    });
  }

  return <section aria-labelledby="admin-title">
    <h2 id="admin-title">Área administrativa</h2>
    {error && <p className="alerta alerta-erro" role="alert">{error}</p>}
    {notice && <p className="alerta alerta-sucesso" role="status">{notice}</p>}
    {!token ? <form onSubmit={login}>
      <div className="campo-formulario">
        <label htmlFor="token">Token administrativo</label>
        <input id="token" name="token" type="password" autoComplete="off" required />
      </div>
      <button disabled={busy}>{busy ? "Verificando…" : "Acessar"}</button>
    </form> : <>
      <div className="admin-actions">
        <button disabled={busy} onClick={signOut}>Sair</button>
        {selected && <button disabled={busy} onClick={() => setSelected(null)}>Voltar à lista</button>}
      </div>
      {selected ? <>
        <h3>Editar cadastro</h3>
        <VolunteerForm key={selected.id} initial={selected} action="Salvar alterações" onSave={save} />
        <div className="admin-actions">
          <button disabled={busy} onClick={() => confirmDelete.current?.showModal()}>Excluir cadastro</button>
        </div>
        <dialog ref={confirmDelete} className="info-dialog" aria-labelledby="delete-title">
          <div className="modal-conteudo">
            <h3 id="delete-title">Excluir cadastro de {selected.nome}?</h3>
            <p>Esta ação remove o cadastro do banco de dados.</p>
            <div className="admin-actions">
              <button onClick={() => confirmDelete.current?.close()}>Cancelar</button>
              <button onClick={remove}>Confirmar exclusão</button>
            </div>
          </div>
        </dialog>
      </> : <>
        <h3>Histórico de cadastros</h3>
        {busy && <p role="status">Carregando cadastros…</p>}
        {records.length === 0 && <p>Nenhum cadastro nesta página.</p>}
        <ul className="admin-records">
          {records.map((item) => <li key={item.id}>
            <button disabled={busy} onClick={() => run(async () => {
              setSelected(await api<Detail>(`${path}/${item.id}`, {}, token));
            })}>{item.nome}</button>{" "}
            <time dateTime={item.created_at}>{new Date(item.created_at).toLocaleDateString("pt-BR")}</time>
          </li>)}
        </ul>
        <div className="admin-actions">
          <button disabled={busy || offset === 0} onClick={() => run(() => load(token, offset - pageSize))}>Anterior</button>
          <button disabled={busy || records.length < pageSize}
            onClick={() => run(() => load(token, offset + pageSize))}>Próxima</button>
        </div>
      </>}
    </>}
  </section>;
}
