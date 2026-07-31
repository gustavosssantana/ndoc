-- ndocs — schema inicial
--
-- Toda tabela de conteúdo carrega user_id desde já. Hoje existe um único
-- usuário semente; quando o login entrar, é só passar a criar usuários de
-- verdade e nada aqui precisa mudar.

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()

/* ── Contas ──────────────────────────────────────────────────────────── */
CREATE TABLE IF NOT EXISTS users (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email        text NOT NULL UNIQUE,
  name         text NOT NULL DEFAULT '',
  company      text NOT NULL DEFAULT '',
  plan         text NOT NULL DEFAULT 'starter'
                 CHECK (plan IN ('starter', 'pro', 'business', 'enterprise')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

/* ── Pastas da Biblioteca ────────────────────────────────────────────── */
CREATE TABLE IF NOT EXISTS folders (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         text NOT NULL,
  description  text NOT NULL DEFAULT '',
  pinned       boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

/* ── Templates .docx ─────────────────────────────────────────────────── */
CREATE TABLE IF NOT EXISTS templates (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  folder_id      uuid REFERENCES folders(id) ON DELETE SET NULL,
  filename       text NOT NULL,
  blob_url       text NOT NULL,
  blob_pathname  text NOT NULL,
  size_bytes     integer NOT NULL DEFAULT 0,
  variables      text[] NOT NULL DEFAULT '{}',
  uses           integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

/* ── Planilhas .xlsx ─────────────────────────────────────────────────── */
CREATE TABLE IF NOT EXISTS sheets (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  folder_id      uuid REFERENCES folders(id) ON DELETE SET NULL,
  filename       text NOT NULL,
  blob_url       text NOT NULL,
  blob_pathname  text NOT NULL,
  size_bytes     integer NOT NULL DEFAULT 0,
  column_names   text[] NOT NULL DEFAULT '{}',
  row_count      integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

/* ── Histórico de gerações ───────────────────────────────────────────── */
-- template_name e sheet_name são cópias do nome no momento da geração:
-- o histórico precisa continuar legível mesmo se o arquivo for apagado.
CREATE TABLE IF NOT EXISTS generations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_id     uuid REFERENCES templates(id) ON DELETE SET NULL,
  sheet_id        uuid REFERENCES sheets(id) ON DELETE SET NULL,
  template_name   text NOT NULL DEFAULT '',
  sheet_name      text NOT NULL DEFAULT '',
  doc_count       integer NOT NULL DEFAULT 0,
  zip_size_bytes  bigint NOT NULL DEFAULT 0,
  elapsed_ms      integer NOT NULL DEFAULT 0,
  pattern         text NOT NULL DEFAULT '',
  status          text NOT NULL DEFAULT 'completed'
                    CHECK (status IN ('completed', 'processing', 'failed')),
  error_message   text NOT NULL DEFAULT '',
  created_at      timestamptz NOT NULL DEFAULT now()
);

/* ── Consumo por ciclo ───────────────────────────────────────────────── */
-- period no formato 'YYYY-MM'. Uma linha por usuário por mês.
CREATE TABLE IF NOT EXISTS usage_counters (
  user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period            text NOT NULL,
  generations_used  integer NOT NULL DEFAULT 0,
  documents_used    integer NOT NULL DEFAULT 0,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, period)
);

/* ── Índices ─────────────────────────────────────────────────────────── */
CREATE INDEX IF NOT EXISTS idx_folders_user      ON folders (user_id, pinned DESC, name);
CREATE INDEX IF NOT EXISTS idx_templates_user    ON templates (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_templates_folder  ON templates (folder_id);
CREATE INDEX IF NOT EXISTS idx_sheets_user       ON sheets (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sheets_folder     ON sheets (folder_id);
CREATE INDEX IF NOT EXISTS idx_generations_user  ON generations (user_id, created_at DESC);
