# Biblioteca compartilhada — como funciona e como mexer

## A ideia em uma frase

O conteúdo deixou de pertencer a uma pessoa e passou a pertencer a uma
**empresa**. Todo mundo da mesma empresa vê os mesmos modelos, planilhas,
pastas e histórico — e divide a mesma cota de gerações.

## O que mudou no banco

Duas tabelas novas e uma coluna a mais no conteúdo:

| Tabela | Para quê |
|---|---|
| `orgs` | a empresa: nome e plano |
| `org_usage` | consumo do ciclo, por empresa |
| `org_invites` | códigos de convite em aberto |

E `folders`, `templates`, `sheets`, `generations` ganharam `org_id`.

**A coluna `user_id` continua lá, de propósito.** Ela registra *quem criou*
cada coisa. O acesso é pela empresa; a autoria é da pessoa. Apagar essa
coluna perderia essa informação para sempre.

## Como rodar a migração

**Banco que já existe:** rode `atualizacao-banco.sql` no SQL Editor do Neon.
Ela é segura — cria uma organização para cada conta atual, com o nome da
empresa que a pessoa já tinha cadastrado, e move o conteúdo dela para lá.
Ninguém perde nada, e ninguém passa a ver o que era de outro.

**Banco novo:** rode `banco-completo.sql`, que já inclui tudo.

Localmente: `npm run db:migrate`.

## Como convidar alguém

Em **Configurações → Equipe**, o dono da conta digita o e-mail e clica em
Gerar convite. Sai um código de dez letras, tipo `WZWUPAQASM`.

Quem recebe usa esse código no cadastro. Ele entra direto na empresa e já vê
tudo.

**Não enviamos e-mail** — o projeto ainda não tem envio configurado. Você
passa o código como preferir: WhatsApp, mensagem, pessoalmente. O código
vale sete dias e serve uma vez só.

## Entrar numa empresa já tendo conta

Quem já se cadastrou sozinho não precisa criar outra conta. Em
**Configurações → Equipe → Entrar em outra empresa**, digita o código e
clica em Conferir.

O app mostra **de qual empresa é o código** antes de qualquer coisa —
trocar de equipe não é algo para descobrir depois de acontecer. Confirmando,
a pessoa entra como membro.

**O que acontece com o que ela já tinha:** se estava sozinha na própria
empresa, os arquivos vão junto — pastas, modelos, planilhas, histórico e o
consumo do ciclo. Ela não perde os modelos que montou, e a equipe passa a
vê-los.

Se havia mais gente na empresa antiga, o conteúdo **fica lá**. É da empresa,
não da pessoa, e levar embora seria tirar da equipe que continua.

Se uma pasta que vem tiver o mesmo nome de uma que já existe no destino, a
que chega ganha um sufixo com o nome de quem trouxe, em vez de a migração
quebrar.

A empresa antiga, se ficou sem ninguém e sem conteúdo, é removida.

O código funciona em maiúscula ou minúscula, e serve uma vez só.

## Papéis

Existem dois, e a diferença é pequena de propósito:

**Dono** (`owner`) — quem criou a conta. Pode convidar, cancelar convite e
mudar o plano.

**Membro** (`member`) — quem entrou por convite. Faz todo o resto: cria
pasta, envia modelo, gera documento, baixa arquivo, vê o histórico.

Membro **não** pode convidar nem mudar o plano. Se você precisar de mais
níveis — alguém que só lê, por exemplo — isso é trabalho novo, e o lugar de
mexer é `lib/routes/team.js` e a coluna `users.org_role`.

## O limite de usuários

Vem do plano, em `lib/plans.js`:

| Plano | Usuários |
|---|---|
| Starter | 1 |
| Pro | 3 |
| Business | 10 |
| Enterprise | sem limite |

**Starter permite uma pessoa só** — ou seja, convidar exige subir de plano.
Isso é intencional: é o que faz o plano pago valer a pena. Se quiser mudar,
o número está em `lib/plans.js` e vale para tudo.

A conta de vagas **soma convites em aberto**. Senão daria para furar o
limite criando dez convites de uma vez e usando todos depois.

## Onde mexer, se precisar

**Trocar o limite de usuários** → `lib/plans.js`, campo `usuarios`.

**Mudar quem pode convidar** → `lib/routes/team.js`, as checagens
`user.org_role !== 'owner'`.

**Prazo do convite** → `lib/routes/team.js`, o `7 * 24 * 60 * 60 * 1000`.

**Formato do código** → `lib/routes/team.js`. O alfabeto exclui `I`, `O`,
`0` e `1` de propósito, para ninguém errar ao ditar por telefone.

**Consultas de conteúdo** → `lib/repo.js`. Toda função recebe a **conta
inteira** (não só o id) e chama `contexto(conta)`, que extrai a organização.
Se você criar uma consulta nova, use `WHERE org_id = $1`, nunca `user_id` —
senão a pessoa deixa de ver o que os colegas criaram.

## Como testar

```bash
npm run test:org
```

São 32 verificações que percorrem o caso inteiro: a dona cria a conta, monta
a biblioteca, gera um lote, convida alguém; o convidado entra e **vê tudo**;
o que o convidado gera conta na cota da empresa; o convidado não pode
convidar; e uma terceira empresa **não vê nada** de ninguém.

Esse último grupo é o que mais importa. Vazamento entre empresas é o pior
erro possível num produto assim, e é o que o teste vigia.

## O que ainda não existe

**Remover alguém da equipe.** Hoje dá para cancelar convite não usado, mas
não para desligar quem já entrou. Faltam uma rota e a decisão de produto: o
que acontece com o que a pessoa criou? O caminho natural é o conteúdo ficar
com a empresa e a conta perder o acesso.

**Sair de uma empresa sem entrar em outra.** Dá para trocar de empresa com
um código, mas não para simplesmente sair e voltar a ficar sozinho.

**Transferir a posse.** Se o dono sair, ninguém assume.

**Envio de e-mail do convite.** Depende de configurar um serviço de e-mail.
