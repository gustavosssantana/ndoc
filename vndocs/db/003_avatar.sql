-- Foto de perfil.
-- A imagem em si vai para o Blob; aqui fica só a URL pública.
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text NOT NULL DEFAULT '';
