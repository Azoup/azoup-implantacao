-- Implantação Azoup — INSERT inicial dos 3 modelos de plano (basic / pro / master)
-- Pré-requisito: 002_core_domain.sql (tabela plan_models).
-- Idempotente: ON CONFLICT (key) DO NOTHING — não sobrescreve planos já criados no painel/app.
-- Fases e tarefas modelo (plan_phases / plan_tasks): rode em seguida 007_seed_plan_phases_tasks.sql
--   (ou app Dexie). Os IDs abaixo são âncora estável no Supabase.

insert into public.plan_models (
  id,
  key,
  name,
  hours_contracted,
  phase_count,
  active,
  presentation_url,
  client_description
)
values
  (
    'a1111111-1111-4111-8111-111111111111'::uuid,
    'basic',
    'Basic',
    30,
    4,
    true,
    '/planos/alinhamento-basic.pdf',
    '30h: preparativos, vendas, produção (confecção), controle financeiro, estoque PA e BI.'
  ),
  (
    'a2222222-2222-4222-8222-222222222222'::uuid,
    'pro',
    'Pró',
    50,
    5,
    true,
    '/planos/alinhamento-pro.pdf',
    '50h: vendas, financeiro e boletos, produção e MP, fluxo de caixa, DRE e BI.'
  ),
  (
    'a3333333-3333-4333-8333-333333333333'::uuid,
    'master',
    'Master',
    70,
    5,
    true,
    '/planos/alinhamento-master.pdf',
    '70h: vendas (Azvendas e e-commerce), financeiro ampliado, produção, compras, Correios e BI.'
  )
on conflict (key) do nothing;
