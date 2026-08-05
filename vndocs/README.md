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
├── download.js       GET    /api/download?tipo=template|sheet&id=…
├── team.js           GET · POST · DELETE   /api/team
├── join.js           GET · POST            /api/join
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
db/003_avatar.sql     foto de perfil
db/004_orgs.sql       biblioteca por empresa, convites, consumo da org
src/                  front (React + Vite)
```

## Biblioteca compartilhada

O conteúdo pertence a uma **empresa** (`orgs`), não a uma pessoa. Todo mundo
da mesma empresa vê os mesmos modelos, planilhas, pastas e histórico, e
divide a mesma cota de gerações.

Quem cadastra ganha a sua organização e é `owner`. Quem entra por código de
convite é `member` — e o código funciona de dois jeitos: no cadastro, ou
dentro do app (`POST /api/join`), para quem já tem conta. Nesse segundo caso,
se a pessoa estava sozinha, os arquivos dela vão junto para a nova empresa. O limite de usuários vem do plano — Starter permite uma
pessoa, então convidar exige subir de plano.

`user_id` continua nas tabelas de conteúdo de propósito: registra quem criou.
O acesso é pela empresa; a autoria é da pessoa.

As consultas em `lib/repo.js` recebem a **conta inteira** e filtram por
`org_id`. Consulta nova precisa usar `org_id` — com `user_id` a pessoa
deixaria de ver o que os colegas criaram.

`npm run test:org` cobre o caso inteiro, incluindo o que mais importa: uma
terceira empresa não vê nada de ninguém.

`GUIA-BIBLIOTECA-COMPARTILHADA.md` explica como convidar, os papéis e onde
mexer em cada regra.

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

**Recuperação de senha.** Não há "esqueci minha senha" — depende de envio de
e-mail. O botão na tela de login está desabilitado, com aviso.

Trocar a senha estando logado **funciona**, em Configurações → Segurança, e
derruba todas as outras sessões.

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

## Sistema visual

A direção é **"o documento bem composto"**: o produto transforma um modelo em
centenas de documentos, e a interface se comporta como um documento bem
impresso — margem generosa, hierarquia clara, tinta escura sobre papel quase
branco, e o acento usado com parcimônia.

**A assinatura é a ficha de campo.** O produto inteiro existe para trocar
`{{nome}}` por "Ana Beatriz Lima". Esse gesto virou um componente
(`src/components/ui/Primitivas.jsx`) que aparece com a mesma forma em toda a
interface, e não só na prévia do contrato. Quem vê uma vez aprende a ler o
resto sem legenda.

**Sobre o azul.** Ele continua sendo a cor da marca, mas passou a ser gasto em
um lugar por tela — a ação principal. Azul em tudo é o oposto de premium;
quem carrega o peso agora é o espaço, a hierarquia e o tipo.

Os tokens ficam no topo de `src/styles/globals.css`: escala neutra de nove
degraus (`--n0` a `--n9`), escala de tamanho de texto, três alturas de
elevação com sombra azulada, e uma curva de animação só. Ter a escala inteira
nomeada acabou com os `rgba(15,23,42,.38)` espalhados, que nunca combinavam
entre si.

**Histórico** troca de forma conforme a tela: tabela no computador, onde as
colunas cabem e a comparação entre linhas é o que interessa; **cartões** no
celular, onde uma tabela de cinco colunas espremeria os nomes de arquivo até
ficarem ilegíveis. Rolar a tabela na horizontal seria mais fácil de escrever
e pior de usar.

**Configurações** é a outra tela de referência do sistema. Nela também saíram duas
mentiras: a aba de Notificações (não há envio de e-mail) e o interruptor de
dois fatores (não há TOTP). No lugar entrou **Aparelhos conectados**, que é o
mesmo assunto — segurança da conta — só que verdadeiro: as sessões existem na
tabela `sessions`, dá para ver qual é a deste aparelho e encerrar as outras.

## Celular

Os estilos do projeto são inline, e estilo inline ganha de media query no
CSS — então a decisão de layout acontece no JavaScript, em
`src/contexts/LayoutContext.jsx`. Ele expõe `useIsMobile()` (até 860px) e
`useIsTablet()` (até 1180px), e os componentes escolhem o estilo a partir daí.

**O `LayoutProvider` vive em `src/main.jsx`, acima de tudo.** Ele já esteve
dentro do `AppLayout`, e isso quebrava em silêncio: as páginas chamam
`useLayout()` antes de montar o `AppLayout`, então ficavam fora do provedor e
recebiam o valor padrão `isMobile: false`. O app parecia responsivo no
componente de layout e não era em nenhuma página.

O que muda até 860px: a barra lateral vira uma gaveta, aberta pelo botão de
menu que aparece na Topbar e fechada ao navegar ou tocar fora; as telas de
login e cadastro escondem o painel de marketing e o formulário ocupa a tela
toda; Biblioteca, Gerar e Configurações deixam de ser duas colunas; a grade
de planos vira uma coluna; e a tabela do histórico rola na horizontal em vez
de espremer.

Na Biblioteca, o celular trata lista e detalhe como **passos**: a lista ocupa
a tela, tocar numa pasta abre o detalhe, e há um caminho de volta. Empilhar os
dois empurraria a lista para fora da tela.

Modais viram **folha que sobe da base**, com alcinha e respeitando a faixa de
gestos do aparelho. Campos usam fonte de 16px no celular, senão o iOS dá zoom
sozinho ao focar.

Listas mostram **silhueta** enquanto carregam, em vez de um spinner: o espaço
já fica reservado e a página não salta quando o dado chega.

Há teste para isso: `npm run test:ui` renderiza as seis telas internas com a
largura de um celular, confere o botão de menu, o painel de marketing que some
e volta, a navegação lista→detalhe da Biblioteca, a folha do modal e a
silhueta de carregamento. O jsdom não avalia
media query, então o teste substitui `matchMedia` por um controlável.

## Primeira visita

Não há tela de boas-vindas. Na primeira vez, um **tutorial guiado** recorta
cada parte da interface e explica o que ela faz — Gerar, Biblioteca,
Histórico, consumo, Equipe — com Próximo, Voltar e Pular. Apontar para o
botão de verdade ensina mais que um texto que ninguém lê.

O componente é `src/components/ui/Tour.jsx`. Cada passo aponta para um
`data-tour` no elemento; se o elemento não estiver na tela, o passo é pulado
em vez de apontar para o vazio. Visto ou pulado, não volta — e dá para rever
em Configurações → Tutorial.

## Nomear os documentos

Gerar pela Biblioteca abre um passo perguntando **como nomear os arquivos**,
com as colunas da planilha em botões, prévia do nome do primeiro arquivo, e
o aviso de que nomes repetidos ganham número em vez de se sobrescrever.

Antes ele gerava direto: todo lote saía `documento_1.docx`,
`documento_2.docx` — inútil num lote de duzentos.

## Botões

Nenhum botão da interface fica sem resposta. Os que dependem de coisas que
ainda não existem aparecem **desabilitados**, com o motivo ao passar o mouse —
um botão apagado se lê como roadmap, um botão que não responde se lê como
defeito.

Na Biblioteca, cada arquivo pode ser **baixado** — pelo ícone no cartão ou
pelo menu. A loja de Blob é privada, então o download passa por
`/api/download`, que confere a sessão e o dono do arquivo antes de entregar
os bytes: trocar o id na barra de endereço não dá acesso a arquivo de outra
conta, e há teste cobrindo isso.

Funcionam: nova pasta, renomear pasta, importar, adicionar planilha à pasta,
baixar modelo e planilha,
remover planilha, atualizar histórico, baixar e regerar um lote, ver no
histórico, descartar alterações, trocar senha, trocar foto de perfil, sair.

Desabilitados com aviso: **apenas o que depende de cobrança** — upgrade,
downgrade, comprar créditos, exportar faturas e baixar PDF de fatura.

Sobre **Baixar** no histórico: o `.zip` não fica guardado, então o botão
regera o lote a partir do template e da planilha salvos — o resultado é o
mesmo. Lotes feitos com upload direto não têm o que regerar, e nesses o botão
fica desabilitado explicando o porquê.

## Casos-limite

`npm run revisao` exercita o motor com o que um usuário real encontra e que
os testes normais não cobrem: dois clientes de mesmo nome (os arquivos não
podem se sobrescrever), valor com barra e dois-pontos no nome do arquivo,
célula vazia, planilha só com cabeçalho, modelo sem nenhum campo, coluna
sobrando, texto com `&` que quebraria o XML, e um lote de 200 documentos.

Os 200 saem em menos de um segundo.

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
- Sessão que expirava no meio do uso mostrava "Não autenticado" como erro de
  carregamento, e a pessoa ficava presa numa página vazia. Agora qualquer
  resposta 401 avisa o `AuthContext`, que encaminha para o login.
- `{{Número}}` não era reconhecido: a expressão usava `[\w.]+`, que em
  JavaScript não inclui acento. Em português isso derrubava boa parte dos
  modelos reais.
- Planilha que não começasse em A1 devolvia zero colunas e gerava documentos
  vazios. O leitor agora procura a linha de cabeçalho.
- `/api/inspect` ficou sem verificação de sessão quando as outras rotas foram
  fechadas — qualquer um poderia gastar o processamento. Só apareceu porque o
  teste sem banco quebrou.

## Nota sobre a origem

Os arquivos chegaram ao GitHub por upload direto, num único commit, com os
nomes embaralhados: `vite.config.js` continha a tela de cadastro, `logo.png`
era a tela de configurações, `README.md` era o `.gitignore`. Os 34 arquivos
foram reidentificados pelo conteúdo e realocados. `MAPA-DOS-ARQUIVOS.md`
guarda o de-para completo.
