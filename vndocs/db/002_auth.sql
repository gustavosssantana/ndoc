-- ndocs — autenticação
--
-- Duas mudanças: senha na tabela de contas e uma tabela de sessões.
--
-- A sessão fica no banco (e não só num cookie assinado) para poder ser
-- revogada: trocar a senha ou sair de um dispositivo derruba o acesso na hora.
-- O que se guarda é o SHA-256 do token, nunca o token — se o banco vazar,
-- ninguém entra com o que estiver lá.

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

-- E-mail sem diferença de maiúsculas: ninguém deve criar duas contas por
-- causa de "Gustavo@" e "gustavo@".
UPDATE users SET email = lower(email) WHERE email <> lower(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (lower(email));

CREATE TABLE IF NOT EXISTS sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  text NOT NULL UNIQUE,
  user_agent  text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user    ON sessions (user_id, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at);
