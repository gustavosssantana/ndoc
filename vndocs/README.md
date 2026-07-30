# ndocs

Template `.docx` com `{{campos}}` + planilha `.xlsx` → lote de documentos preenchidos em `.zip`.

Um único projeto: o front é buildado como estático, o motor roda como funções
serverless em `/api`, e os dados ficam em Postgres com os arquivos no Blob.

## Rodando local

```bash
npm install
npm run samples      # cria samples/template.docx + samples/data.xlsx
npm run gen          # motor puro, sem HTTP: gera out/documentos.zip
npm run test:all     # testes que não precisam de banco
npx vercel dev       # front + /api juntos na porta 3000
```

Com um Postgres à mão, os testes que tocam o banco:

```bash
export POSTGRES_URL="postgres://usuario:senha@host/base"
npm run db:migrate
npm run test:db
npm run test:routes
```

## Configuração

| Variável | Para quê | Obrigatória |
|---|---|---|
| `POSTGRES_URL` | conexão com o banco | sim |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob | em produção |
| `SIGNUP_CODE` | exige código de convite no cadastro | não |
| `VITE_ENGINE_URL` | base da API no front | não |

Na Vercel, criar **Storage → Neon Postgres** e **Storage → Blob** injeta
`POSTGRES_URL` e `BLOB_READ_WRITE_TOKEN` sozinho. Depois rode
`npm run db:migrate` uma vez com a `POSTGRES_URL` do Neon.

Sem `BLOB_READ_WRITE_TOKEN`, o armazenamento cai para uma pasta local
(`.local-blob/`) com a mesma interface — é assim que os testes rodam.

**Defina `SIGNUP_CODE`** se você não quer que o cadastro fique aberto. Com ela
definida, criar conta exige o código; sem ela, qualquer pessoa que alcance a
URL abre uma conta.

Para abrir a primeira conta sem passar pela tela:

```bash
npm run db:seed -- seu@email.com "sua senha com 8+" "Seu Nome" "Sua Empresa"
```

## Conferindo que está tudo de pé

```bash
npm run demo -- seu@email.com "sua senha com 8+"
```

Esse comando percorre o app inteiro pelas rotas reais e imprime cada etapa:
cria a conta, tenta entrar com senha errada, entra com a certa, salva um
template e uma planilha, confere o encaixe dos campos, gera o lote, lista o
que cada tela passa a mostrar, e por fim confirma que sem sessão as rotas
respondem 401. Pode rodar quantas vezes quiser.

É a forma mais rápida de saber se o banco, o storage e as variáveis de
ambiente estão certos — antes de abrir o navegador.

## Estrutura

```
api/                  funções serverless
├── health.js         GET    /api/health
├── inspect.js        POST   /api/inspect
├── generate.js       POST   /api/generate
├── folders.js        GET · POST            /api/folders
├── templates.js      GET · POST · DELETE   /api/templates
├── sheets.js         GET · POST · DELETE   /api/sheets
├── generations.js    GET    /api/generations
├── dashboard.js      GET    /api/dashboard
├── usage.js          GET    /api/usage
├── account.js        GET · PATCH           /api/account
├── auth/
│   ├── register.js   POST   /api/auth/register
│   ├── login.js      POST   /api/auth/login
│   ├── logout.js     POST   /api/auth/logout
│   └── me.js         GET    /api/auth/me
└── _lib.js           multipart, limites, sessão, erros

lib/                  regra de negócio, sem HTTP
├── template.js       lê e preenche o .docx
├── xlsx.js           lê a planilha
├── generate.js       monta o lote e o .zip
├── db.js             pool de conexões e conta ativa
├── repo.js           consultas, no formato que as telas consomem
├── storage.js        Blob em produção, pasta local nos testes
├── auth.js           senha (scrypt), sessões, cookie
└── plans.js          limites de cada plano

db/001_init.sql       schema
db/002_auth.sql       senha e sessões
src/                  front (React + Vite)
```

## Banco

Sete tabelas: `users`, `sessions`, `folders`, `templates`, `sheets`,
`generations`, `usage_counters`. Todas as tabelas de conteúdo têm `user_id` desde o início,
apontando hoje para uma conta única — quando o login entrar, é só passar a
criar usuários de verdade e nada aqui muda.

Duas decisões que valem registro:

`generations` guarda `template_name` e `sheet_name` como **cópia** do nome no
momento da geração. O histórico continua legível depois de o arquivo ser
apagado — e há teste cobrindo isso.

Gravar a geração e incrementar o contador acontecem na **mesma transação**.
Histórico e consumo não podem discordar.

## O que já é real

| Tela | Origem dos dados |
|---|---|
| Gerar Documentos | motor, ao vivo |
| Biblioteca | `GET /api/folders` |
| Histórico | `GET /api/generations` |
| Dashboard | `GET /api/dashboard` + `/api/account` |
| Plano e cobrança | `GET /api/account` (plano atual e consumo) |
| Configurações | `GET/PATCH /api/account` — salva no banco |
| Sidebar e Topbar | `GET /api/account` e `/api/generations` |

Não existe mais nenhum dado inventado no front. O antigo
`src/services/mockData.js` foi apagado.

