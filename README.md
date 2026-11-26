# Instituto Vidas da Vila Aparecida

Aplicação acadêmica de um instituto fictício da Vila Aparecida, em Florianópolis (SC). O site apresenta ações de educação, esporte e assistência comunitária. Interessados podem se cadastrar como voluntários, e a equipe pode consultar, editar e excluir os cadastros pela área administrativa.

## Arquitetura

React, TypeScript e Vite compõem a interface. A API REST usa Python 3.12, FastAPI e Pydantic para validação e documentação OpenAPI. SQLAlchemy e psycopg conectam a API ao PostgreSQL 17. Alembic registra a evolução do esquema e carrega os três projetos institucionais originais.

O frontend usa rotas por hash e chama `/api` pela mesma origem. Em desenvolvimento, o Vite encaminha essas requisições para a API. No Compose, o Nginx serve a build e encaminha a API.

| Caminho | Conteúdo |
| --- | --- |
| `src/` | Páginas, componentes React, cliente HTTP e testes unitários |
| `css/` e `imagens/` | Identidade visual e imagens do site |
| `backend/app/` | API, modelos, validação, persistência e carga demonstrativa |
| `backend/migrations/` | Migrations Alembic |
| `backend/tests/` | Testes da API com banco real |
| `tests/e2e/` | Testes Playwright da build no Chromium |
| `deploy/` | Imagem do frontend e configuração Nginx |
| `.github/workflows/` | Verificações de integração contínua |

## Execução com Docker Compose

Pré-requisitos: Git, Docker e Docker Compose v2. Os exemplos de terminal usam Bash, disponível no Git Bash e no WSL para Windows.

```bash
git clone https://github.com/lucas-neuhaus/vidas-da-vila.git
cd vidas-da-vila
git switch feature/full-stack-modernization
cp .env.example .env
```

Edite `.env`. Escolha uma senha local com caracteres seguros para URL, como letras, números, hífen e sublinhado. Gere um token aleatório com `python -c "import secrets; print(secrets.token_urlsafe(32))"` e atribua o resultado a `ADMIN_API_TOKEN`.

```bash
docker compose up --build -d
docker compose ps
curl -f http://localhost:8080/api/health
```

Acesse <http://localhost:8080>. A documentação interativa está em <http://localhost:8080/api/docs>. Use o token configurado na página **Área administrativa**, disponível no rodapé. O Compose aplica as migrations na inicialização da API. O volume nomeado mantém os dados entre reinicializações. Para encerrar, execute `docker compose down`.

### Variáveis de ambiente

| Variável | Uso |
| --- | --- |
| `POSTGRES_USER` | Usuário do banco no Compose. Padrão `vidas`. |
| `POSTGRES_DB` | Nome do banco no Compose. Padrão `vidas_dev`. |
| `POSTGRES_PASSWORD` | Senha do banco no Compose. |
| `DATABASE_URL` | URL SQLAlchemy da API, no formato `postgresql+psycopg://usuario:senha@host:porta/banco`. O Compose monta a sua própria URL interna. |
| `ADMIN_API_TOKEN` | Credencial Bearer com pelo menos 32 caracteres ASCII. |
| `API_PROXY_TARGET` | Destino opcional do proxy Vite. Padrão `http://127.0.0.1:8000`. |

### Dados fictícios e pgAdmin

```bash
docker compose exec api python -m app.seed_demo
docker compose exec api alembic current
```

A carga demonstrativa insere um cadastro fictício apenas em um banco com sufixo `_dev` e pode ser repetida. No pgAdmin, conecte a `127.0.0.1:5432` com as credenciais locais e selecione `vidas_dev` (ou o nome configurado). Abra a Query Tool e execute:

```sql
SELECT version_num FROM alembic_version;
SELECT slug, title, status FROM projects ORDER BY position;
SELECT count(*) AS total_cadastros FROM volunteers;
```

Com o ambiente recém-criado, a versão esperada é `0002`, o catálogo contém três projetos e o total passa a um após executar a carga demonstrativa.

## Desenvolvimento sem Docker

