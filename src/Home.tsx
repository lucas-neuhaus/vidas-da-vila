import imagemCestas from "../imagens/cestas-solidarias.avif";

export function Home() {
  return (
    <>
    <section aria-labelledby="titulo-quem-somos">
      <h2 id="titulo-quem-somos">Quem nós somos</h2>

      <figure>
        <img
          src={imagemCestas}
          alt="Voluntários de camiseta preta entregando cestas básicas a moradores em uma mesa ao ar livre, com a fachada pintada 'Vila Aparecida, Florianópolis - SC' ao fundo"
          width="1200"
          height="800"
          loading="lazy"
        />

        <figcaption>
          Entrega de cestas básicas na Vila Aparecida, um dos momentos do
          nosso projeto Cestas Solidárias.
        </figcaption>
      </figure>

      <p>
        Há 8 anos, o Instituto Vidas da Vila Aparecida atua dentro da própria
        comunidade, oferecendo reforço escolar, atividades esportivas e apoio
        a famílias em situação de vulnerabilidade. Tudo o que fazemos nasce de
        quem mora e conhece as necessidades daqui.
      </p>
    </section>

    <section aria-labelledby="titulo-missao">
      <h2 id="titulo-missao">Nossa Missão</h2>

      <p>
        Acreditamos que educação e pertencimento comunitário transformam
        trajetórias. Por isso, oferecemos reforço escolar gratuito, um time de
        futebol para crianças e adolescentes, e distribuição mensal de cestas
        básicas para famílias cadastradas.
      </p>
    </section>

    <section aria-labelledby="titulo-contato">
      <h2 id="titulo-contato">Contato</h2>

      <address>
        <p>
          E-mail:
          <a href="mailto:contato@vidasvilaaparecida.org.br">
            contato@vidasvilaaparecida.org.br
          </a>
        </p>

        <p>
          Telefone:
          <a href="tel:+5548999999999">(48) 99999-9999</a>
        </p>

        <p>
          Endereço: Rua da Fonte, 000 — Vila Aparecida, Florianópolis - SC
        </p>
      </address>
    </section>

    <section aria-labelledby="titulo-depoimentos">
      <h2 id="titulo-depoimentos">Depoimentos</h2>

      <article>
        <h3 className="visualmente-oculto">
          Depoimento de Maria das Graças
        </h3>

        <blockquote>
          <p>
            Antes do reforço escolar, meu filho ficava sozinho em casa
            enquanto eu trabalhava. Hoje ele estuda, faz amigos e participa do
            time de futebol. Isso mudou a rotina da nossa família inteira.
          </p>
        </blockquote>

        <footer className="rodape-depoimento">
          <p>Maria das Graças, moradora da Vila Aparecida</p>
        </footer>
      </article>

      <article>
        <h3 className="visualmente-oculto">
          Depoimento de Rafael Andrade
        </h3>

        <blockquote>
          <p>
            Fui voluntário por seis meses dando aula de reforço aos sábados. O
            que mais me marcou foi ver o quanto uma tarde de atenção muda o
            jeito de uma criança encarar a escola.
          </p>
        </blockquote>

        <footer className="rodape-depoimento">
          <p>Rafael Andrade, ex-voluntário</p>
        </footer>
      </article>
    </section>
    </>
  );
}
