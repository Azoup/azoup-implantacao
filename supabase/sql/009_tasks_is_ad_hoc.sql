-- Tarefas extras no projeto (plano catálogo): não entram na previsão do modelo; consomem só horas reais.
alter table public.tasks add column if not exists is_ad_hoc boolean not null default false;

comment on column public.tasks.is_ad_hoc is
  'True quando a tarefa foi criada manualmente no projeto (fora do catálogo do plano). Estimativa 0; não altera baseline de previsão.';

-- Depois de aplicar este script no Supabase, no app (Vite) defina no .env:
--   VITE_SYNC_TASK_IS_AD_HOC=1
-- para o cliente voltar a enviar a flag na sincronização (opcional; sem isso a tarefa avulsa grava igual, só sem a coluna no JSON).