## Autenticação

Sessão de verdade, com senha e cookie — não há mais nada em `localStorage`.

**Senha** guardada com `scrypt` (`node:crypto`, sem dependência nova): função
lenta, com sal aleatório por senha, e comparação em tempo constante. Dois
cadastros com a mesma senha geram hashes diferentes. Regras mínimas: 8
caracteres, com letra e número.

**Sessão** é um token aleatório de 32 bytes num cookie `HttpOnly`,
`SameSite=Lax` e `Secure` em produção. O JavaScript da página nunca lê o
token, o que fecha a porta para roubo por XSS. No banco fica só o SHA-256 do
token — um vazamento do banco não dá acesso a ninguém.

A sessão vive na tabela `sessions`, e não apenas num cookie assinado, para
poder ser **revogada**: sair de um aparelho derruba o acesso na hora.

**Mensagem de erro única** para e-mail inexistente e senha errada, e o mesmo
custo de tempo nos dois casos — dizer qual dos dois falhou entregaria quais
e-mails existem no sistema.

Todas as rotas de `/api` exigem sessão e respondem 401 sem ela. As únicas
exceções são `/api/health` e as próprias rotas de entrada. **Cada conta só vê
os próprios dados**, e há teste cobrindo isso: uma segunda conta registrada no
mesmo banco não enxerga nenhuma pasta nem geração da primeira.

## O que ainda falta

**Cobrança.** O Stripe ainda não está ligado. A tela de planos mostra o plano
atual e o consumo, mas o botão de upgrade não cobra nada.

**Equipes.** Os planos anunciam 3 e 10 usuários; não existe conceito de
equipe — cada conta é isolada e sozinha.

**Recuperação de senha.** Não há "esqueci minha senha". O botão existe na tela
e não faz nada. Precisa de envio de e-mail.

**PDF.** O plano Pro anuncia "DOCX e PDF"; o motor só gera `.docx`.

**API pública e webhooks.** Anunciados no plano Business, não implementados.

**Lotes grandes.** O limite é 60 s por requisição e 4 MB por upload. Milhares
de linhas pedem fila com processamento em background, e arquivos grandes
pedem upload direto para o Blob.

**LGPD.** O banco agora guarda CPF, endereço e valores. Entram obrigações de
base legal, retenção e exclusão — vale desenhar antes de crescer.

## Testes

178 verificações em quatro suítes.

| Comando | Cobre | Precisa de banco |
|---|---|---|
| `npm test` | motor puro: leitura do `.docx` e da planilha, montagem do lote, e as funções de senha | não |
| `npm run test:ui` | as 8 rotas em jsdom, o fluxo de login pela tela, e se cada tela busca da API e mostra o dado | não |
| `npm run test:db` | schema, consultas, transação de consumo, formatos | sim |
| `npm run test:routes` | as 14 rotas ponta a ponta, autenticação, logout e isolamento entre contas | sim |

`npm run test:all` roda as duas primeiras.

O conjunto de UI existe por um motivo concreto: `vite build` compila sem
reclamar mesmo quando o app não renderiza. A primeira versão publicada deu
tela branca porque `main.jsx` não montava os providers, e o build passou.
Ele também verifica o contrário do que se costuma testar — que os números
inventados de antes **desapareceram** (`2.847`, `João Silva`, os 41 registros
falsos do histórico), e que gravar `gt_session` no `localStorage` **não** cria
mais uma sessão: era exatamente assim que a autenticação antiga era burlada
pelo console do navegador.

## Bugs corrigidos que vale conhecer

Todos vinham do código original e nenhum aparecia no build:

- `main.jsx` não montava `AuthProvider` nem `ToastProvider` → tela branca.
- `Login.jsx` e `Register.jsx` navegavam para `/` sem criar sessão → laço
  infinito de volta para o login.
- `Biblioteca.jsx` esperava `f.template.file` e `f.sheets[]`; os dados
  entregavam texto e número.
- `History.jsx` filtrava por `'done'`/`'error'`; o resto do sistema usava
  `completed`/`failed`. Padronizado no que o banco grava.
- `History.jsx` calculava as estatísticas num `useMemo` com dependências
  vazias — com dado assíncrono, nunca recalculava.
- O "tempo médio" do histórico lia `"14:02"` com `parseFloat` e obtinha `14`.
  Agora vem de `elapsed_ms`.
- `Topbar.jsx` renderizava `{n.icon}` com um componente React como valor.
- Três arquivos apontavam para `/logo.png`, que não existia.
- `/api/inspect` ficou sem verificação de sessão quando as outras rotas foram
  fechadas — qualquer um poderia gastar o processamento. Só apareceu porque o
  teste sem banco quebrou.

## Nota sobre a origem

Os arquivos chegaram ao GitHub por upload direto, num único commit, com os
nomes embaralhados: `vite.config.js` continha a tela de cadastro, `logo.png`
era a tela de configurações, `README.md` era o `.gitignore`. Os 34 arquivos
foram reidentificados pelo conteúdo e realocados. `MAPA-DOS-ARQUIVOS.md`
guarda o de-para completo.
