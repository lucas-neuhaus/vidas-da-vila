import { useEffect, useRef, useState, type MouseEvent } from "react";
import logo from "../imagens/logo.webp";
import { Home } from "./Home";
import { Projects } from "./Projects";
import { Registration } from "./Registration";
import { Admin } from "./Admin";

const links = [
  ["/home", "Home"],
  ["/projetos", "Projetos"],
  ["/cadastro", "Cadastro"],
] as const;

function currentRoute() {
  return window.location.hash.slice(1) || "/home";
}

function Header({ route }: { route: string }) {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem("tema") === "escuro"; } catch { return false; }
  });
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    document.documentElement.dataset.tema = dark ? "escuro" : "claro";
    try { localStorage.setItem("tema", dark ? "escuro" : "claro"); } catch { /* preference is optional */ }
  }, [dark]);

  function closeOnLink(event: MouseEvent<HTMLElement>) {
    if (event.target instanceof Element && event.target.closest("a")) setOpen(false);
  }

  return (
    <header onKeyDown={(event) => {
      if (event.key === "Escape" && open) { setOpen(false); menuButton.current?.focus(); }
    }}>
      <div className="cabecalho-conteudo">
        <div className="cabecalho-marca">
          <a href="#/home" className="link-logo" aria-label="Instituto Vidas da Vila Aparecida — página inicial">
            <img src={logo} alt="" width="320" height="168" />
          </a>
          <h1>Instituto Vidas da Vila Aparecida</h1>
        </div>
        <button type="button" ref={menuButton} className="menu-toggle" aria-expanded={open}
          aria-controls="menu-principal" onClick={() => setOpen(!open)}>
          <span className="menu-toggle-icone" aria-hidden="true">{open ? "×" : "☰"}</span>
          <span>Menu</span>
        </button>
        <button type="button" className="tema-toggle" aria-pressed={dark} onClick={() => setDark(!dark)}>
          <span className="tema-toggle-icone" aria-hidden="true">{dark ? "☀️" : "🌙"}</span>
          <span>{dark ? "Modo claro" : "Modo escuro"}</span>
        </button>
        <nav className="nav-principal" aria-label="Navegação principal" onClick={closeOnLink}>
          <ul id="menu-principal" className={`menu-principal ${open ? "is-open" : ""}`}>
            {links.map(([path, label]) => (
              <li key={path} className={path === "/projetos" ? "menu-item-com-submenu" : undefined}>
                <a href={`#${path}`} aria-current={route === path ? "page" : undefined}>{label}</a>
                {path === "/projetos" && <ul className="submenu">
                  <li><a href="#/projetos">Projetos ativos</a></li>
                  <li><a href="#/projetos/voluntariado">Voluntariado</a></li>
                  <li><a href="#/projetos/doacao">Como doar</a></li>
                </ul>}
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}

export function App() {
  const [route, setRoute] = useState(currentRoute);
  const main = useRef<HTMLElement>(null);

  useEffect(() => {
    const onHashChange = () => setRoute(currentRoute());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    main.current?.focus();
    const section = route === "/projetos/doacao" ? "doacao"
      : route === "/projetos/voluntariado" ? "voluntariado" : null;
    if (section) document.getElementById(section)?.scrollIntoView();
  }, [route]);

  const projects = route === "/projetos" || route.startsWith("/projetos/");
  return <>
    <a className="pular-para-conteudo" href="#app" onClick={(event) => {
      event.preventDefault();
      main.current?.focus();
    }}>Pular para o conteúdo</a>
    <Header route={route} />
    <main id="app" tabIndex={-1} ref={main}>
      {projects ? <Projects /> : route === "/cadastro" ? <Registration />
        : route === "/admin" ? <Admin /> : <Home />}
    </main>
    <footer className="rodape-pagina">
      <p>&copy; 2026 Instituto Vidas da Vila Aparecida. Todos os direitos reservados.</p>
      <p><a href="#/admin">Área administrativa</a></p>
    </footer>
  </>;
}