Instale Git, Node.js 24 com npm, Python 3.12 e PostgreSQL 17. Crie o banco `vidas_dev` e um usuário com permissão para criar tabelas nesse banco. Copie `.env.example` para `.env`, ajuste `DATABASE_URL` e configure o token. Em uma senha que contenha caracteres reservados de URL, aplique codificação percentual ao componente de senha.

No primeiro terminal:

```bash
set -a
source .env
set +a
cd backend
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-dev.txt
alembic upgrade head
alembic current
python -m uvicorn app.main:app --reload
```

No Windows com Python nativo e Git Bash, ative com `source .venv/Scripts/activate`. No segundo terminal, na raiz do repositório:

```bash
npm ci
npm run dev
```

Abra <http://localhost:5173>. Use `npm run build` para gerar `dist/` e `npm run preview` para verificar essa build localmente com a API em execução.

## Funcionalidades e API

- Home institucional, projetos carregados do banco, orientação de doação e formulário de voluntariado.
- Tema claro e escuro, menu responsivo, foco de navegação, modais nativos e estados de carregamento, erro e confirmação.
- Cadastro público com validação no servidor e normalização de CPF, telefone e CEP. O CPF tem restrição de unicidade no banco. Reenvios válidos com CPF cadastrado retornam a mesma confirmação e preservam o cadastro anterior.
- Área administrativa com autenticação Bearer, lista paginada, consulta, atualização e exclusão com confirmação. O token fica em memória no frontend e precisa ser informado após recarregar ou sair da área.
- Cadastros anteriores no `localStorage` continuam no navegador de origem. A versão atual persiste os novos envios no banco. A transferência de registros legados depende de revisão e reenvio autorizado, já que esses registros podem conter dados pessoais e CPFs que não passam na validação atual.

| Rotas | Acesso |
| --- | --- |
| `GET /api/health`, `GET /api/projects`, `GET /api/volunteers/count` | Público |
| `POST /api/volunteers` | Público, resposta sem dados pessoais |
| `GET /api/admin/volunteers` | Administrativo, lista paginada com `limit` e `offset` |
| `GET`, `PUT`, `DELETE /api/admin/volunteers/{id}` | Administrativo |

## Testes

Frontend, na raiz:

```bash
npm ci
npm run check
npm test
npm run build
```

API, com dependências de desenvolvimento instaladas e um PostgreSQL dedicado cujo banco termine em `_test`. Configure `DATABASE_URL` para esse banco e `ADMIN_API_TOKEN` para um token exclusivo de teste. A suíte limpa os cadastros entre testes.

```bash
cd backend
ruff check .
ruff format --check .
alembic upgrade head
alembic check
python -m pytest -q
```

Para validar migrations de ida e volta, execute `alembic downgrade base` e `alembic upgrade head` **apenas no banco descartável de testes**. O downgrade apaga as tabelas da aplicação.

Para rodar os testes de navegador, inicie a API na porta 8000 com as mesmas variáveis de teste. Na raiz, com essas variáveis exportadas, execute:

```bash
npm run build
npx playwright install chromium
npm run test:e2e
```

Os testes cobrem navegação móvel e foco do modal por teclado, cadastro, persistência após recarregar a página, rejeição de token inválido, edição e exclusão. A suíte da API também testa validação, unicidade, autorização e consulta direta ao PostgreSQL.

## Implantação

Sirva `dist/` na raiz do domínio e encaminhe `/api/` à aplicação FastAPI pela mesma origem. Execute as migrations como etapa única do release antes de iniciar ou atualizar réplicas da API. Use HTTPS, banco em rede privada, segredos gerenciados, backups testados e controle de acesso ao ambiente. O proxy incluído limita o tamanho das requisições e a frequência de chamadas a cadastro e administração. Se houver outro proxy à frente, configure a identificação do IP de origem apenas para proxies confiáveis.

O token é compartilhado pelo perfil operador. Para uso com equipes e dados reais, avalie contas individuais, trilha de auditoria e as regras de coleta e retenção de dados pessoais da instituição. Os dados de contato e doação da demo são fictícios e devem ser substituídos antes de uma publicação real.

O GitHub Pages hospeda a versão institucional anterior. Uma implantação full-stack precisa de servidor para a API e PostgreSQL. O workflow deste projeto valida o código e evita publicação automática.
