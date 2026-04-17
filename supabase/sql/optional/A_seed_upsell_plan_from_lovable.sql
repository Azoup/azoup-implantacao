-- =============================================================================
-- Opcional: modelo "Upsell" (legado Lovable → dados_old/plan_templates-export)
-- Não faz parte do import legado (supabase/import/legacy_full_import_with_user_map.sql).
-- Pré-requisitos: pipeline base completo até 007 (inclui 006 + 007 — basic/pro/master).
-- Este arquivo só adiciona o 4º catálogo (key = upsell).
-- Ordem: ver supabase/sql/README_RUN_ORDER.txt — após 006 e 007, rode este arquivo se quiser o Upsell.
-- =============================================================================

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
values (
  'c0ffee00-0000-4000-8000-000000000001'::uuid,
  'upsell',
  'Upsell - Integração E-commerce e Correios',
  5,
  3,
  true,
  null,
  'Pacote curto (5h): integrações E-commerce e Correios — espelho do export Lovable.'
)
on conflict (key) do update set
  name = excluded.name,
  hours_contracted = excluded.hours_contracted,
  phase_count = excluded.phase_count,
  active = excluded.active,
  client_description = excluded.client_description;

insert into public.plan_phases (id, plan_model_id, name, order_index)
values
  ('f2aa6a04-4e60-463e-8e9f-146bb2748eb0'::uuid, 'c0ffee00-0000-4000-8000-000000000001'::uuid, 'Fase 00 — Onboarding e Preparação', 0),
  ('392689c6-75b4-4703-b21e-e1161b288906'::uuid, 'c0ffee00-0000-4000-8000-000000000001'::uuid, 'Fase 01', 1),
  ('0e7474a3-b8c2-44aa-ad28-40bc5d6fb8e3'::uuid, 'c0ffee00-0000-4000-8000-000000000001'::uuid, 'Fase 02', 2)
on conflict (id) do update set
  plan_model_id = excluded.plan_model_id,
  name = excluded.name,
  order_index = excluded.order_index;

insert into public.plan_tasks
  (id, plan_phase_id, code, title, description, estimated_hours, is_informational, sort_order)
values
  (
    'd59652a9-722b-4966-9480-4de1ff9aa04b'::uuid,
    'f2aa6a04-4e60-463e-8e9f-146bb2748eb0'::uuid,
    '0.1',
    '0.1 Primeiro Contato',
    'Primeiro contato com o cliente',
    0,
    true,
    1
  ),
  (
    'a055accd-41f7-4d2d-8cf8-12c268d8b4fd'::uuid,
    'f2aa6a04-4e60-463e-8e9f-146bb2748eb0'::uuid,
    '0.2',
    '0.2 Cronograma',
    'Realização do Cronograma',
    0,
    true,
    2
  ),
  (
    'd477736e-2874-4532-b405-d1058325aeab'::uuid,
    '392689c6-75b4-4703-b21e-e1161b288906'::uuid,
    '1.1',
    '1.1 Configuração: Integração E-commerce',
    'Configuração da Integração c/ E-commerce',
    1.5,
    false,
    1
  ),
  (
    '2ea03e61-a9b5-45f1-8ebb-0c0048f3d6c0'::uuid,
    '392689c6-75b4-4703-b21e-e1161b288906'::uuid,
    '1.2',
    '1.2 Configuração: Integração Correios',
    'Configuração da Integração com os Correios',
    1,
    false,
    2
  ),
  (
    'e91ba1a9-8f55-4137-a526-347f5dc28d1d'::uuid,
    '0e7474a3-b8c2-44aa-ad28-40bc5d6fb8e3'::uuid,
    '2.1',
    '2.1 Integração E-commerce',
    'Treinamento sobre a Integração E-commerce',
    1.5,
    false,
    1
  ),
  (
    'b6a921a0-7d03-465f-b914-29a3303ff2e7'::uuid,
    '0e7474a3-b8c2-44aa-ad28-40bc5d6fb8e3'::uuid,
    '2.2',
    '2.2 Integração Correios',
    'Treinamento sobre a Integração com os Correios',
    1,
    false,
    2
  )
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  estimated_hours = excluded.estimated_hours,
  is_informational = excluded.is_informational,
  sort_order = excluded.sort_order;
