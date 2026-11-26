import { useRef, type ReactNode } from "react";

export function InformationDialog({ id, title, trigger, children }: {
  id: string;
  title: string;
  trigger: string;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  return <>
    <button type="button" className="botao-modal" onClick={() => dialog.current?.showModal()}>
      {trigger}
    </button>
    <dialog ref={dialog} aria-labelledby={id} className="info-dialog">
      <div className="modal-conteudo">
        <div className="modal-cabecalho">
          <h2 id={id}>{title}</h2>
          <button type="button" className="modal-fechar" aria-label="Fechar"
            onClick={() => dialog.current?.close()}>×</button>
        </div>
        {children}
        <button type="button" className="modal-confirmar" onClick={() => dialog.current?.close()}>
          Entendi
        </button>
      </div>
    </dialog>
  </>;
}
