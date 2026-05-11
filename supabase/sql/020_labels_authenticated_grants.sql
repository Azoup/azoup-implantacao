-- Garantir privilégios REST em `labels` para o papel `authenticated` (evita 403 em ambientes
-- onde a tabela existia sem GRANT alinhado ao restante do domínio).
-- Idempotente: GRANT repetido é seguro.

grant select, insert, update, delete on table public.labels to authenticated;
