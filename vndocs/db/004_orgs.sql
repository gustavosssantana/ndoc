-- ndocs — biblioteca compartilhada por organização
--
-- A ideia: o conteúdo deixa de pertencer a uma pessoa e passa a pertencer a
-- uma empresa. Todo mundo da mesma empresa vê os mesmos modelos, planilhas,
-- pastas e histórico.
--
-- Por que não apagamos user_id: ele continua registrando QUEM criou cada
-- coisa. O acesso passa a ser pela organização, mas saber quem subiu um
-- modelo é informação útil — e apagar essa coluna perderia isso para sempre.
--
-- Esta migração é segura de rodar num banco com dados: ela cria uma
-- organização para cada conta existente e liga o conteúdo dela ali. Ninguém
-- perde nada, e ninguém passa a ver o que era de outro.

/* ── Organizações ────────────────────────────────────────────────────── */
CREATE TABLE IF NOT EXISTS orgs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  plan        text NOT NULL DEFAULT 'starter'
                CHECK (plan IN ('starter', 'pro', 'business', 'enterprise')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

/* A conta pertence a uma organização e tem um papel nela.
   'owner' é quem criou; 'member' é quem foi convidado. */
ALTER TABLE users ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES orgs(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS org_role text NOT NULL DEFAULT 'owner'
  CHECK (org_role IN ('owner', 'member'));

/* ── org_id no conteúdo ──────────────────────────────────────────────── */
ALTER TABLE folders     ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES orgs(id) ON DELETE CASCADE;
ALTER TABLE templates   ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES orgs(id) ON DELETE CASCADE;
ALTER TABLE sheets      ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES orgs(id) ON DELETE CASCADE;
ALTER TABLE generations ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES orgs(id) ON DELETE CASCADE;

/* ── Migração dos dados existentes ───────────────────────────────────── */
-- Cada conta sem organização ganha a sua, com o nome da empresa que ela já
-- tinha cadastrado. O plano vem da conta, para ninguém ser rebaixado.
INSERT INTO orgs (name, plan)
SELECT COALESCE(NULLIF(u.company, ''), NULLIF(u.name, ''), u.email), u.plan
  FROM users u
 WHERE u.org_id IS NULL;

-- Liga cada conta à organização que acabou de nascer para ela.
UPDATE users u
   SET org_id = o.id
  FROM orgs o
 WHERE u.org_id IS NULL
   AND o.name = COALESCE(NULLIF(u.company, ''), NULLIF(u.name, ''), u.email)
   AND o.plan = u.plan;

-- E move o conteúdo para a organização do seu criador.
UPDATE folders     c SET org_id = u.org_id FROM users u WHERE c.user_id = u.id AND c.org_id IS NULL;
UPDATE templates   c SET org_id = u.org_id FROM users u WHERE c.user_id = u.id AND c.org_id IS NULL;
UPDATE sheets      c SET org_id = u.org_id FROM users u WHERE c.user_id = u.id AND c.org_id IS NULL;
UPDATE generations c SET org_id = u.org_id FROM users u WHERE c.user_id = u.id AND c.org_id IS NULL;

/* ── Consumo por organização ─────────────────────────────────────────── */
-- A cota passa a ser da empresa, não de cada pessoa: senão três usuários
-- num plano de 500 gerações teriam 1500 na prática.
CREATE TABLE IF NOT EXISTS org_usage (
  org_id            uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  period            text NOT NULL,
  generations_used  integer NOT NULL DEFAULT 0,
  documents_used    integer NOT NULL DEFAULT 0,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, period)
);

-- Traz o consumo que já existia, somando o de cada pessoa da organização.
INSERT INTO org_usage (org_id, period, generations_used, documents_used)
SELECT u.org_id, c.period, SUM(c.generations_used), SUM(c.documents_used)
  FROM usage_counters c
  JOIN users u ON u.id = c.user_id
 WHERE u.org_id IS NOT NULL
 GROUP BY u.org_id, c.period
    ON CONFLICT (org_id, period) DO NOTHING;

/* ── Convites ────────────────────────────────────────────────────────── */
-- Quem convida gera um código; quem entra usa esse código no cadastro.
-- Não depende de envio de e-mail, que ainda não existe no projeto.
CREATE TABLE IF NOT EXISTS org_invites (
  code        text PRIMARY KEY,
  org_id      uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  created_by  uuid REFERENCES users(id) ON DELETE SET NULL,
  email       text NOT NULL DEFAULT '',
  used_by     uuid REFERENCES users(id) ON DELETE SET NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL
);

/* ── Índices ─────────────────────────────────────────────────────────── */
-- As consultas passam a filtrar por org_id, então é ele que precisa de índice.
CREATE INDEX IF NOT EXISTS idx_folders_org     ON folders (org_id, pinned DESC, name);
CREATE INDEX IF NOT EXISTS idx_templates_org   ON templates (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sheets_org      ON sheets (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generations_org ON generations (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_org       ON users (org_id);
CREATE INDEX IF NOT EXISTS idx_invites_org     ON org_invites (org_id, created_at DESC);

-- Nome de pasta é único dentro da organização, não por pessoa.
ALTER TABLE folders DROP CONSTRAINT IF EXISTS folders_user_id_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_folders_org_name ON folders (org_id, name);
