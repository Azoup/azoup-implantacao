-- ============================================================
-- Implantação Azoup — Legacy import (antigo Lovable → novo schema)
-- Gerado por: scripts/gen_migration_sql.py
-- Como usar:
--   1. Abra o Supabase SQL Editor do NOVO projeto.
--   2. Cole e rode este arquivo COMPLETO (ou em blocos na ordem abaixo).
--   3. Antes de rodar, preencha a seção USER MAPPING abaixo com os
--      UUIDs dos usuários no NOVO projeto (consulte auth.users).
-- ============================================================

-- PASSO 0: mapeamento de usuários antigos → novos
-- Fallback automático: usa o primeiro user real do novo projeto quando o email não existir
DROP TABLE IF EXISTS _user_map;
CREATE TEMP TABLE _user_map (old_id uuid, new_id uuid);

DO $$
DECLARE
  fallback_id uuid;
BEGIN
  SELECT id INTO fallback_id FROM auth.users ORDER BY created_at LIMIT 1;
  IF fallback_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum usuário em auth.users. Crie pelo menos um usuário antes de importar.';
  END IF;
  RAISE NOTICE 'Fallback user ID: %', fallback_id;
  INSERT INTO _user_map (old_id, new_id) VALUES
    ('1b3f0696-10f9-4f50-a276-fb0f308914e4'::uuid,
     COALESCE((SELECT id FROM auth.users WHERE email='admin@azoup.com' LIMIT 1), fallback_id)),
    ('f455b795-4baf-41af-8d95-7aedf28c24dd'::uuid,
     COALESCE((SELECT id FROM auth.users WHERE email='vinicius.azoup@gmail.com' LIMIT 1), fallback_id)),
    ('9db00f78-2ff2-4f31-9367-063789a92e52'::uuid,
     COALESCE((SELECT id FROM auth.users WHERE email='anderson.telis@azoup.com.br' LIMIT 1), fallback_id)),
    ('502e71ad-4bc3-4b77-ba8e-bff120652d31'::uuid,
     COALESCE((SELECT id FROM auth.users WHERE email='flavio@azoup.com.br' LIMIT 1), fallback_id));
END $$;

SELECT old_id, new_id FROM _user_map;

CREATE OR REPLACE FUNCTION _map_user(p_old_id uuid) RETURNS uuid AS $$
  SELECT COALESCE(
    (SELECT new_id FROM _user_map WHERE old_id = p_old_id),
    (SELECT id FROM auth.users ORDER BY created_at LIMIT 1)
  );
$$ LANGUAGE sql;

-- ============================================================
-- 1. ANALYSTS
-- ============================================================
INSERT INTO public.analysts (id, name, avatar_url, color, active, created_at)
VALUES
  ('66827fda-8720-455b-8771-16ac80f22de4', 'Vinícius', 'https://pljyofempkdxibsrfoui.supabase.co/storage/v1/object/public/analyst-avatars/66827fda-8720-455b-8771-16ac80f22de4.jpeg?t=1775763014677', '#84CC16', true, '2026-04-08 10:37:36.533468+00'),
  ('61f0a9f1-9a5e-471a-8f3f-ce88dafcfe26', 'Anderson', NULL, '#3B82F6', true, '2026-04-08 10:37:36.533468+00')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  avatar_url = EXCLUDED.avatar_url,
  color = EXCLUDED.color,
  active = EXCLUDED.active;

-- ============================================================
-- 2-4. PLAN MODELS / PLAN PHASES / PLAN TASKS
-- PULADOS: use no SQL Editor, NESTA ORDEM (pipeline base em supabase/sql/README_RUN_ORDER.txt):
--   supabase/sql/006_seed_builtin_plan_models.sql  (basic / pro / master)
--   supabase/sql/007_seed_plan_phases_tasks.sql    (14 fases + 72 tarefas)
-- Opcional — 4º catálogo "Upsell" espelhando dados_old (Lovable):
--   supabase/sql/optional/A_seed_upsell_plan_from_lovable.sql
-- Os CSVs em dados_old/plan_templates*, phase_templates*, task_templates*
-- alimentaram o gerador do 007 (IDs de fase/tarefa dos 3 planos batem com o export).
-- ============================================================

-- ============================================================
-- 5. PROJECTS
-- 18 projetos
-- ============================================================
INSERT INTO public.projects
  (id, project_name, plan_type, hours_contracted, hours_used, start_date, due_date, status,
   owner_id, created_by, created_at, kanban_column,
   cnpj, state_registration, address_street, address_number, address_neighborhood,
   address_city, address_state, cep, address_complement)
VALUES
  ('b1a3c726-0957-42ba-b1e9-d7c4f82b710e', 'REBOOL CAMISARIA', 'pro', 50, 0, '2026-04-01', '2026-07-06', 'ativo',
   _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '2026-04-06 11:59:43.901061+00', 'novos',
   NULL, NULL, NULL, NULL, NULL,
   NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  project_name = EXCLUDED.project_name,
  hours_contracted = EXCLUDED.hours_contracted,
  hours_used = EXCLUDED.hours_used,
  status = EXCLUDED.status;

INSERT INTO public.projects
  (id, project_name, plan_type, hours_contracted, hours_used, start_date, due_date, status,
   owner_id, created_by, created_at, kanban_column,
   cnpj, state_registration, address_street, address_number, address_neighborhood,
   address_city, address_state, cep, address_complement)
VALUES
  ('f51a9f52-fbe5-4936-945a-8ee79d163730', 'NERO CONFECÇÕES', 'pro', 50, 0, '2026-03-12', '2026-06-15', 'ativo',
   _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '2026-04-06 12:08:31.553818+00', 'novos',
   NULL, NULL, NULL, NULL, NULL,
   NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  project_name = EXCLUDED.project_name,
  hours_contracted = EXCLUDED.hours_contracted,
  hours_used = EXCLUDED.hours_used,
  status = EXCLUDED.status;

INSERT INTO public.projects
  (id, project_name, plan_type, hours_contracted, hours_used, start_date, due_date, status,
   owner_id, created_by, created_at, kanban_column,
   cnpj, state_registration, address_street, address_number, address_neighborhood,
   address_city, address_state, cep, address_complement)
VALUES
  ('74fbba58-ac87-4114-a216-e80f08557428', 'LUIZA LINGERIE', 'pro', 50, 17, '2026-02-19', '2026-05-25', 'ativo',
   _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '2026-04-06 12:10:47.045789+00', 'novos',
   NULL, NULL, NULL, NULL, NULL,
   NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  project_name = EXCLUDED.project_name,
  hours_contracted = EXCLUDED.hours_contracted,
  hours_used = EXCLUDED.hours_used,
  status = EXCLUDED.status;

INSERT INTO public.projects
  (id, project_name, plan_type, hours_contracted, hours_used, start_date, due_date, status,
   owner_id, created_by, created_at, kanban_column,
   cnpj, state_registration, address_street, address_number, address_neighborhood,
   address_city, address_state, cep, address_complement)
VALUES
  ('b63f3bf0-e2f1-4409-816a-98d43d435161', 'PIRATERNOS', 'pro', 50, 23.5, '2026-02-10', '2026-05-11', 'ativo',
   _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '2026-04-06 12:11:25.220861+00', 'novos',
   NULL, NULL, NULL, NULL, NULL,
   NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  project_name = EXCLUDED.project_name,
  hours_contracted = EXCLUDED.hours_contracted,
  hours_used = EXCLUDED.hours_used,
  status = EXCLUDED.status;

INSERT INTO public.projects
  (id, project_name, plan_type, hours_contracted, hours_used, start_date, due_date, status,
   owner_id, created_by, created_at, kanban_column,
   cnpj, state_registration, address_street, address_number, address_neighborhood,
   address_city, address_state, cep, address_complement)
VALUES
  ('4e36cf11-9121-4441-adcb-73aa56992196', 'LVT SPORTS', 'pro', 50, 0, '2026-03-26', '2026-07-06', 'ativo',
   _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '2026-04-06 12:05:25.011458+00', 'novos',
   NULL, NULL, NULL, NULL, NULL,
   NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  project_name = EXCLUDED.project_name,
  hours_contracted = EXCLUDED.hours_contracted,
  hours_used = EXCLUDED.hours_used,
  status = EXCLUDED.status;

INSERT INTO public.projects
  (id, project_name, plan_type, hours_contracted, hours_used, start_date, due_date, status,
   owner_id, created_by, created_at, kanban_column,
   cnpj, state_registration, address_street, address_number, address_neighborhood,
   address_city, address_state, cep, address_complement)
VALUES
  ('4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', 'CUMPLICE DA MODA', 'master', 70, 1, '2026-03-25', '2026-07-06', 'ativo',
   _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '2026-04-06 12:06:01.342752+00', 'novos',
   NULL, NULL, NULL, NULL, NULL,
   NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  project_name = EXCLUDED.project_name,
  hours_contracted = EXCLUDED.hours_contracted,
  hours_used = EXCLUDED.hours_used,
  status = EXCLUDED.status;

INSERT INTO public.projects
  (id, project_name, plan_type, hours_contracted, hours_used, start_date, due_date, status,
   owner_id, created_by, created_at, kanban_column,
   cnpj, state_registration, address_street, address_number, address_neighborhood,
   address_city, address_state, cep, address_complement)
VALUES
  ('9a2aaacd-6f11-4931-b41d-b7c103006919', 'ANESA UNIFORMES', 'pro', 50, 6.5, '2026-03-02', '2026-06-08', 'ativo',
   _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '2026-04-06 12:10:02.642469+00', 'novos',
   NULL, NULL, NULL, NULL, NULL,
   NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  project_name = EXCLUDED.project_name,
  hours_contracted = EXCLUDED.hours_contracted,
  hours_used = EXCLUDED.hours_used,
  status = EXCLUDED.status;

INSERT INTO public.projects
  (id, project_name, plan_type, hours_contracted, hours_used, start_date, due_date, status,
   owner_id, created_by, created_at, kanban_column,
   cnpj, state_registration, address_street, address_number, address_neighborhood,
   address_city, address_state, cep, address_complement)
VALUES
  ('be964773-2599-4300-86c1-5d7dae304952', 'MALHA & CIA', 'pro', 50, 0, '2026-03-11', '2026-06-15', 'ativo',
   _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '2026-04-06 12:09:22.028751+00', 'novos',
   NULL, NULL, NULL, NULL, NULL,
   NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  project_name = EXCLUDED.project_name,
  hours_contracted = EXCLUDED.hours_contracted,
  hours_used = EXCLUDED.hours_used,
  status = EXCLUDED.status;

INSERT INTO public.projects
  (id, project_name, plan_type, hours_contracted, hours_used, start_date, due_date, status,
   owner_id, created_by, created_at, kanban_column,
   cnpj, state_registration, address_street, address_number, address_neighborhood,
   address_city, address_state, cep, address_complement)
VALUES
  ('98ca6e79-403d-40ab-b58f-8c4b319f3d29', 'D&G CONFECCOES', 'pro', 50, 0, '2025-12-08', '2026-07-08', 'ativo',
   _map_user('f455b795-4baf-41af-8d95-7aedf28c24dd'), _map_user('f455b795-4baf-41af-8d95-7aedf28c24dd'), '2026-04-10 14:29:00.31775+00', 'novos',
   NULL, NULL, NULL, NULL, NULL,
   NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  project_name = EXCLUDED.project_name,
  hours_contracted = EXCLUDED.hours_contracted,
  hours_used = EXCLUDED.hours_used,
  status = EXCLUDED.status;

INSERT INTO public.projects
  (id, project_name, plan_type, hours_contracted, hours_used, start_date, due_date, status,
   owner_id, created_by, created_at, kanban_column,
   cnpj, state_registration, address_street, address_number, address_neighborhood,
   address_city, address_state, cep, address_complement)
VALUES
  ('60476651-5c1f-4025-9539-16f9385fd826', 'MARANELLO UNIFORMES', 'pro', 50, 0, '2026-04-01', '2026-07-06', 'ativo',
   _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '2026-04-06 12:00:37.781769+00', 'novos',
   NULL, NULL, NULL, NULL, NULL,
   NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  project_name = EXCLUDED.project_name,
  hours_contracted = EXCLUDED.hours_contracted,
  hours_used = EXCLUDED.hours_used,
  status = EXCLUDED.status;

INSERT INTO public.projects
  (id, project_name, plan_type, hours_contracted, hours_used, start_date, due_date, status,
   owner_id, created_by, created_at, kanban_column,
   cnpj, state_registration, address_street, address_number, address_neighborhood,
   address_city, address_state, cep, address_complement)
VALUES
  ('66792e18-6327-421f-a82e-ebb6803ca1b0', 'KALHANDRA UNIFORMES', 'pro', 50, 11, '2026-03-13', '2026-06-15', 'ativo',
   _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '2026-04-06 12:07:54.076043+00', 'novos',
   NULL, NULL, NULL, NULL, NULL,
   NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  project_name = EXCLUDED.project_name,
  hours_contracted = EXCLUDED.hours_contracted,
  hours_used = EXCLUDED.hours_used,
  status = EXCLUDED.status;

INSERT INTO public.projects
  (id, project_name, plan_type, hours_contracted, hours_used, start_date, due_date, status,
   owner_id, created_by, created_at, kanban_column,
   cnpj, state_registration, address_street, address_number, address_neighborhood,
   address_city, address_state, cep, address_complement)
VALUES
  ('04400921-5e52-4bad-bc05-7bef132b8894', 'IVY WEAR', 'basic', 30, 1, '2026-03-30', '2026-07-06', 'ativo',
   _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '2026-04-06 12:01:45.892304+00', 'novos',
   NULL, NULL, NULL, NULL, NULL,
   NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  project_name = EXCLUDED.project_name,
  hours_contracted = EXCLUDED.hours_contracted,
  hours_used = EXCLUDED.hours_used,
  status = EXCLUDED.status;

INSERT INTO public.projects
  (id, project_name, plan_type, hours_contracted, hours_used, start_date, due_date, status,
   owner_id, created_by, created_at, kanban_column,
   cnpj, state_registration, address_street, address_number, address_neighborhood,
   address_city, address_state, cep, address_complement)
VALUES
  ('a0806098-50e2-4cc8-a976-591117f36aa7', 'MCE CONFECÇÕES', 'basic', 30, 0, '2026-03-25', '2026-07-06', 'ativo',
   _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '2026-04-06 12:06:45.348048+00', 'novos',
   NULL, NULL, NULL, NULL, NULL,
   NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  project_name = EXCLUDED.project_name,
  hours_contracted = EXCLUDED.hours_contracted,
  hours_used = EXCLUDED.hours_used,
  status = EXCLUDED.status;

INSERT INTO public.projects
  (id, project_name, plan_type, hours_contracted, hours_used, start_date, due_date, status,
   owner_id, created_by, created_at, kanban_column,
   cnpj, state_registration, address_street, address_number, address_neighborhood,
   address_city, address_state, cep, address_complement)
VALUES
  ('eedf5d41-73cc-4283-9f51-02152efab15e', 'NOELI REBELO', 'pro', 50, 13, '2026-02-09', '2026-05-11', 'ativo',
   _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '2026-04-06 12:12:00.325436+00', 'novos',
   NULL, NULL, NULL, NULL, NULL,
   NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  project_name = EXCLUDED.project_name,
  hours_contracted = EXCLUDED.hours_contracted,
  hours_used = EXCLUDED.hours_used,
  status = EXCLUDED.status;

INSERT INTO public.projects
  (id, project_name, plan_type, hours_contracted, hours_used, start_date, due_date, status,
   owner_id, created_by, created_at, kanban_column,
   cnpj, state_registration, address_street, address_number, address_neighborhood,
   address_city, address_state, cep, address_complement)
VALUES
  ('dccf443e-93c7-4008-bed6-959515e6114f', 'BRAND CONFECÇÃO', 'basic', 30, 4, '2026-03-11', '2026-06-15', 'ativo',
   _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '2026-04-06 12:08:58.679927+00', 'novos',
   NULL, NULL, NULL, NULL, NULL,
   NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  project_name = EXCLUDED.project_name,
  hours_contracted = EXCLUDED.hours_contracted,
  hours_used = EXCLUDED.hours_used,
  status = EXCLUDED.status;

INSERT INTO public.projects
  (id, project_name, plan_type, hours_contracted, hours_used, start_date, due_date, status,
   owner_id, created_by, created_at, kanban_column,
   cnpj, state_registration, address_street, address_number, address_neighborhood,
   address_city, address_state, cep, address_complement)
VALUES
  ('6eb273c1-4edd-4cdb-8e56-25235ba2d539', 'INNOVARE CONFECÇÃO', 'master', 70, 0, '2026-03-27', '2026-07-06', 'ativo',
   _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '2026-04-06 12:04:44.238743+00', 'novos',
   NULL, NULL, NULL, NULL, NULL,
   NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  project_name = EXCLUDED.project_name,
  hours_contracted = EXCLUDED.hours_contracted,
  hours_used = EXCLUDED.hours_used,
  status = EXCLUDED.status;

INSERT INTO public.projects
  (id, project_name, plan_type, hours_contracted, hours_used, start_date, due_date, status,
   owner_id, created_by, created_at, kanban_column,
   cnpj, state_registration, address_street, address_number, address_neighborhood,
   address_city, address_state, cep, address_complement)
VALUES
  ('38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', 'UNIVEST CONFECCOES', 'pro', 50, 0, '2026-04-10', '2026-07-10', 'ativo',
   _map_user('f455b795-4baf-41af-8d95-7aedf28c24dd'), _map_user('f455b795-4baf-41af-8d95-7aedf28c24dd'), '2026-04-10 14:51:47.419986+00', 'novos',
   NULL, NULL, NULL, NULL, NULL,
   NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  project_name = EXCLUDED.project_name,
  hours_contracted = EXCLUDED.hours_contracted,
  hours_used = EXCLUDED.hours_used,
  status = EXCLUDED.status;

INSERT INTO public.projects
  (id, project_name, plan_type, hours_contracted, hours_used, start_date, due_date, status,
   owner_id, created_by, created_at, kanban_column,
   cnpj, state_registration, address_street, address_number, address_neighborhood,
   address_city, address_state, cep, address_complement)
VALUES
  ('aa7deed2-435e-4f36-a85f-06e1023ba1de', 'CIRÚRGICA LOJÃO', 'basic', 30, 0, '2026-04-09', '2026-05-11', 'ativo',
   _map_user('f455b795-4baf-41af-8d95-7aedf28c24dd'), _map_user('f455b795-4baf-41af-8d95-7aedf28c24dd'), '2026-04-10 14:50:14.957263+00', 'novos',
   NULL, NULL, NULL, NULL, NULL,
   NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  project_name = EXCLUDED.project_name,
  hours_contracted = EXCLUDED.hours_contracted,
  hours_used = EXCLUDED.hours_used,
  status = EXCLUDED.status;

-- ============================================================
-- 6. PHASES (86 fases)
-- ============================================================
INSERT INTO public.phases (id, project_id, name, order_index, status)
VALUES
  ('06b563ce-b05a-4cb7-b1df-4f07f31d922d', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', 'Fase 00 — Onboarding e Preparação', 0, 'ativa'),
  ('d5daeb48-9ed7-499b-b49d-42ecfeed7d59', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', 'Fase 01 — Vendas', 1, 'bloqueada'),
  ('e762c5f5-ff6b-4257-983e-c803288a9ce8', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', 'Fase 02 — Financeiro', 2, 'bloqueada'),
  ('d77fc9a1-9521-476e-ac2f-416534eed28f', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', 'Fase 03 — Produção', 3, 'bloqueada'),
  ('d461844b-8a37-4f22-ba2d-dd794967114a', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', 'Fase 04 — Gerencial', 4, 'bloqueada'),
  ('0f79a2b0-072c-4675-af8d-781d550861aa', '60476651-5c1f-4025-9539-16f9385fd826', 'Fase 00 — Onboarding e Preparação', 0, 'ativa'),
  ('e9ca7d97-9dc8-404a-81d5-64c3081149da', '60476651-5c1f-4025-9539-16f9385fd826', 'Fase 01 — Vendas', 1, 'bloqueada'),
  ('51263906-84b9-4469-8e9f-e497d7084ed7', '60476651-5c1f-4025-9539-16f9385fd826', 'Fase 02 — Financeiro', 2, 'bloqueada'),
  ('acc6eb2d-84cd-42b1-809c-ca278f32072d', '60476651-5c1f-4025-9539-16f9385fd826', 'Fase 03 — Produção', 3, 'bloqueada'),
  ('4b00679f-f860-4a2c-aeb3-95a8c6a0a8c0', '60476651-5c1f-4025-9539-16f9385fd826', 'Fase 04 — Gerencial', 4, 'bloqueada'),
  ('9bc95d28-a2a1-46f4-a5cf-65fd26d0de8b', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', 'Fase 00 — Onboarding e Preparação', 0, 'ativa'),
  ('36447383-9e90-4ec8-b978-3a2a792ae1f2', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', 'Fase 01 — Vendas', 1, 'bloqueada'),
  ('4e483652-d797-4af2-977c-8b9483ed2174', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', 'Fase 02 — Financeiro', 2, 'bloqueada'),
  ('a2729be4-dbf7-46d9-8d40-7a828e60e92a', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', 'Fase 03 — Produção', 3, 'bloqueada'),
  ('91753f59-fba0-4b6c-8bc2-9d1000361e8d', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', 'Fase 04 — Gerencial', 4, 'bloqueada'),
  ('ddabc116-63c9-4456-8ac1-44e3f7a65de3', '4e36cf11-9121-4441-adcb-73aa56992196', 'Fase 02 — Financeiro', 2, 'bloqueada'),
  ('94a62a3a-7675-4194-9c4d-f2ec042915a8', '4e36cf11-9121-4441-adcb-73aa56992196', 'Fase 03 — Produção', 3, 'bloqueada'),
  ('840a2239-7d4f-47cc-a5a0-e69fc4f3676f', '4e36cf11-9121-4441-adcb-73aa56992196', 'Fase 04 — Gerencial', 4, 'bloqueada'),
  ('d4a4fa6d-6416-426e-a679-8f95e267e0fa', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', 'Fase 02 — Financeiro', 2, 'bloqueada'),
  ('a0fe0bbb-a87b-449e-8589-a53dde98c8f0', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', 'Fase 03 — Produção', 3, 'bloqueada'),
  ('e328c5b3-d0b2-438b-b3ec-a3bbbd3f2f68', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', 'Fase 04 — Gerencial', 4, 'bloqueada'),
  ('a11b7a30-5dd9-4500-bac3-e9d1325a73b1', 'a0806098-50e2-4cc8-a976-591117f36aa7', 'Fase 00 — Onboarding e Preparação', 0, 'ativa'),
  ('bd9efdd7-8beb-4ee4-ab24-116ab176027d', 'a0806098-50e2-4cc8-a976-591117f36aa7', 'Fase 01 — Vendas', 1, 'bloqueada'),
  ('8782705d-b534-49de-8b0c-ffbf5d80551d', 'a0806098-50e2-4cc8-a976-591117f36aa7', 'Fase 02 — Produção', 2, 'bloqueada'),
  ('a585785d-4c0a-4b20-9445-8033fabbe7c1', 'a0806098-50e2-4cc8-a976-591117f36aa7', 'Fase 03 — Gerencial', 3, 'bloqueada'),
  ('566d1ebe-291d-4778-be3e-0e0e76ca9fe3', '66792e18-6327-421f-a82e-ebb6803ca1b0', 'Fase 02 — Financeiro', 2, 'bloqueada'),
  ('ce988d17-4ca6-403f-bd6e-be3e955b3bb4', '66792e18-6327-421f-a82e-ebb6803ca1b0', 'Fase 03 — Produção', 3, 'bloqueada'),
  ('1631ef22-3f90-446a-a8f8-39927b19eaa7', '66792e18-6327-421f-a82e-ebb6803ca1b0', 'Fase 04 — Gerencial', 4, 'bloqueada'),
  ('6bd163f1-ff6f-4dab-add0-865167747af9', 'f51a9f52-fbe5-4936-945a-8ee79d163730', 'Fase 00 — Onboarding e Preparação', 0, 'ativa'),
  ('be11e3f7-0044-416f-a1bb-1b038fbc1d0f', 'f51a9f52-fbe5-4936-945a-8ee79d163730', 'Fase 01 — Vendas', 1, 'bloqueada'),
  ('fe248148-b04d-4492-a4b6-8dd928b7603e', 'f51a9f52-fbe5-4936-945a-8ee79d163730', 'Fase 02 — Financeiro', 2, 'bloqueada'),
  ('77f1e36c-a902-48f9-a65f-11b443dadc01', 'f51a9f52-fbe5-4936-945a-8ee79d163730', 'Fase 03 — Produção', 3, 'bloqueada'),
  ('d7eb1375-2394-46bd-b238-c07204c38daf', 'f51a9f52-fbe5-4936-945a-8ee79d163730', 'Fase 04 — Gerencial', 4, 'bloqueada'),
  ('987b728a-4aef-49e2-af1b-ba04b4b1f704', 'dccf443e-93c7-4008-bed6-959515e6114f', 'Fase 02 — Produção', 2, 'bloqueada'),
  ('9f22c560-2921-4d4c-a0dd-ba51a15854af', 'dccf443e-93c7-4008-bed6-959515e6114f', 'Fase 03 — Gerencial', 3, 'bloqueada'),
  ('ae200fd7-9af6-4dd1-9a76-03232a62b3bc', 'be964773-2599-4300-86c1-5d7dae304952', 'Fase 00 — Onboarding e Preparação', 0, 'ativa'),
  ('5c86c394-fab4-49af-930a-6be00f3275d1', 'be964773-2599-4300-86c1-5d7dae304952', 'Fase 01 — Vendas', 1, 'bloqueada'),
  ('69f1fee3-5b4d-4cac-85b5-7b4bc75cbdad', 'be964773-2599-4300-86c1-5d7dae304952', 'Fase 02 — Financeiro', 2, 'bloqueada'),
  ('84134b1c-028b-4ac4-ad46-fcd00624edf9', 'be964773-2599-4300-86c1-5d7dae304952', 'Fase 03 — Produção', 3, 'bloqueada'),
  ('11b4250c-af34-4ef6-9e4f-8a6488d36ac2', 'be964773-2599-4300-86c1-5d7dae304952', 'Fase 04 — Gerencial', 4, 'bloqueada'),
  ('79bb802b-851a-4723-862c-0306c1e680e2', '9a2aaacd-6f11-4931-b41d-b7c103006919', 'Fase 02 — Financeiro', 2, 'bloqueada'),
  ('75534dce-9a1b-4e4a-8f0c-6e705ab25523', '9a2aaacd-6f11-4931-b41d-b7c103006919', 'Fase 03 — Produção', 3, 'bloqueada'),
  ('caa4d299-0d37-452b-858f-e3923ba992df', '9a2aaacd-6f11-4931-b41d-b7c103006919', 'Fase 04 — Gerencial', 4, 'bloqueada'),
  ('b30b21b9-830b-4443-a1b2-e000a1a68662', '74fbba58-ac87-4114-a216-e80f08557428', 'Fase 03 — Produção', 3, 'bloqueada'),
  ('826b43e6-93a5-4f0a-b897-346270e2195b', '74fbba58-ac87-4114-a216-e80f08557428', 'Fase 04 — Gerencial', 4, 'bloqueada'),
  ('89185410-ebdb-4647-b6d9-8e7fb76a6507', 'b63f3bf0-e2f1-4409-816a-98d43d435161', 'Fase 03 — Produção', 3, 'bloqueada'),
  ('d91c0d1f-1715-4ba5-84ee-e4b8e5831ef9', 'b63f3bf0-e2f1-4409-816a-98d43d435161', 'Fase 04 — Gerencial', 4, 'bloqueada'),
  ('34d0b57b-86d2-4a04-8f62-9f7b14290ad3', '04400921-5e52-4bad-bc05-7bef132b8894', 'Fase 01 — Vendas', 1, 'ativa'),
  ('cbe1da95-3f02-4185-83f5-e9e931db5c43', '4e36cf11-9121-4441-adcb-73aa56992196', 'Fase 00 — Onboarding e Preparação', 0, 'concluida'),
  ('2e040422-f781-486c-8efd-03b9208ff26b', '04400921-5e52-4bad-bc05-7bef132b8894', 'Fase 02 — Produção', 2, 'bloqueada'),
  ('28c9615b-ca8f-4761-b697-aef998af9c2c', '04400921-5e52-4bad-bc05-7bef132b8894', 'Fase 03 — Gerencial', 3, 'bloqueada'),
  ('14c55e61-136c-492b-a8cf-83fb0e860e56', '66792e18-6327-421f-a82e-ebb6803ca1b0', 'Fase 00 — Onboarding e Preparação', 0, 'concluida'),
  ('e2fa344b-ac76-4933-bf42-3017647014a3', '66792e18-6327-421f-a82e-ebb6803ca1b0', 'Fase 01 — Vendas', 1, 'ativa'),
  ('04bf434d-89c1-4a48-984a-62281bc79c92', 'dccf443e-93c7-4008-bed6-959515e6114f', 'Fase 00 — Onboarding e Preparação', 0, 'concluida'),
  ('1796054f-456f-4ea6-bf75-38a359377bdc', 'dccf443e-93c7-4008-bed6-959515e6114f', 'Fase 01 — Vendas', 1, 'ativa'),
  ('b92dfd36-95cb-4091-9c98-6321800c7590', '9a2aaacd-6f11-4931-b41d-b7c103006919', 'Fase 00 — Onboarding e Preparação', 0, 'concluida'),
  ('6ee86de9-4b6a-4ca1-9e22-3463587efd41', '9a2aaacd-6f11-4931-b41d-b7c103006919', 'Fase 01 — Vendas', 1, 'ativa'),
  ('dd96c14a-2f06-4118-b0a7-3451614ccb7f', '74fbba58-ac87-4114-a216-e80f08557428', 'Fase 02 — Financeiro', 2, 'ativa'),
  ('5669fd80-0808-4e9a-8eef-75651206f588', '74fbba58-ac87-4114-a216-e80f08557428', 'Fase 01 — Vendas', 1, 'concluida'),
  ('a30f9538-e988-4613-b77e-378d665e8a97', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', 'Fase 00 — Onboarding e Preparação', 0, 'concluida'),
  ('3aa6c557-fdf3-4ee7-b2c8-55366b95f365', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', 'Fase 01 — Vendas', 1, 'ativa'),
  ('4f026d85-154c-4ae0-bb3b-6e926206f05b', '04400921-5e52-4bad-bc05-7bef132b8894', 'Fase 00 — Onboarding e Preparação', 0, 'concluida'),
  ('955a0691-bd41-4a0e-97eb-8bd16b5e6ce2', '4e36cf11-9121-4441-adcb-73aa56992196', 'Fase 01 — Vendas', 1, 'ativa'),
  ('726bcc74-c5b0-4365-b5e2-bb1f2c61b40f', 'b63f3bf0-e2f1-4409-816a-98d43d435161', 'Fase 00 — Onboarding e Preparação', 0, 'concluida'),
  ('329d89d3-69bc-42a2-b146-2e0e0ae9cac4', 'b63f3bf0-e2f1-4409-816a-98d43d435161', 'Fase 02 — Financeiro', 2, 'ativa'),
  ('a6be049c-17ea-4a5a-9bcb-8d625dd4a229', 'b63f3bf0-e2f1-4409-816a-98d43d435161', 'Fase 01 — Vendas', 1, 'concluida'),
  ('dfc6a37b-692b-4d31-9119-84d841a2888b', 'eedf5d41-73cc-4283-9f51-02152efab15e', 'Fase 03 — Produção', 3, 'bloqueada'),
  ('733c7609-85ef-4d60-a6f8-cbebb8f39ecd', 'eedf5d41-73cc-4283-9f51-02152efab15e', 'Fase 04 — Gerencial', 4, 'bloqueada'),
  ('5326af5e-8692-4413-b5a4-baec74ea7d2f', '74fbba58-ac87-4114-a216-e80f08557428', 'Fase 00 — Onboarding e Preparação', 0, 'concluida'),
  ('1493b760-0bd8-4d56-bee1-e1d680065011', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', 'Fase 00 — Onboarding e Preparação', 0, 'ativa'),
  ('9bf84517-b4d6-41e5-83bf-5aaa5f5047d0', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', 'Fase 01 — Vendas', 1, 'bloqueada'),
  ('46f511de-32be-4c94-a3c7-04439f75da2e', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', 'Fase 02 — Financeiro', 2, 'bloqueada'),
  ('b7702933-6d00-4af6-ac47-975687587a73', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', 'Fase 03 — Produção', 3, 'bloqueada'),
  ('be97f436-ea47-4934-8a63-a7dc20d79b8e', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', 'Fase 04 — Gerencial', 4, 'bloqueada'),
  ('ca2b5849-9ef5-44f1-8d7a-51aa13bc5c5b', 'aa7deed2-435e-4f36-a85f-06e1023ba1de', 'Fase 00 — Onboarding e Preparação', 0, 'ativa'),
  ('35b056f4-6842-489f-bef7-abcad0829da3', 'aa7deed2-435e-4f36-a85f-06e1023ba1de', 'Fase 01 — Vendas', 1, 'bloqueada'),
  ('3d0eca6f-2584-4ed2-a115-39c238ae47a6', 'aa7deed2-435e-4f36-a85f-06e1023ba1de', 'Fase 02 — Produção', 2, 'bloqueada'),
  ('b4e460ed-d200-456e-a083-702f1d798767', 'aa7deed2-435e-4f36-a85f-06e1023ba1de', 'Fase 03 — Gerencial', 3, 'bloqueada'),
  ('b63e0f0e-ab51-4537-a655-7a29dcbfa450', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', 'Fase 00 — Onboarding e Preparação', 0, 'ativa'),
  ('ad10a837-fd3c-454e-aea4-af2194f9866c', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', 'Fase 01 — Vendas', 1, 'bloqueada'),
  ('fc7b5405-bb61-4a2b-9b59-654673fd1180', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', 'Fase 02 — Financeiro', 2, 'bloqueada'),
  ('0dbde837-8d2e-4f90-88f8-320f52b6bd57', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', 'Fase 03 — Produção', 3, 'bloqueada'),
  ('57474492-0439-4bc7-aace-d781c6745ae0', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', 'Fase 04 — Gerencial', 4, 'bloqueada'),
  ('496d6e96-3b16-4ba5-9f2b-0c10e3880a29', 'eedf5d41-73cc-4283-9f51-02152efab15e', 'Fase 00 — Onboarding e Preparação', 0, 'concluida'),
  ('ff6392a5-8f07-4092-9cb4-55546b99ec20', 'eedf5d41-73cc-4283-9f51-02152efab15e', 'Fase 01 — Vendas', 1, 'concluida'),
  ('89eede57-139b-40da-a676-a2cbc564649c', 'eedf5d41-73cc-4283-9f51-02152efab15e', 'Fase 02 — Financeiro', 2, 'ativa')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  order_index = EXCLUDED.order_index,
  status = EXCLUDED.status;

-- ============================================================
-- 7. TASKS (422 tarefas)
-- ============================================================
INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('7962759f-45bc-4eb5-8ec4-f1306f4be51f', '0.5 Planilha Devolvida', 'Recebimento da planilha preenchida pelo cliente', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', '06b563ce-b05a-4cb7-b1df-4f07f31d922d', 'pendente', 'media',
   0, 0, '2026-04-10', true, '2026-04-06 11:59:45.324295+00', '0.5', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('fc9b3f5c-6b27-4286-a5f8-c5c19fab261d', '0.6 Cronograma Pendente', 'Definição e validação do cronograma de implantação', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', '06b563ce-b05a-4cb7-b1df-4f07f31d922d', 'pendente', 'media',
   0, 0, '2026-04-10', true, '2026-04-06 11:59:45.324295+00', '0.6', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('7522da3f-3507-41d3-b1c7-f4aa04d78fe0', '2.1 Controle Financeiro', 'Configurar contas a pagar, receber, plano de contas', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', 'e762c5f5-ff6b-4257-983e-c803288a9ce8', 'pendente', 'media',
   3, 0, '2026-04-30', false, '2026-04-06 11:59:46.457538+00', '2.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('80feae9a-8708-450b-b054-c01572bd59e1', '2.2 Boletos', 'Configurar emissão e integração de boletos', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', 'e762c5f5-ff6b-4257-983e-c803288a9ce8', 'pendente', 'media',
   2, 0, '2026-04-30', false, '2026-04-06 11:59:46.457538+00', '2.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('c99ae686-b217-4bed-8c1a-a4c85c9ff262', '4.1 Fluxo de Caixa', 'Configurar relatório de fluxo de caixa', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', 'd461844b-8a37-4f22-ba2d-dd794967114a', 'pendente', 'media',
   2, 0, '2026-05-20', false, '2026-04-06 11:59:47.735439+00', '4.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('b7544ead-daad-4587-8c7a-2be0145e2f30', '4.2 DRE', 'Configurar demonstrativo de resultados', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', 'd461844b-8a37-4f22-ba2d-dd794967114a', 'pendente', 'media',
   1, 0, '2026-05-20', false, '2026-04-06 11:59:47.735439+00', '4.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('6da5707b-679d-408a-8c3d-1a1d7fd20a7b', '4.3 Relatórios BI', 'Configurar dashboards e relatórios de business intelligence', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', 'd461844b-8a37-4f22-ba2d-dd794967114a', 'pendente', 'media',
   1, 0, '2026-05-20', false, '2026-04-06 11:59:47.735439+00', '4.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('cf803b2a-8881-4014-bc55-d607f027658d', '4.4 Finalização do Projeto', 'Encerramento formal do projeto de implantação', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', 'd461844b-8a37-4f22-ba2d-dd794967114a', 'pendente', 'media',
   0, 0, '2026-05-20', true, '2026-04-06 11:59:47.735439+00', '4.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('0b013cc1-4b90-4089-8281-3b5bcb34d723', '1.1 Instalação do Sistema', 'Instalar e configurar ambiente do cliente', '60476651-5c1f-4025-9539-16f9385fd826', 'e9ca7d97-9dc8-404a-81d5-64c3081149da', 'pendente', 'media',
   2, 0, '2026-04-20', false, '2026-04-06 12:00:40.703047+00', '1.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('650d2d74-42cf-4829-8476-b3cbc1f7c0d5', '1.2 Configurações', 'Parametrizar regras comerciais, tabelas de preço', '60476651-5c1f-4025-9539-16f9385fd826', 'e9ca7d97-9dc8-404a-81d5-64c3081149da', 'pendente', 'media',
   2, 0, '2026-04-20', false, '2026-04-06 12:00:40.703047+00', '1.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('5c691399-58bb-46cc-ae67-edd2a83e6632', '1.3 Cadastros', 'Cadastrar clientes, produtos, condições de pagamento', '60476651-5c1f-4025-9539-16f9385fd826', 'e9ca7d97-9dc8-404a-81d5-64c3081149da', 'pendente', 'media',
   4, 0, '2026-04-20', false, '2026-04-06 12:00:40.703047+00', '1.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('c5324a7a-7d88-49a1-a06b-79e5a666f35a', '1.4 Vendas', 'Configurar e treinar módulo de vendas', '60476651-5c1f-4025-9539-16f9385fd826', 'e9ca7d97-9dc8-404a-81d5-64c3081149da', 'pendente', 'media',
   4, 0, '2026-04-20', false, '2026-04-06 12:00:40.703047+00', '1.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('dfcefc03-08a2-46bd-80af-0e05fda31237', '1.5 NF-e', 'Configurar emissão de NF-e, certificado digital', '60476651-5c1f-4025-9539-16f9385fd826', 'e9ca7d97-9dc8-404a-81d5-64c3081149da', 'pendente', 'media',
   4, 0, '2026-04-20', false, '2026-04-06 12:00:40.703047+00', '1.5', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('fac413f1-2bc2-468a-b517-4e1d60e00882', '1.6 Virada de Sistema: Vendas', 'Migrar operação de vendas para o novo sistema', '60476651-5c1f-4025-9539-16f9385fd826', 'e9ca7d97-9dc8-404a-81d5-64c3081149da', 'pendente', 'media',
   4, 0, '2026-04-20', false, '2026-04-06 12:00:40.703047+00', '1.6', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('785dbf80-92b1-4cad-9d81-d7105aabad89', '3.1 Cadastros: Produção', 'Cadastrar matérias-primas, aviamentos, grades', '60476651-5c1f-4025-9539-16f9385fd826', 'acc6eb2d-84cd-42b1-809c-ca278f32072d', 'pendente', 'media',
   4, 0, '2026-05-10', false, '2026-04-06 12:00:42.580181+00', '3.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('880ca08e-15fd-44a5-a6bc-08d2b3083ba8', '3.2 Ficha Técnica e Custo', 'Criar fichas técnicas com custos de produção', '60476651-5c1f-4025-9539-16f9385fd826', 'acc6eb2d-84cd-42b1-809c-ca278f32072d', 'pendente', 'media',
   4, 0, '2026-05-10', false, '2026-04-06 12:00:42.580181+00', '3.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('f3b203f5-db80-412b-a3e7-1571286ea8f2', '3.3 Ordem de Produção', 'Configurar fluxo de ordens de produção', '60476651-5c1f-4025-9539-16f9385fd826', 'acc6eb2d-84cd-42b1-809c-ca278f32072d', 'pendente', 'media',
   4, 0, '2026-05-10', false, '2026-04-06 12:00:42.580181+00', '3.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('2c38b78c-b981-436d-9199-6719612ef086', '3.4 Virada de Sistema: Produção', 'Migrar operação de produção para o sistema', '60476651-5c1f-4025-9539-16f9385fd826', 'acc6eb2d-84cd-42b1-809c-ca278f32072d', 'pendente', 'media',
   4, 0, '2026-05-10', false, '2026-04-06 12:00:42.580181+00', '3.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('c8c7d910-d35a-4355-9c3b-4197d154868c', '3.5 Pagamento de Faccionistas', 'Cadastrar e configurar controle de facções', '60476651-5c1f-4025-9539-16f9385fd826', 'acc6eb2d-84cd-42b1-809c-ca278f32072d', 'pendente', 'media',
   2, 0, '2026-05-10', false, '2026-04-06 12:00:42.580181+00', '3.5', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('df023826-c3c8-4980-9fbe-ff9e942f953d', '3.6 Controle de Estoque', 'Configurar controle de estoque de insumos', '60476651-5c1f-4025-9539-16f9385fd826', 'acc6eb2d-84cd-42b1-809c-ca278f32072d', 'pendente', 'media',
   3, 0, '2026-05-10', false, '2026-04-06 12:00:42.580181+00', '3.6', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('b5b64c8e-b955-459a-8152-e22625cafa92', '2.1 Cadastros: Produção', 'Cadastrar matérias-primas, aviamentos, grades', '04400921-5e52-4bad-bc05-7bef132b8894', '2e040422-f781-486c-8efd-03b9208ff26b', 'pendente', 'media',
   3, 0, '2026-04-28', false, '2026-04-06 12:01:51.966592+00', '2.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('ac4d4d47-32c5-44f8-99a0-8690aa45804f', '2.2 Ordem de Produção', 'Configurar fluxo de ordens de produção', '04400921-5e52-4bad-bc05-7bef132b8894', '2e040422-f781-486c-8efd-03b9208ff26b', 'pendente', 'media',
   3, 0, '2026-04-28', false, '2026-04-06 12:01:51.966592+00', '2.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('13f37ff0-c633-4087-b1ce-0d819eae5d23', '2.3 Virada de Sistema: Produção', 'Migrar operação de produção para o sistema', '04400921-5e52-4bad-bc05-7bef132b8894', '2e040422-f781-486c-8efd-03b9208ff26b', 'pendente', 'media',
   4, 0, '2026-04-28', false, '2026-04-06 12:01:51.966592+00', '2.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('b5b10370-897f-4cd7-8670-0451ea2da828', '0.2 Formulário de boas-vindas', 'Envio e preenchimento do formulário de boas-vindas', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', '06b563ce-b05a-4cb7-b1df-4f07f31d922d', 'concluida', 'media',
   0, 0, '2026-04-10', true, '2026-04-06 11:59:45.324295+00', '0.2', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('dcd81e2d-f024-4d7c-83e4-842dc2ec59f6', '0.1 Primeiro Contato', 'Primeiro contato com o cliente', '04400921-5e52-4bad-bc05-7bef132b8894', '4f026d85-154c-4ae0-bb3b-6e926206f05b', 'concluida', 'media',
   0, 0, '2026-04-08', true, '2026-04-06 12:01:48.184002+00', '0.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('819caed9-51c7-4348-be3a-013387451f37', '0.2 Formulário de boas-vindas', 'Envio e preenchimento do formulário de boas-vindas', '04400921-5e52-4bad-bc05-7bef132b8894', '4f026d85-154c-4ae0-bb3b-6e926206f05b', 'concluida', 'media',
   0, 0, '2026-04-08', true, '2026-04-06 12:01:48.184002+00', '0.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('9dd00613-46d5-4c6b-9c24-17967dbffea6', '0.1 Primeiro Contato', 'Primeiro contato com o cliente', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', '9bc95d28-a2a1-46f4-a5cf-65fd26d0de8b', 'concluida', 'media',
   0, 0, '2026-04-05', true, '2026-04-06 12:04:44.69041+00', '0.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('56ce0977-ad42-410d-8d6f-5f1f8fe7d8ed', '0.2 Formulário de boas-vindas', 'Envio e preenchimento do formulário de boas-vindas', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', '9bc95d28-a2a1-46f4-a5cf-65fd26d0de8b', 'concluida', 'media',
   0, 0, '2026-04-05', true, '2026-04-06 12:04:44.69041+00', '0.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('86db4bb5-e4ed-4299-a3a7-b0cdfd1482e7', '0.3 Reunião de Alinhamento', 'Reunião inicial para alinhar expectativas e cronograma', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', '9bc95d28-a2a1-46f4-a5cf-65fd26d0de8b', 'concluida', 'media',
   0, 0, '2026-04-05', true, '2026-04-06 12:04:44.69041+00', '0.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('596d4fdc-4665-4587-9d10-d29df4d8fc3b', '0.3 Reunião de Alinhamento', 'Reunião inicial para alinhar expectativas e cronograma', '04400921-5e52-4bad-bc05-7bef132b8894', '4f026d85-154c-4ae0-bb3b-6e926206f05b', 'concluida', 'media',
   0, 0, '2026-04-08', true, '2026-04-06 12:01:48.184002+00', '0.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('ffff0ec6-b5dc-4dc2-94d9-96fa96cb648a', '0.4 Planilha Enviada', 'Envio da planilha modelo para preenchimento pelo cliente', '04400921-5e52-4bad-bc05-7bef132b8894', '4f026d85-154c-4ae0-bb3b-6e926206f05b', 'concluida', 'media',
   0, 0, '2026-04-08', true, '2026-04-06 12:01:48.184002+00', '0.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('59d73651-c3a2-4e98-8169-6746fbc98534', '0.5 Planilha Devolvida', 'Recebimento da planilha preenchida pelo cliente', '04400921-5e52-4bad-bc05-7bef132b8894', '4f026d85-154c-4ae0-bb3b-6e926206f05b', 'concluida', 'media',
   0, 0, '2026-04-08', true, '2026-04-06 12:01:48.184002+00', '0.5', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('3eb28f00-ec6b-4194-9b30-676385f7fbe5', '0.6 Cronograma Pendente', 'Definição e validação do cronograma de implantação', '04400921-5e52-4bad-bc05-7bef132b8894', '4f026d85-154c-4ae0-bb3b-6e926206f05b', 'concluida', 'media',
   0, 0, '2026-04-08', true, '2026-04-06 12:01:48.184002+00', '0.6', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('152d44fa-8638-4825-a6e6-ae6c813a08d2', '0.4 Planilha Enviada', 'Envio da planilha modelo para preenchimento pelo cliente', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', '06b563ce-b05a-4cb7-b1df-4f07f31d922d', 'concluida', 'media',
   0, 0, '2026-04-10', true, '2026-04-06 11:59:45.324295+00', '0.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('2076efe8-e318-4226-92f4-d0fbd0bd1f7c', '0.6 Cronograma Pendente', 'Definição e validação do cronograma de implantação', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', '1493b760-0bd8-4d56-bee1-e1d680065011', 'pendente', 'media',
   0, 0, '2025-12-17', true, '2026-04-10 14:29:00.882376+00', '0.6', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('d23f7c0d-f4d9-4adb-8427-c7cf5b673e33', '0.1 Primeiro Contato', 'Primeiro contato com o cliente', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', '1493b760-0bd8-4d56-bee1-e1d680065011', 'concluida', 'media',
   0, 0, '2025-12-17', true, '2026-04-10 14:29:00.882376+00', '0.1', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('532a48d1-f39c-40b4-aa14-d0532a5919a8', '0.3 Reunião de Alinhamento', 'Reunião inicial para alinhar expectativas e cronograma', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', '1493b760-0bd8-4d56-bee1-e1d680065011', 'concluida', 'media',
   0, 0, '2025-12-17', true, '2026-04-10 14:29:00.882376+00', '0.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('3b872f57-d933-4941-913c-92b9e146c72c', '0.4 Planilha Enviada', 'Envio da planilha modelo para preenchimento pelo cliente', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', '1493b760-0bd8-4d56-bee1-e1d680065011', 'concluida', 'media',
   0, 0, '2025-12-17', true, '2026-04-10 14:29:00.882376+00', '0.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('dff6c58d-cc2a-4907-96b9-61780022c9ff', '0.5 Planilha Devolvida', 'Recebimento da planilha preenchida pelo cliente', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', '1493b760-0bd8-4d56-bee1-e1d680065011', 'concluida', 'media',
   0, 0, '2025-12-17', true, '2026-04-10 14:29:00.882376+00', '0.5', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('799fdee3-0e47-4cad-9120-18bd5f723f63', '3.1 Controle Financeiro', 'Configurar contas a pagar, receber, plano de contas', 'aa7deed2-435e-4f36-a85f-06e1023ba1de', 'b4e460ed-d200-456e-a083-702f1d798767', 'pendente', 'media',
   2, 0, '2026-05-18', false, '2026-04-10 14:50:16.685786+00', '3.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('a31646dc-8170-4cd4-bed3-039ff1f450db', '3.2 Controle de Estoque: Produto Acabado', 'Configurar controle de estoque de produto acabado', 'aa7deed2-435e-4f36-a85f-06e1023ba1de', 'b4e460ed-d200-456e-a083-702f1d798767', 'pendente', 'media',
   1, 0, '2026-05-18', false, '2026-04-10 14:50:16.685786+00', '3.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('f7eb6071-d583-4a39-9b09-40938abced55', '3.3 Relatórios BI', 'Configurar dashboards e relatórios de business intelligence', 'aa7deed2-435e-4f36-a85f-06e1023ba1de', 'b4e460ed-d200-456e-a083-702f1d798767', 'pendente', 'media',
   1, 0, '2026-05-18', false, '2026-04-10 14:50:16.685786+00', '3.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('66a49b0a-03f6-4aea-845d-7c25916f1ca2', '3.4 Finalização do Projeto', 'Encerramento formal do projeto de implantação', 'aa7deed2-435e-4f36-a85f-06e1023ba1de', 'b4e460ed-d200-456e-a083-702f1d798767', 'pendente', 'media',
   0, 0, '2026-05-18', true, '2026-04-10 14:50:16.685786+00', '3.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('4a4dfe90-408d-412f-b1d5-48465aa7788a', '1.1 Instalação do Sistema', 'Instalar e configurar ambiente do cliente', '04400921-5e52-4bad-bc05-7bef132b8894', '34d0b57b-86d2-4a04-8f62-9f7b14290ad3', 'concluida', 'media',
   2, 1, '2026-04-18', false, '2026-04-06 12:01:50.964272+00', '1.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('7db4b708-de44-4952-b001-3e478ac4fdad', '1.1 Instalação do Sistema', 'Instalar e configurar ambiente do cliente', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', 'd5daeb48-9ed7-499b-b49d-42ecfeed7d59', 'pendente', 'media',
   2, 0, '2026-04-20', false, '2026-04-06 11:59:45.900845+00', '1.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('3b9c9552-ae62-4745-933c-2b48be4162b3', '1.2 Configurações', 'Parametrizar regras comerciais, tabelas de preço', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', 'd5daeb48-9ed7-499b-b49d-42ecfeed7d59', 'pendente', 'media',
   2, 0, '2026-04-20', false, '2026-04-06 11:59:45.900845+00', '1.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('11977a43-c15a-4d0d-b836-55f2a9b00cce', '1.3 Cadastros', 'Cadastrar clientes, produtos, condições de pagamento', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', 'd5daeb48-9ed7-499b-b49d-42ecfeed7d59', 'pendente', 'media',
   4, 0, '2026-04-20', false, '2026-04-06 11:59:45.900845+00', '1.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('6080c357-67da-4592-b73c-075653f3fa73', '1.4 Vendas', 'Configurar e treinar módulo de vendas', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', 'd5daeb48-9ed7-499b-b49d-42ecfeed7d59', 'pendente', 'media',
   4, 0, '2026-04-20', false, '2026-04-06 11:59:45.900845+00', '1.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('dee9988a-beb6-4a22-b67b-2b5b08ab897a', '1.1 Instalação do Sistema', 'Instalar e configurar ambiente do cliente', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', '9bf84517-b4d6-41e5-83bf-5aaa5f5047d0', 'pendente', 'media',
   2, 0, '2025-12-27', false, '2026-04-10 14:29:01.355422+00', '1.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('9fdfd6f6-9026-4594-9672-c2e1982c1f67', '1.5 NF-e', 'Configurar emissão de NF-e, certificado digital', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', 'd5daeb48-9ed7-499b-b49d-42ecfeed7d59', 'pendente', 'media',
   4, 0, '2026-04-20', false, '2026-04-06 11:59:45.900845+00', '1.5', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('0008a8b1-4614-4537-8e59-8ca02d9d4bac', '1.6 Virada de Sistema: Vendas', 'Migrar operação de vendas para o novo sistema', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', 'd5daeb48-9ed7-499b-b49d-42ecfeed7d59', 'pendente', 'media',
   4, 0, '2026-04-20', false, '2026-04-06 11:59:45.900845+00', '1.6', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('4395b1aa-cded-4e62-bd10-3c224e010f2f', '3.1 Cadastros: Produção', 'Cadastrar matérias-primas, aviamentos, grades', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', 'd77fc9a1-9521-476e-ac2f-416534eed28f', 'pendente', 'media',
   4, 0, '2026-05-10', false, '2026-04-06 11:59:47.035624+00', '3.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('2ad23aa1-b16c-4cd8-b80c-1114f8f77e10', '3.2 Ficha Técnica e Custo', 'Criar fichas técnicas com custos de produção', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', 'd77fc9a1-9521-476e-ac2f-416534eed28f', 'pendente', 'media',
   4, 0, '2026-05-10', false, '2026-04-06 11:59:47.035624+00', '3.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('fc0e8a21-3a08-4587-90bd-9390c3a3b786', '3.3 Ordem de Produção', 'Configurar fluxo de ordens de produção', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', 'd77fc9a1-9521-476e-ac2f-416534eed28f', 'pendente', 'media',
   4, 0, '2026-05-10', false, '2026-04-06 11:59:47.035624+00', '3.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('1d87630b-da12-4ff7-9031-b697c156caf4', '3.4 Virada de Sistema: Produção', 'Migrar operação de produção para o sistema', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', 'd77fc9a1-9521-476e-ac2f-416534eed28f', 'pendente', 'media',
   4, 0, '2026-05-10', false, '2026-04-06 11:59:47.035624+00', '3.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('8e701c52-f776-4c9e-aa2b-693f154851c3', '3.5 Pagamento de Faccionistas', 'Cadastrar e configurar controle de facções', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', 'd77fc9a1-9521-476e-ac2f-416534eed28f', 'pendente', 'media',
   2, 0, '2026-05-10', false, '2026-04-06 11:59:47.035624+00', '3.5', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('2e51d4d5-a979-4551-997e-8c627a551dcd', '3.6 Controle de Estoque', 'Configurar controle de estoque de insumos', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', 'd77fc9a1-9521-476e-ac2f-416534eed28f', 'pendente', 'media',
   3, 0, '2026-05-10', false, '2026-04-06 11:59:47.035624+00', '3.6', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('5df46c30-8dfe-4528-82b6-4020d396db87', '0.5 Planilha Devolvida', 'Recebimento da planilha preenchida pelo cliente', '60476651-5c1f-4025-9539-16f9385fd826', '0f79a2b0-072c-4675-af8d-781d550861aa', 'pendente', 'media',
   0, 0, '2026-04-10', true, '2026-04-06 12:00:39.663657+00', '0.5', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('d13d7c05-e47f-4c78-9275-70377ba63a6a', '0.6 Cronograma Pendente', 'Definição e validação do cronograma de implantação', '60476651-5c1f-4025-9539-16f9385fd826', '0f79a2b0-072c-4675-af8d-781d550861aa', 'pendente', 'media',
   0, 0, '2026-04-10', true, '2026-04-06 12:00:39.663657+00', '0.6', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('060818f4-2246-4810-9d1d-4375219440ba', '2.1 Controle Financeiro', 'Configurar contas a pagar, receber, plano de contas', '60476651-5c1f-4025-9539-16f9385fd826', '51263906-84b9-4469-8e9f-e497d7084ed7', 'pendente', 'media',
   3, 0, '2026-04-30', false, '2026-04-06 12:00:41.705106+00', '2.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('5625880e-2654-4dbb-9e53-49adb1b1a1b2', '2.2 Boletos', 'Configurar emissão e integração de boletos', '60476651-5c1f-4025-9539-16f9385fd826', '51263906-84b9-4469-8e9f-e497d7084ed7', 'pendente', 'media',
   2, 0, '2026-04-30', false, '2026-04-06 12:00:41.705106+00', '2.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('a3831760-fac8-471b-b39d-c39ba7610730', '4.1 Fluxo de Caixa', 'Configurar relatório de fluxo de caixa', '60476651-5c1f-4025-9539-16f9385fd826', '4b00679f-f860-4a2c-aeb3-95a8c6a0a8c0', 'pendente', 'media',
   2, 0, '2026-05-20', false, '2026-04-06 12:00:43.054784+00', '4.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('984c273d-c5bf-493f-9e1d-7436297a62f2', '4.2 DRE', 'Configurar demonstrativo de resultados', '60476651-5c1f-4025-9539-16f9385fd826', '4b00679f-f860-4a2c-aeb3-95a8c6a0a8c0', 'pendente', 'media',
   1, 0, '2026-05-20', false, '2026-04-06 12:00:43.054784+00', '4.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('e89eff09-ba19-4c23-a03f-b424a1c3907e', '4.3 Relatórios BI', 'Configurar dashboards e relatórios de business intelligence', '60476651-5c1f-4025-9539-16f9385fd826', '4b00679f-f860-4a2c-aeb3-95a8c6a0a8c0', 'pendente', 'media',
   1, 0, '2026-05-20', false, '2026-04-06 12:00:43.054784+00', '4.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('30691171-523e-4d4c-942a-9fe027b1bf31', '4.4 Finalização do Projeto', 'Encerramento formal do projeto de implantação', '60476651-5c1f-4025-9539-16f9385fd826', '4b00679f-f860-4a2c-aeb3-95a8c6a0a8c0', 'pendente', 'media',
   0, 0, '2026-05-20', true, '2026-04-06 12:00:43.054784+00', '4.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('b0d924b8-6892-43c9-9f10-1c1d23625be6', '1.2 Configurações', 'Parametrizar regras comerciais, tabelas de preço', '04400921-5e52-4bad-bc05-7bef132b8894', '34d0b57b-86d2-4a04-8f62-9f7b14290ad3', 'pendente', 'media',
   2, 0, '2026-04-18', false, '2026-04-06 12:01:50.964272+00', '1.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('d8994250-25bb-4245-8544-b6ff879a1ec8', '1.3 Cadastros', 'Cadastrar clientes, produtos, condições de pagamento', '04400921-5e52-4bad-bc05-7bef132b8894', '34d0b57b-86d2-4a04-8f62-9f7b14290ad3', 'pendente', 'media',
   3, 0, '2026-04-18', false, '2026-04-06 12:01:50.964272+00', '1.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('bb78a806-66f1-4088-acaa-63611b2098e3', '1.4 Vendas', 'Configurar e treinar módulo de vendas', '04400921-5e52-4bad-bc05-7bef132b8894', '34d0b57b-86d2-4a04-8f62-9f7b14290ad3', 'pendente', 'media',
   3, 0, '2026-04-18', false, '2026-04-06 12:01:50.964272+00', '1.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('db617998-e825-4655-9ce2-65ff746d9e7d', '1.5 NF-e', 'Configurar emissão de NF-e, certificado digital', '04400921-5e52-4bad-bc05-7bef132b8894', '34d0b57b-86d2-4a04-8f62-9f7b14290ad3', 'pendente', 'media',
   2, 0, '2026-04-18', false, '2026-04-06 12:01:50.964272+00', '1.5', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('72895002-945f-4e5f-90ce-5112d382b5c4', '1.6 Virada de Sistema: Vendas', 'Migrar operação de vendas para o novo sistema', '04400921-5e52-4bad-bc05-7bef132b8894', '34d0b57b-86d2-4a04-8f62-9f7b14290ad3', 'pendente', 'media',
   4, 0, '2026-04-18', false, '2026-04-06 12:01:50.964272+00', '1.6', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('1ee672ce-2aa9-4880-ac94-cf8eb2bc8bf6', '3.1 Controle Financeiro', 'Configurar contas a pagar, receber, plano de contas', '04400921-5e52-4bad-bc05-7bef132b8894', '28c9615b-ca8f-4761-b697-aef998af9c2c', 'pendente', 'media',
   2, 0, '2026-05-08', false, '2026-04-06 12:01:52.852612+00', '3.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('3c76c649-490b-4c11-aee1-c6fabc742567', '3.2 Controle de Estoque: Produto Acabado', 'Configurar controle de estoque de produto acabado', '04400921-5e52-4bad-bc05-7bef132b8894', '28c9615b-ca8f-4761-b697-aef998af9c2c', 'pendente', 'media',
   1, 0, '2026-05-08', false, '2026-04-06 12:01:52.852612+00', '3.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('ac4949e0-e6b2-4f63-9fa3-bb55d1de77d3', '3.3 Relatórios BI', 'Configurar dashboards e relatórios de business intelligence', '04400921-5e52-4bad-bc05-7bef132b8894', '28c9615b-ca8f-4761-b697-aef998af9c2c', 'pendente', 'media',
   1, 0, '2026-05-08', false, '2026-04-06 12:01:52.852612+00', '3.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('0fcb6075-7eb7-48ec-bfec-b7a0725a4e11', '3.4 Finalização do Projeto', 'Encerramento formal do projeto de implantação', '04400921-5e52-4bad-bc05-7bef132b8894', '28c9615b-ca8f-4761-b697-aef998af9c2c', 'pendente', 'media',
   0, 0, '2026-05-08', true, '2026-04-06 12:01:52.852612+00', '3.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('590e5034-32be-465b-b802-1182424f1a11', '0.5 Planilha Devolvida', 'Recebimento da planilha preenchida pelo cliente', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', '9bc95d28-a2a1-46f4-a5cf-65fd26d0de8b', 'pendente', 'media',
   0, 0, '2026-04-05', true, '2026-04-06 12:04:44.69041+00', '0.5', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('dd17d21c-8ef4-4196-92ae-830e618706b1', '0.6 Cronograma Pendente', 'Definição e validação do cronograma de implantação', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', '9bc95d28-a2a1-46f4-a5cf-65fd26d0de8b', 'pendente', 'media',
   0, 0, '2026-04-05', true, '2026-04-06 12:04:44.69041+00', '0.6', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('118d60e6-b8ca-4a5f-8abc-cb60ef499700', '1.1 Instalação do Sistema', 'Instalar e configurar ambiente do cliente', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', '36447383-9e90-4ec8-b978-3a2a792ae1f2', 'pendente', 'media',
   4, 0, '2026-04-15', false, '2026-04-06 12:04:45.132622+00', '1.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('9f793592-f341-4875-a59f-ccd6e6528995', '1.2 Configurações', 'Parametrizar regras comerciais, tabelas de preço', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', '36447383-9e90-4ec8-b978-3a2a792ae1f2', 'pendente', 'media',
   4, 0, '2026-04-15', false, '2026-04-06 12:04:45.132622+00', '1.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('cfe73cfd-322a-4dcb-95f1-3915dbad0bfd', '1.3 Cadastros', 'Cadastrar clientes, produtos, condições de pagamento', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', '36447383-9e90-4ec8-b978-3a2a792ae1f2', 'pendente', 'media',
   4, 0, '2026-04-15', false, '2026-04-06 12:04:45.132622+00', '1.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('5a76e6fb-82f9-47e4-96b1-1cf2de15bc2b', '0.4 Planilha Enviada', 'Envio da planilha modelo para preenchimento pelo cliente', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', '9bc95d28-a2a1-46f4-a5cf-65fd26d0de8b', 'concluida', 'media',
   0, 0, '2026-04-05', true, '2026-04-06 12:04:44.69041+00', '0.4', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('af0aad71-f221-4e00-b4ea-8c9e30059feb', '0.3 Reunião de Alinhamento', 'Reunião inicial para alinhar expectativas e cronograma', '60476651-5c1f-4025-9539-16f9385fd826', '0f79a2b0-072c-4675-af8d-781d550861aa', 'concluida', 'media',
   0, 0, '2026-04-10', true, '2026-04-06 12:00:39.663657+00', '0.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('a0ed7414-5f5f-4bff-8a99-337b3af980d7', '0.4 Planilha Enviada', 'Envio da planilha modelo para preenchimento pelo cliente', '60476651-5c1f-4025-9539-16f9385fd826', '0f79a2b0-072c-4675-af8d-781d550861aa', 'concluida', 'media',
   0, 0, '2026-04-10', true, '2026-04-06 12:00:39.663657+00', '0.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('e35e4919-2dbc-4ffe-90a5-4702983310f5', '1.4 Vendas', 'Configurar e treinar módulo de vendas', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', '36447383-9e90-4ec8-b978-3a2a792ae1f2', 'pendente', 'media',
   4, 0, '2026-04-15', false, '2026-04-06 12:04:45.132622+00', '1.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('1509133e-2032-41f0-bbd3-8bb9bcb2938a', '1.5 NF-e', 'Configurar emissão de NF-e, certificado digital', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', '36447383-9e90-4ec8-b978-3a2a792ae1f2', 'pendente', 'media',
   4, 0, '2026-04-15', false, '2026-04-06 12:04:45.132622+00', '1.5', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('bfe2897d-d13a-47c0-97c5-2e63a9d28b0e', '1.6 Virada de Sistema: Vendas', 'Migrar operação de vendas para o novo sistema', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', '36447383-9e90-4ec8-b978-3a2a792ae1f2', 'pendente', 'media',
   4, 0, '2026-04-15', false, '2026-04-06 12:04:45.132622+00', '1.6', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('540d808b-8796-4b39-be3f-e594d7b829f2', '1.7 AzVendas', 'Configurar módulo AzVendas', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', '36447383-9e90-4ec8-b978-3a2a792ae1f2', 'pendente', 'media',
   4, 0, '2026-04-15', false, '2026-04-06 12:04:45.132622+00', '1.7', 7)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('c2887c8d-9b20-4abc-b3c3-511491c50b22', '1.8 Integração E-commerce', 'Integrar sistema com loja virtual', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', '36447383-9e90-4ec8-b978-3a2a792ae1f2', 'pendente', 'media',
   2, 0, '2026-04-15', false, '2026-04-06 12:04:45.132622+00', '1.8', 8)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('2c7e405a-d763-4e04-8088-10c2a171628a', '2.1 Controle Financeiro', 'Configurar contas a pagar, receber, plano de contas', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', '4e483652-d797-4af2-977c-8b9483ed2174', 'pendente', 'media',
   2, 0, '2026-04-25', false, '2026-04-06 12:04:45.534013+00', '2.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('f2c6e719-dc81-4c6a-9229-007fc0b6a532', '2.2 Boletos', 'Configurar emissão e integração de boletos', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', '4e483652-d797-4af2-977c-8b9483ed2174', 'pendente', 'media',
   2, 0, '2026-04-25', false, '2026-04-06 12:04:45.534013+00', '2.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('882dd6a8-0dbc-4fc2-a25b-b91c994b8b27', '2.3 Controle de Cheque', 'Configurar controle de cheques recebidos e emitidos', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', '4e483652-d797-4af2-977c-8b9483ed2174', 'pendente', 'media',
   2, 0, '2026-04-25', false, '2026-04-06 12:04:45.534013+00', '2.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('ba9044c9-416b-4a0f-b9d0-70d492c279fe', '3.1 Cadastros: Produção', 'Cadastrar matérias-primas, aviamentos, grades', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', 'a2729be4-dbf7-46d9-8d40-7a828e60e92a', 'pendente', 'media',
   4, 0, '2026-05-05', false, '2026-04-06 12:04:45.896883+00', '3.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('1b38bbca-65fa-447b-9691-f9d5c4d6454c', '3.2 Ficha Técnica e Custo', 'Criar fichas técnicas com custos de produção', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', 'a2729be4-dbf7-46d9-8d40-7a828e60e92a', 'pendente', 'media',
   6, 0, '2026-05-05', false, '2026-04-06 12:04:45.896883+00', '3.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('92685eee-f99c-42f3-b052-f33c094bf807', '3.3 Ordem de Produção', 'Configurar fluxo de ordens de produção', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', 'a2729be4-dbf7-46d9-8d40-7a828e60e92a', 'pendente', 'media',
   4, 0, '2026-05-05', false, '2026-04-06 12:04:45.896883+00', '3.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('b3007ce6-6251-44e6-9ea4-0f1d860b6e77', '3.4 Virada de Sistema: Produção', 'Migrar operação de produção para o sistema', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', 'a2729be4-dbf7-46d9-8d40-7a828e60e92a', 'pendente', 'media',
   4, 0, '2026-05-05', false, '2026-04-06 12:04:45.896883+00', '3.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('98df564d-ebae-4e7f-bc36-ebf1687a8a7d', '3.5 Pagamento de Faccionistas', 'Cadastrar e configurar controle de facções', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', 'a2729be4-dbf7-46d9-8d40-7a828e60e92a', 'pendente', 'media',
   2, 0, '2026-05-05', false, '2026-04-06 12:04:45.896883+00', '3.5', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('01653096-314c-423b-93be-aaf54858c522', '3.6 Controle de Estoque', 'Configurar controle de estoque de insumos', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', 'a2729be4-dbf7-46d9-8d40-7a828e60e92a', 'pendente', 'media',
   4, 0, '2026-05-05', false, '2026-04-06 12:04:45.896883+00', '3.6', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('dbe07fc5-a917-4353-9295-6967b2228aca', '4.1 Fluxo de Caixa', 'Configurar relatório de fluxo de caixa', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', '91753f59-fba0-4b6c-8bc2-9d1000361e8d', 'pendente', 'media',
   2, 0, '2026-05-15', false, '2026-04-06 12:04:46.263093+00', '4.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('7bb370f0-4ddf-4308-b24e-9e23b1436990', '4.2 DRE', 'Configurar demonstrativo de resultados', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', '91753f59-fba0-4b6c-8bc2-9d1000361e8d', 'pendente', 'media',
   2, 0, '2026-05-15', false, '2026-04-06 12:04:46.263093+00', '4.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('cb3f7a37-0514-44c6-97d9-3aa5bf3db9af', '4.3 Relatórios BI', 'Configurar dashboards e relatórios de business intelligence', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', '91753f59-fba0-4b6c-8bc2-9d1000361e8d', 'pendente', 'media',
   2, 0, '2026-05-15', false, '2026-04-06 12:04:46.263093+00', '4.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('6ab99546-90f5-4dc9-9c75-47916804699c', '4.4 Compras', 'Configurar módulo de compras', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', '91753f59-fba0-4b6c-8bc2-9d1000361e8d', 'pendente', 'media',
   2, 0, '2026-05-15', false, '2026-04-06 12:04:46.263093+00', '4.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('84b8c191-82f9-42dd-a047-fe04c915db26', '4.5 Integração Correios', 'Integrar sistema com serviços dos correios', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', '91753f59-fba0-4b6c-8bc2-9d1000361e8d', 'pendente', 'media',
   2, 0, '2026-05-15', false, '2026-04-06 12:04:46.263093+00', '4.5', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('c21ab728-2d92-4d03-a182-fd3066a42068', '4.6 Finalização do Projeto', 'Encerramento formal do projeto de implantação', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', '91753f59-fba0-4b6c-8bc2-9d1000361e8d', 'pendente', 'media',
   0, 0, '2026-05-15', true, '2026-04-06 12:04:46.263093+00', '4.6', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('828d48ca-6e67-48da-bb2d-c937899631dc', '0.5 Planilha Devolvida', 'Recebimento da planilha preenchida pelo cliente', '4e36cf11-9121-4441-adcb-73aa56992196', 'cbe1da95-3f02-4185-83f5-e9e931db5c43', 'concluida', 'media',
   0, 0, '2026-04-04', true, '2026-04-06 12:05:25.505052+00', '0.5', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('ba82323e-1068-4d8c-8dd1-81392adfb27a', '1.1 Instalação do Sistema', 'Instalar e configurar ambiente do cliente', '4e36cf11-9121-4441-adcb-73aa56992196', '955a0691-bd41-4a0e-97eb-8bd16b5e6ce2', 'pendente', 'media',
   2, 0, '2026-04-14', false, '2026-04-06 12:05:25.953088+00', '1.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('3b0fcaf5-f9c4-45b1-bac0-e8047772b106', '1.2 Configurações', 'Parametrizar regras comerciais, tabelas de preço', '4e36cf11-9121-4441-adcb-73aa56992196', '955a0691-bd41-4a0e-97eb-8bd16b5e6ce2', 'pendente', 'media',
   2, 0, '2026-04-14', false, '2026-04-06 12:05:25.953088+00', '1.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('20690077-6205-4f9c-a763-c136b94502e1', '1.3 Cadastros', 'Cadastrar clientes, produtos, condições de pagamento', '4e36cf11-9121-4441-adcb-73aa56992196', '955a0691-bd41-4a0e-97eb-8bd16b5e6ce2', 'pendente', 'media',
   4, 0, '2026-04-14', false, '2026-04-06 12:05:25.953088+00', '1.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('7a2bc3b6-9087-4b11-b20a-e4465f60b33a', '1.4 Vendas', 'Configurar e treinar módulo de vendas', '4e36cf11-9121-4441-adcb-73aa56992196', '955a0691-bd41-4a0e-97eb-8bd16b5e6ce2', 'pendente', 'media',
   4, 0, '2026-04-14', false, '2026-04-06 12:05:25.953088+00', '1.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('82de0e84-ca09-4b4e-b8b6-7f68f05f9be4', '1.5 NF-e', 'Configurar emissão de NF-e, certificado digital', '4e36cf11-9121-4441-adcb-73aa56992196', '955a0691-bd41-4a0e-97eb-8bd16b5e6ce2', 'pendente', 'media',
   4, 0, '2026-04-14', false, '2026-04-06 12:05:25.953088+00', '1.5', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('8bad043a-67d1-490d-babc-0d60da7afaad', '1.6 Virada de Sistema: Vendas', 'Migrar operação de vendas para o novo sistema', '4e36cf11-9121-4441-adcb-73aa56992196', '955a0691-bd41-4a0e-97eb-8bd16b5e6ce2', 'pendente', 'media',
   4, 0, '2026-04-14', false, '2026-04-06 12:05:25.953088+00', '1.6', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('efa98514-8de5-43c0-9286-1e93295dd7cf', '2.1 Controle Financeiro', 'Configurar contas a pagar, receber, plano de contas', '4e36cf11-9121-4441-adcb-73aa56992196', 'ddabc116-63c9-4456-8ac1-44e3f7a65de3', 'pendente', 'media',
   3, 0, '2026-04-24', false, '2026-04-06 12:05:26.395837+00', '2.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('d5d33258-0c95-4419-a967-94e30cdb3c56', '2.2 Boletos', 'Configurar emissão e integração de boletos', '4e36cf11-9121-4441-adcb-73aa56992196', 'ddabc116-63c9-4456-8ac1-44e3f7a65de3', 'pendente', 'media',
   2, 0, '2026-04-24', false, '2026-04-06 12:05:26.395837+00', '2.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('bc69f59a-2ab7-4791-82e8-cd076daa0756', '3.1 Cadastros: Produção', 'Cadastrar matérias-primas, aviamentos, grades', '4e36cf11-9121-4441-adcb-73aa56992196', '94a62a3a-7675-4194-9c4d-f2ec042915a8', 'pendente', 'media',
   4, 0, '2026-05-04', false, '2026-04-06 12:05:26.793346+00', '3.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('bf934364-2864-457b-a109-7b8ff286a001', '3.2 Ficha Técnica e Custo', 'Criar fichas técnicas com custos de produção', '4e36cf11-9121-4441-adcb-73aa56992196', '94a62a3a-7675-4194-9c4d-f2ec042915a8', 'pendente', 'media',
   4, 0, '2026-05-04', false, '2026-04-06 12:05:26.793346+00', '3.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('21af6888-e78d-42fe-9670-6189dfc55604', '0.2 Formulário de boas-vindas', 'Envio e preenchimento do formulário de boas-vindas', '4e36cf11-9121-4441-adcb-73aa56992196', 'cbe1da95-3f02-4185-83f5-e9e931db5c43', 'concluida', 'media',
   0, 0, '2026-04-04', true, '2026-04-06 12:05:25.505052+00', '0.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('34822645-e37a-46b0-93cc-0986664cea76', '0.3 Reunião de Alinhamento', 'Reunião inicial para alinhar expectativas e cronograma', '4e36cf11-9121-4441-adcb-73aa56992196', 'cbe1da95-3f02-4185-83f5-e9e931db5c43', 'concluida', 'media',
   0, 0, '2026-04-04', true, '2026-04-06 12:05:25.505052+00', '0.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('8d5d0908-a047-460e-bd6d-a965bfe32d4a', '0.4 Planilha Enviada', 'Envio da planilha modelo para preenchimento pelo cliente', '4e36cf11-9121-4441-adcb-73aa56992196', 'cbe1da95-3f02-4185-83f5-e9e931db5c43', 'concluida', 'media',
   0, 0, '2026-04-04', true, '2026-04-06 12:05:25.505052+00', '0.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('176efe59-d639-4d3c-942b-3c891098382c', '0.6 Cronograma Pendente', 'Definição e validação do cronograma de implantação', '4e36cf11-9121-4441-adcb-73aa56992196', 'cbe1da95-3f02-4185-83f5-e9e931db5c43', 'concluida', 'media',
   0, 0, '2026-04-04', true, '2026-04-06 12:05:25.505052+00', '0.6', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('e06ea309-25c8-421d-91ca-3125ecfb4d90', '1.2 Configurações', 'Parametrizar regras comerciais, tabelas de preço', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', '9bf84517-b4d6-41e5-83bf-5aaa5f5047d0', 'pendente', 'media',
   2, 0, '2025-12-27', false, '2026-04-10 14:29:01.355422+00', '1.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('093fde6f-b002-475c-890e-b0c8f997a282', '3.3 Ordem de Produção', 'Configurar fluxo de ordens de produção', '4e36cf11-9121-4441-adcb-73aa56992196', '94a62a3a-7675-4194-9c4d-f2ec042915a8', 'pendente', 'media',
   4, 0, '2026-05-04', false, '2026-04-06 12:05:26.793346+00', '3.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('048e8774-11d8-4643-8d68-4f3399555d36', '3.4 Virada de Sistema: Produção', 'Migrar operação de produção para o sistema', '4e36cf11-9121-4441-adcb-73aa56992196', '94a62a3a-7675-4194-9c4d-f2ec042915a8', 'pendente', 'media',
   4, 0, '2026-05-04', false, '2026-04-06 12:05:26.793346+00', '3.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('a52a48c6-5ef1-4f9d-85f8-e94368021f87', '3.5 Pagamento de Faccionistas', 'Cadastrar e configurar controle de facções', '4e36cf11-9121-4441-adcb-73aa56992196', '94a62a3a-7675-4194-9c4d-f2ec042915a8', 'pendente', 'media',
   2, 0, '2026-05-04', false, '2026-04-06 12:05:26.793346+00', '3.5', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('48aadb74-ceba-427e-b5db-dc602adf2e13', '3.6 Controle de Estoque', 'Configurar controle de estoque de insumos', '4e36cf11-9121-4441-adcb-73aa56992196', '94a62a3a-7675-4194-9c4d-f2ec042915a8', 'pendente', 'media',
   3, 0, '2026-05-04', false, '2026-04-06 12:05:26.793346+00', '3.6', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('027d4408-f700-4fa3-8cf8-3d89ef2b9592', '4.1 Fluxo de Caixa', 'Configurar relatório de fluxo de caixa', '4e36cf11-9121-4441-adcb-73aa56992196', '840a2239-7d4f-47cc-a5a0-e69fc4f3676f', 'pendente', 'media',
   2, 0, '2026-05-14', false, '2026-04-06 12:05:27.204722+00', '4.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('20e3ced7-d6f3-46bd-995a-b2c3c4e3ecfa', '4.2 DRE', 'Configurar demonstrativo de resultados', '4e36cf11-9121-4441-adcb-73aa56992196', '840a2239-7d4f-47cc-a5a0-e69fc4f3676f', 'pendente', 'media',
   1, 0, '2026-05-14', false, '2026-04-06 12:05:27.204722+00', '4.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('ae1a5f21-db8c-4aac-8452-ad460dfd3a0e', '4.3 Relatórios BI', 'Configurar dashboards e relatórios de business intelligence', '4e36cf11-9121-4441-adcb-73aa56992196', '840a2239-7d4f-47cc-a5a0-e69fc4f3676f', 'pendente', 'media',
   1, 0, '2026-05-14', false, '2026-04-06 12:05:27.204722+00', '4.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('3d6cd846-f3d4-4a82-b263-3cffa23f5205', '4.4 Finalização do Projeto', 'Encerramento formal do projeto de implantação', '4e36cf11-9121-4441-adcb-73aa56992196', '840a2239-7d4f-47cc-a5a0-e69fc4f3676f', 'pendente', 'media',
   0, 0, '2026-05-14', true, '2026-04-06 12:05:27.204722+00', '4.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('072d5a09-6496-40ee-86e1-8bb70a7d5a15', '1.3 Cadastros', 'Cadastrar clientes, produtos, condições de pagamento', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', '9bf84517-b4d6-41e5-83bf-5aaa5f5047d0', 'pendente', 'media',
   4, 0, '2025-12-27', false, '2026-04-10 14:29:01.355422+00', '1.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('023686c1-ffd3-4748-ba70-4314190278a1', '1.2 Configurações', 'Parametrizar regras comerciais, tabelas de preço', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', '3aa6c557-fdf3-4ee7-b2c8-55366b95f365', 'pendente', 'media',
   4, 0, '2026-04-13', false, '2026-04-06 12:06:02.253157+00', '1.2', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('101caab5-2572-4981-8b65-33546bc77176', '1.3 Cadastros', 'Cadastrar clientes, produtos, condições de pagamento', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', '3aa6c557-fdf3-4ee7-b2c8-55366b95f365', 'pendente', 'media',
   4, 0, '2026-04-13', false, '2026-04-06 12:06:02.253157+00', '1.3', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('e22f2796-3901-4f70-bd1f-89d34befd5de', '1.4 Vendas', 'Configurar e treinar módulo de vendas', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', '3aa6c557-fdf3-4ee7-b2c8-55366b95f365', 'pendente', 'media',
   4, 0, '2026-04-13', false, '2026-04-06 12:06:02.253157+00', '1.4', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('b283e65b-9288-4376-b0ad-e2db9137ebcc', '1.5 NF-e', 'Configurar emissão de NF-e, certificado digital', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', '3aa6c557-fdf3-4ee7-b2c8-55366b95f365', 'pendente', 'media',
   4, 0, '2026-04-13', false, '2026-04-06 12:06:02.253157+00', '1.5', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('fa220fe3-0fcb-4cef-b68c-881dc9f770ef', '1.6 Virada de Sistema: Vendas', 'Migrar operação de vendas para o novo sistema', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', '3aa6c557-fdf3-4ee7-b2c8-55366b95f365', 'pendente', 'media',
   4, 0, '2026-04-13', false, '2026-04-06 12:06:02.253157+00', '1.6', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('cd24ef9f-eeed-4f95-82fb-2831e20e8501', '1.7 AzVendas', 'Configurar módulo AzVendas', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', '3aa6c557-fdf3-4ee7-b2c8-55366b95f365', 'pendente', 'media',
   4, 0, '2026-04-13', false, '2026-04-06 12:06:02.253157+00', '1.7', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('4795cd36-0cad-4d4c-8bd4-04526c74e8c8', '1.8 Integração E-commerce', 'Integrar sistema com loja virtual', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', '3aa6c557-fdf3-4ee7-b2c8-55366b95f365', 'pendente', 'media',
   2, 0, '2026-04-13', false, '2026-04-06 12:06:02.253157+00', '1.8', 7)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('3df932b0-0f4d-4f6e-9fa7-5653c544a51f', '2.1 Controle Financeiro', 'Configurar contas a pagar, receber, plano de contas', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', 'd4a4fa6d-6416-426e-a679-8f95e267e0fa', 'pendente', 'media',
   2, 0, '2026-04-23', false, '2026-04-06 12:06:02.669995+00', '2.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('1716bd66-2fa4-4923-8ae2-672d6f5e5b93', '2.2 Boletos', 'Configurar emissão e integração de boletos', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', 'd4a4fa6d-6416-426e-a679-8f95e267e0fa', 'pendente', 'media',
   2, 0, '2026-04-23', false, '2026-04-06 12:06:02.669995+00', '2.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('6fac1b8d-3a6d-4c2b-9b88-66df8ecbb489', '2.3 Controle de Cheque', 'Configurar controle de cheques recebidos e emitidos', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', 'd4a4fa6d-6416-426e-a679-8f95e267e0fa', 'pendente', 'media',
   2, 0, '2026-04-23', false, '2026-04-06 12:06:02.669995+00', '2.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('130263a1-a7d5-46bd-a110-695833462669', '3.1 Cadastros: Produção', 'Cadastrar matérias-primas, aviamentos, grades', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', 'a0fe0bbb-a87b-449e-8589-a53dde98c8f0', 'pendente', 'media',
   4, 0, '2026-05-03', false, '2026-04-06 12:06:03.078806+00', '3.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('fba114e5-b73b-4207-8329-c157b93fdbc4', '3.2 Ficha Técnica e Custo', 'Criar fichas técnicas com custos de produção', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', 'a0fe0bbb-a87b-449e-8589-a53dde98c8f0', 'pendente', 'media',
   6, 0, '2026-05-03', false, '2026-04-06 12:06:03.078806+00', '3.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('4a0465cb-6451-4199-8684-9e4e79abcc5c', '3.3 Ordem de Produção', 'Configurar fluxo de ordens de produção', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', 'a0fe0bbb-a87b-449e-8589-a53dde98c8f0', 'pendente', 'media',
   4, 0, '2026-05-03', false, '2026-04-06 12:06:03.078806+00', '3.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('6f8a2c7d-ac46-485f-8cbd-fd7bfb78605e', '3.4 Virada de Sistema: Produção', 'Migrar operação de produção para o sistema', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', 'a0fe0bbb-a87b-449e-8589-a53dde98c8f0', 'pendente', 'media',
   4, 0, '2026-05-03', false, '2026-04-06 12:06:03.078806+00', '3.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('7b65202f-3a6b-4cfa-8288-d36a76faa6e2', '3.5 Pagamento de Faccionistas', 'Cadastrar e configurar controle de facções', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', 'a0fe0bbb-a87b-449e-8589-a53dde98c8f0', 'pendente', 'media',
   2, 0, '2026-05-03', false, '2026-04-06 12:06:03.078806+00', '3.5', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('47e6b6a5-ce79-4010-86ed-c0b6daaa7199', '3.6 Controle de Estoque', 'Configurar controle de estoque de insumos', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', 'a0fe0bbb-a87b-449e-8589-a53dde98c8f0', 'pendente', 'media',
   4, 0, '2026-05-03', false, '2026-04-06 12:06:03.078806+00', '3.6', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('c6367ac6-9fca-4847-a909-c4e883715441', '4.1 Fluxo de Caixa', 'Configurar relatório de fluxo de caixa', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', 'e328c5b3-d0b2-438b-b3ec-a3bbbd3f2f68', 'pendente', 'media',
   2, 0, '2026-05-13', false, '2026-04-06 12:06:03.45791+00', '4.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('221d1152-0839-444f-a9bb-67a0410a8a9b', '4.2 DRE', 'Configurar demonstrativo de resultados', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', 'e328c5b3-d0b2-438b-b3ec-a3bbbd3f2f68', 'pendente', 'media',
   2, 0, '2026-05-13', false, '2026-04-06 12:06:03.45791+00', '4.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('abc8244d-034c-4590-b1fd-b7be6ce5c843', '4.3 Relatórios BI', 'Configurar dashboards e relatórios de business intelligence', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', 'e328c5b3-d0b2-438b-b3ec-a3bbbd3f2f68', 'pendente', 'media',
   2, 0, '2026-05-13', false, '2026-04-06 12:06:03.45791+00', '4.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('57de1520-a77b-43df-8341-11850de62dc2', '4.4 Compras', 'Configurar módulo de compras', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', 'e328c5b3-d0b2-438b-b3ec-a3bbbd3f2f68', 'pendente', 'media',
   2, 0, '2026-05-13', false, '2026-04-06 12:06:03.45791+00', '4.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('aabe3863-d8c6-4adb-9b45-e7286ec63777', '4.5 Integração Correios', 'Integrar sistema com serviços dos correios', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', 'e328c5b3-d0b2-438b-b3ec-a3bbbd3f2f68', 'pendente', 'media',
   2, 0, '2026-05-13', false, '2026-04-06 12:06:03.45791+00', '4.5', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('de9c87d9-b6bb-43cc-8cfd-23e5e2956093', '0.2 Formulário de boas-vindas', 'Envio e preenchimento do formulário de boas-vindas', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', 'a30f9538-e988-4613-b77e-378d665e8a97', 'concluida', 'media',
   0, 0, '2026-04-03', true, '2026-04-06 12:06:01.820523+00', '0.2', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('dc2e8324-460d-4d0c-b540-7da14eede9b2', '0.3 Reunião de Alinhamento', 'Reunião inicial para alinhar expectativas e cronograma', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', 'a30f9538-e988-4613-b77e-378d665e8a97', 'concluida', 'media',
   0, 0, '2026-04-03', true, '2026-04-06 12:06:01.820523+00', '0.3', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('dfa71f24-502c-4f73-9807-425e496b0412', '0.4 Planilha Enviada', 'Envio da planilha modelo para preenchimento pelo cliente', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', 'a30f9538-e988-4613-b77e-378d665e8a97', 'concluida', 'media',
   0, 0, '2026-04-03', true, '2026-04-06 12:06:01.820523+00', '0.4', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('4cfa3f26-c05f-48af-b674-211485c688c7', '0.5 Planilha Devolvida', 'Recebimento da planilha preenchida pelo cliente', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', 'a30f9538-e988-4613-b77e-378d665e8a97', 'concluida', 'media',
   0, 0, '2026-04-03', true, '2026-04-06 12:06:01.820523+00', '0.5', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('01bba8fd-f98b-49c6-9ad1-7b1ba1bd4c1f', '0.6 Cronograma Pendente', 'Definição e validação do cronograma de implantação', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', 'a30f9538-e988-4613-b77e-378d665e8a97', 'concluida', 'media',
   0, 0, '2026-04-03', true, '2026-04-06 12:06:01.820523+00', '0.6', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('07321770-8bbf-4839-92cb-8afaca2a5bcd', '1.1 Instalação do Sistema', 'Instalar e configurar ambiente do cliente', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', '3aa6c557-fdf3-4ee7-b2c8-55366b95f365', 'concluida', 'media',
   4, 1, '2026-04-13', false, '2026-04-06 12:06:02.253157+00', '1.1', 8)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('973f2ebf-3ef4-40aa-b6d6-78affe56e95a', '4.6 Finalização do Projeto', 'Encerramento formal do projeto de implantação', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', 'e328c5b3-d0b2-438b-b3ec-a3bbbd3f2f68', 'pendente', 'media',
   0, 0, '2026-05-13', true, '2026-04-06 12:06:03.45791+00', '4.6', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('e03b7ac6-45ef-4b14-bcc0-1fb54dab3aa9', '1.4 Vendas', 'Configurar e treinar módulo de vendas', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', '9bf84517-b4d6-41e5-83bf-5aaa5f5047d0', 'pendente', 'media',
   4, 0, '2025-12-27', false, '2026-04-10 14:29:01.355422+00', '1.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('0b607831-3797-41fa-82be-eba013d7b170', '1.5 NF-e', 'Configurar emissão de NF-e, certificado digital', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', '9bf84517-b4d6-41e5-83bf-5aaa5f5047d0', 'pendente', 'media',
   4, 0, '2025-12-27', false, '2026-04-10 14:29:01.355422+00', '1.5', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('6a256607-29b8-4760-8bbb-7ea7648c410e', '0.5 Planilha Devolvida', 'Recebimento da planilha preenchida pelo cliente', 'a0806098-50e2-4cc8-a976-591117f36aa7', 'a11b7a30-5dd9-4500-bac3-e9d1325a73b1', 'pendente', 'media',
   0, 0, '2026-04-03', true, '2026-04-06 12:06:46.083688+00', '0.5', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('15dbaeca-d193-445b-be79-8dac549478c5', '0.6 Cronograma Pendente', 'Definição e validação do cronograma de implantação', 'a0806098-50e2-4cc8-a976-591117f36aa7', 'a11b7a30-5dd9-4500-bac3-e9d1325a73b1', 'pendente', 'media',
   0, 0, '2026-04-03', true, '2026-04-06 12:06:46.083688+00', '0.6', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('c4dd3d7e-e9b1-4910-8bad-b47f643798a3', '1.1 Instalação do Sistema', 'Instalar e configurar ambiente do cliente', 'a0806098-50e2-4cc8-a976-591117f36aa7', 'bd9efdd7-8beb-4ee4-ab24-116ab176027d', 'pendente', 'media',
   2, 0, '2026-04-13', false, '2026-04-06 12:06:46.726658+00', '1.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('af1f7114-289d-44bb-af8f-56815f0b8772', '1.2 Configurações', 'Parametrizar regras comerciais, tabelas de preço', 'a0806098-50e2-4cc8-a976-591117f36aa7', 'bd9efdd7-8beb-4ee4-ab24-116ab176027d', 'pendente', 'media',
   2, 0, '2026-04-13', false, '2026-04-06 12:06:46.726658+00', '1.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('7225c11e-742a-43e3-bc98-ac40e1f2bd86', '1.3 Cadastros', 'Cadastrar clientes, produtos, condições de pagamento', 'a0806098-50e2-4cc8-a976-591117f36aa7', 'bd9efdd7-8beb-4ee4-ab24-116ab176027d', 'pendente', 'media',
   3, 0, '2026-04-13', false, '2026-04-06 12:06:46.726658+00', '1.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('164ffeba-190b-4b6a-9213-9cca4f521ac9', '1.4 Vendas', 'Configurar e treinar módulo de vendas', 'a0806098-50e2-4cc8-a976-591117f36aa7', 'bd9efdd7-8beb-4ee4-ab24-116ab176027d', 'pendente', 'media',
   3, 0, '2026-04-13', false, '2026-04-06 12:06:46.726658+00', '1.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('db77848e-32b2-4502-9fc8-9d5b735599ff', '1.5 NF-e', 'Configurar emissão de NF-e, certificado digital', 'a0806098-50e2-4cc8-a976-591117f36aa7', 'bd9efdd7-8beb-4ee4-ab24-116ab176027d', 'pendente', 'media',
   2, 0, '2026-04-13', false, '2026-04-06 12:06:46.726658+00', '1.5', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('a539a23b-a2be-4c41-b5a6-d56f7012c1b6', '1.6 Virada de Sistema: Vendas', 'Migrar operação de vendas para o novo sistema', 'a0806098-50e2-4cc8-a976-591117f36aa7', 'bd9efdd7-8beb-4ee4-ab24-116ab176027d', 'pendente', 'media',
   4, 0, '2026-04-13', false, '2026-04-06 12:06:46.726658+00', '1.6', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('3457a5e6-da58-41b5-8f0e-3a0b5f885bac', '2.1 Cadastros: Produção', 'Cadastrar matérias-primas, aviamentos, grades', 'a0806098-50e2-4cc8-a976-591117f36aa7', '8782705d-b534-49de-8b0c-ffbf5d80551d', 'pendente', 'media',
   3, 0, '2026-04-23', false, '2026-04-06 12:06:48.812684+00', '2.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('8229593a-c690-4015-a769-addaf1611db0', '2.2 Ordem de Produção', 'Configurar fluxo de ordens de produção', 'a0806098-50e2-4cc8-a976-591117f36aa7', '8782705d-b534-49de-8b0c-ffbf5d80551d', 'pendente', 'media',
   3, 0, '2026-04-23', false, '2026-04-06 12:06:48.812684+00', '2.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('07428f5e-e581-4b08-995c-b8e0dcb92a26', '2.3 Virada de Sistema: Produção', 'Migrar operação de produção para o sistema', 'a0806098-50e2-4cc8-a976-591117f36aa7', '8782705d-b534-49de-8b0c-ffbf5d80551d', 'pendente', 'media',
   4, 0, '2026-04-23', false, '2026-04-06 12:06:48.812684+00', '2.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('65b1ea05-f677-4c40-84ab-3eb2706e7de1', '3.1 Controle Financeiro', 'Configurar contas a pagar, receber, plano de contas', 'a0806098-50e2-4cc8-a976-591117f36aa7', 'a585785d-4c0a-4b20-9445-8033fabbe7c1', 'pendente', 'media',
   2, 0, '2026-05-03', false, '2026-04-06 12:06:49.650685+00', '3.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('f9070d16-7b8e-4d83-b0b1-b3c0906fe52e', '3.2 Controle de Estoque: Produto Acabado', 'Configurar controle de estoque de produto acabado', 'a0806098-50e2-4cc8-a976-591117f36aa7', 'a585785d-4c0a-4b20-9445-8033fabbe7c1', 'pendente', 'media',
   1, 0, '2026-05-03', false, '2026-04-06 12:06:49.650685+00', '3.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('cf11f8ff-8aa5-445a-a049-f65973fb02cd', '3.3 Relatórios BI', 'Configurar dashboards e relatórios de business intelligence', 'a0806098-50e2-4cc8-a976-591117f36aa7', 'a585785d-4c0a-4b20-9445-8033fabbe7c1', 'pendente', 'media',
   1, 0, '2026-05-03', false, '2026-04-06 12:06:49.650685+00', '3.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('4b6fd2c6-2455-4aee-bdd8-d5f52779c30c', '3.4 Finalização do Projeto', 'Encerramento formal do projeto de implantação', 'a0806098-50e2-4cc8-a976-591117f36aa7', 'a585785d-4c0a-4b20-9445-8033fabbe7c1', 'pendente', 'media',
   0, 0, '2026-05-03', true, '2026-04-06 12:06:49.650685+00', '3.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('334febc8-736e-44cd-97ab-a6328d28cb1e', '1.5 NF-e', 'Configurar emissão de NF-e, certificado digital', '66792e18-6327-421f-a82e-ebb6803ca1b0', 'e2fa344b-ac76-4933-bf42-3017647014a3', 'pendente', 'media',
   4, 0, '2026-04-01', false, '2026-04-06 12:07:55.303534+00', '1.5', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('e0fca211-dd96-469b-88d3-910ac2705bfc', '1.6 Virada de Sistema: Vendas', 'Migrar operação de vendas para o novo sistema', '66792e18-6327-421f-a82e-ebb6803ca1b0', 'e2fa344b-ac76-4933-bf42-3017647014a3', 'pendente', 'media',
   4, 0, '2026-04-01', false, '2026-04-06 12:07:55.303534+00', '1.6', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('63dafe6b-bff0-489c-824a-d648470dcb82', '2.1 Controle Financeiro', 'Configurar contas a pagar, receber, plano de contas', '66792e18-6327-421f-a82e-ebb6803ca1b0', '566d1ebe-291d-4778-be3e-0e0e76ca9fe3', 'pendente', 'media',
   3, 0, '2026-04-11', false, '2026-04-06 12:07:55.86167+00', '2.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('d9a7e034-1f69-4df0-a5a6-588c5e0e6541', '2.2 Boletos', 'Configurar emissão e integração de boletos', '66792e18-6327-421f-a82e-ebb6803ca1b0', '566d1ebe-291d-4778-be3e-0e0e76ca9fe3', 'pendente', 'media',
   2, 0, '2026-04-11', false, '2026-04-06 12:07:55.86167+00', '2.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('6dcf1ccf-0d69-488c-97f5-f19861f8a3c6', '3.1 Cadastros: Produção', 'Cadastrar matérias-primas, aviamentos, grades', '66792e18-6327-421f-a82e-ebb6803ca1b0', 'ce988d17-4ca6-403f-bd6e-be3e955b3bb4', 'pendente', 'media',
   4, 0, '2026-04-21', false, '2026-04-06 12:07:56.341109+00', '3.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('0b9477b0-24ab-48d5-83ca-7eaba56e8dde', '3.2 Ficha Técnica e Custo', 'Criar fichas técnicas com custos de produção', '66792e18-6327-421f-a82e-ebb6803ca1b0', 'ce988d17-4ca6-403f-bd6e-be3e955b3bb4', 'pendente', 'media',
   4, 0, '2026-04-21', false, '2026-04-06 12:07:56.341109+00', '3.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('f29750f3-9732-4a57-af76-00a42de09a66', '0.3 Reunião de Alinhamento', 'Reunião inicial para alinhar expectativas e cronograma', 'a0806098-50e2-4cc8-a976-591117f36aa7', 'a11b7a30-5dd9-4500-bac3-e9d1325a73b1', 'concluida', 'media',
   0, 0, '2026-04-03', true, '2026-04-06 12:06:46.083688+00', '0.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('f2bdaaf5-4ed2-48f3-a11a-a2f7258cd0cb', '0.4 Planilha Enviada', 'Envio da planilha modelo para preenchimento pelo cliente', 'a0806098-50e2-4cc8-a976-591117f36aa7', 'a11b7a30-5dd9-4500-bac3-e9d1325a73b1', 'concluida', 'media',
   0, 0, '2026-04-03', true, '2026-04-06 12:06:46.083688+00', '0.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('1fb54468-9762-4dbe-9afd-9d536d09b706', '0.1 Primeiro Contato', 'Primeiro contato com o cliente', '66792e18-6327-421f-a82e-ebb6803ca1b0', '14c55e61-136c-492b-a8cf-83fb0e860e56', 'concluida', 'media',
   0, 0, '2026-03-22', true, '2026-04-06 12:07:54.698083+00', '0.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('aae656c4-c776-4ddf-9e99-379f4d7a2b0b', '0.2 Formulário de boas-vindas', 'Envio e preenchimento do formulário de boas-vindas', '66792e18-6327-421f-a82e-ebb6803ca1b0', '14c55e61-136c-492b-a8cf-83fb0e860e56', 'concluida', 'media',
   0, 0, '2026-03-22', true, '2026-04-06 12:07:54.698083+00', '0.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('1747cb60-3bb6-4e13-879c-83cde828cca8', '0.3 Reunião de Alinhamento', 'Reunião inicial para alinhar expectativas e cronograma', '66792e18-6327-421f-a82e-ebb6803ca1b0', '14c55e61-136c-492b-a8cf-83fb0e860e56', 'concluida', 'media',
   0, 0, '2026-03-22', true, '2026-04-06 12:07:54.698083+00', '0.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('e2211caf-0b40-48c2-a28f-770f210efab4', '0.4 Planilha Enviada', 'Envio da planilha modelo para preenchimento pelo cliente', '66792e18-6327-421f-a82e-ebb6803ca1b0', '14c55e61-136c-492b-a8cf-83fb0e860e56', 'concluida', 'media',
   0, 0, '2026-03-22', true, '2026-04-06 12:07:54.698083+00', '0.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('30692de8-c63c-439a-9697-1afbce83746b', '0.5 Planilha Devolvida', 'Recebimento da planilha preenchida pelo cliente', '66792e18-6327-421f-a82e-ebb6803ca1b0', '14c55e61-136c-492b-a8cf-83fb0e860e56', 'concluida', 'media',
   0, 0, '2026-03-22', true, '2026-04-06 12:07:54.698083+00', '0.5', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('b3619e4b-0492-4b77-b39e-19b1b49ec8ca', '0.6 Cronograma Pendente', 'Definição e validação do cronograma de implantação', '66792e18-6327-421f-a82e-ebb6803ca1b0', '14c55e61-136c-492b-a8cf-83fb0e860e56', 'concluida', 'media',
   0, 0, '2026-03-22', true, '2026-04-06 12:07:54.698083+00', '0.6', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('3fe0ef02-54e6-46ef-9b81-970e051a940e', '1.1 Instalação do Sistema', 'Instalar e configurar ambiente do cliente', '66792e18-6327-421f-a82e-ebb6803ca1b0', 'e2fa344b-ac76-4933-bf42-3017647014a3', 'concluida', 'media',
   2, 3, '2026-04-01', false, '2026-04-06 12:07:55.303534+00', '1.1', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('25653c6c-5bb6-4252-959e-766d359588dc', '1.2 Configurações', 'Parametrizar regras comerciais, tabelas de preço', '66792e18-6327-421f-a82e-ebb6803ca1b0', 'e2fa344b-ac76-4933-bf42-3017647014a3', 'concluida', 'media',
   2, 2, '2026-04-01', false, '2026-04-06 12:07:55.303534+00', '1.2', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('445f8f79-5e3e-4191-8bc4-1de0445c83eb', '1.4 Vendas', 'Configurar e treinar módulo de vendas', '66792e18-6327-421f-a82e-ebb6803ca1b0', 'e2fa344b-ac76-4933-bf42-3017647014a3', 'concluida', 'media',
   4, 3, '2026-04-01', false, '2026-04-06 12:07:55.303534+00', '1.4', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('6f2fe7d5-0cdf-4dac-9cd9-c09f486003dd', '3.3 Ordem de Produção', 'Configurar fluxo de ordens de produção', '66792e18-6327-421f-a82e-ebb6803ca1b0', 'ce988d17-4ca6-403f-bd6e-be3e955b3bb4', 'pendente', 'media',
   4, 0, '2026-04-21', false, '2026-04-06 12:07:56.341109+00', '3.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('018e2325-8e52-44d5-ad86-f29e847ecc4d', '3.4 Virada de Sistema: Produção', 'Migrar operação de produção para o sistema', '66792e18-6327-421f-a82e-ebb6803ca1b0', 'ce988d17-4ca6-403f-bd6e-be3e955b3bb4', 'pendente', 'media',
   4, 0, '2026-04-21', false, '2026-04-06 12:07:56.341109+00', '3.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('35a28427-d05d-490e-887e-3b39f0a17948', '3.5 Pagamento de Faccionistas', 'Cadastrar e configurar controle de facções', '66792e18-6327-421f-a82e-ebb6803ca1b0', 'ce988d17-4ca6-403f-bd6e-be3e955b3bb4', 'pendente', 'media',
   2, 0, '2026-04-21', false, '2026-04-06 12:07:56.341109+00', '3.5', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('d8746924-3b83-4617-a827-bab7417909fb', '3.6 Controle de Estoque', 'Configurar controle de estoque de insumos', '66792e18-6327-421f-a82e-ebb6803ca1b0', 'ce988d17-4ca6-403f-bd6e-be3e955b3bb4', 'pendente', 'media',
   3, 0, '2026-04-21', false, '2026-04-06 12:07:56.341109+00', '3.6', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('c039c80c-0283-4431-a81c-6ebcedb6af2d', '4.1 Fluxo de Caixa', 'Configurar relatório de fluxo de caixa', '66792e18-6327-421f-a82e-ebb6803ca1b0', '1631ef22-3f90-446a-a8f8-39927b19eaa7', 'pendente', 'media',
   2, 0, '2026-05-01', false, '2026-04-06 12:07:56.816079+00', '4.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('af7157d4-2a4b-48ca-953c-cbd3ebc4856a', '4.2 DRE', 'Configurar demonstrativo de resultados', '66792e18-6327-421f-a82e-ebb6803ca1b0', '1631ef22-3f90-446a-a8f8-39927b19eaa7', 'pendente', 'media',
   1, 0, '2026-05-01', false, '2026-04-06 12:07:56.816079+00', '4.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('09738fdf-f8fc-4bcb-a3ec-8e14ed96838f', '4.3 Relatórios BI', 'Configurar dashboards e relatórios de business intelligence', '66792e18-6327-421f-a82e-ebb6803ca1b0', '1631ef22-3f90-446a-a8f8-39927b19eaa7', 'pendente', 'media',
   1, 0, '2026-05-01', false, '2026-04-06 12:07:56.816079+00', '4.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('45cbb031-15bb-46bb-ab3c-0d7339ff5d63', '4.4 Finalização do Projeto', 'Encerramento formal do projeto de implantação', '66792e18-6327-421f-a82e-ebb6803ca1b0', '1631ef22-3f90-446a-a8f8-39927b19eaa7', 'pendente', 'media',
   0, 0, '2026-05-01', true, '2026-04-06 12:07:56.816079+00', '4.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('ce9b31f6-6c3f-44ad-89b2-ef3cb935a3a9', '1.6 Virada de Sistema: Vendas', 'Migrar operação de vendas para o novo sistema', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', '9bf84517-b4d6-41e5-83bf-5aaa5f5047d0', 'pendente', 'media',
   4, 0, '2025-12-27', false, '2026-04-10 14:29:01.355422+00', '1.6', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('bb84c820-45a9-4370-9de0-3d4e4442c62f', '0.5 Planilha Devolvida', 'Recebimento da planilha preenchida pelo cliente', 'f51a9f52-fbe5-4936-945a-8ee79d163730', '6bd163f1-ff6f-4dab-add0-865167747af9', 'pendente', 'media',
   0, 0, '2026-03-21', true, '2026-04-06 12:08:32.430113+00', '0.5', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('cc17475d-fb8e-410c-bd7d-9bb2a5c4cd02', '0.6 Cronograma Pendente', 'Definição e validação do cronograma de implantação', 'f51a9f52-fbe5-4936-945a-8ee79d163730', '6bd163f1-ff6f-4dab-add0-865167747af9', 'pendente', 'media',
   0, 0, '2026-03-21', true, '2026-04-06 12:08:32.430113+00', '0.6', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('3d54cbcc-a6be-4d7a-80af-5584a464e117', '1.1 Instalação do Sistema', 'Instalar e configurar ambiente do cliente', 'f51a9f52-fbe5-4936-945a-8ee79d163730', 'be11e3f7-0044-416f-a1bb-1b038fbc1d0f', 'pendente', 'media',
   2, 0, '2026-03-31', false, '2026-04-06 12:08:33.004688+00', '1.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('eedca0fa-d8fa-475c-b5dd-1504184c5d1e', '1.2 Configurações', 'Parametrizar regras comerciais, tabelas de preço', 'f51a9f52-fbe5-4936-945a-8ee79d163730', 'be11e3f7-0044-416f-a1bb-1b038fbc1d0f', 'pendente', 'media',
   2, 0, '2026-03-31', false, '2026-04-06 12:08:33.004688+00', '1.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('6ebbe1b7-34cc-4ae3-9dbf-765443f7e766', '1.3 Cadastros', 'Cadastrar clientes, produtos, condições de pagamento', 'f51a9f52-fbe5-4936-945a-8ee79d163730', 'be11e3f7-0044-416f-a1bb-1b038fbc1d0f', 'pendente', 'media',
   4, 0, '2026-03-31', false, '2026-04-06 12:08:33.004688+00', '1.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('e9a6725e-9e2f-401a-b8ed-81be997c2b3a', '1.4 Vendas', 'Configurar e treinar módulo de vendas', 'f51a9f52-fbe5-4936-945a-8ee79d163730', 'be11e3f7-0044-416f-a1bb-1b038fbc1d0f', 'pendente', 'media',
   4, 0, '2026-03-31', false, '2026-04-06 12:08:33.004688+00', '1.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('5d7b5e2d-980a-46fe-ab7f-cb8e4c8b6f21', '1.5 NF-e', 'Configurar emissão de NF-e, certificado digital', 'f51a9f52-fbe5-4936-945a-8ee79d163730', 'be11e3f7-0044-416f-a1bb-1b038fbc1d0f', 'pendente', 'media',
   4, 0, '2026-03-31', false, '2026-04-06 12:08:33.004688+00', '1.5', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('838862e8-9d0e-4d4b-a495-aa9e10725d7e', '1.6 Virada de Sistema: Vendas', 'Migrar operação de vendas para o novo sistema', 'f51a9f52-fbe5-4936-945a-8ee79d163730', 'be11e3f7-0044-416f-a1bb-1b038fbc1d0f', 'pendente', 'media',
   4, 0, '2026-03-31', false, '2026-04-06 12:08:33.004688+00', '1.6', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('c4ebb1a7-f7fc-4f27-8890-a63a58473459', '2.1 Controle Financeiro', 'Configurar contas a pagar, receber, plano de contas', 'f51a9f52-fbe5-4936-945a-8ee79d163730', 'fe248148-b04d-4492-a4b6-8dd928b7603e', 'pendente', 'media',
   3, 0, '2026-04-10', false, '2026-04-06 12:08:33.408599+00', '2.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('efe3cb36-0da6-4b1a-a56c-693604cbf1d4', '2.2 Boletos', 'Configurar emissão e integração de boletos', 'f51a9f52-fbe5-4936-945a-8ee79d163730', 'fe248148-b04d-4492-a4b6-8dd928b7603e', 'pendente', 'media',
   2, 0, '2026-04-10', false, '2026-04-06 12:08:33.408599+00', '2.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('8d22b2d5-ccbc-48f7-8865-4329e3723d16', '3.1 Cadastros: Produção', 'Cadastrar matérias-primas, aviamentos, grades', 'f51a9f52-fbe5-4936-945a-8ee79d163730', '77f1e36c-a902-48f9-a65f-11b443dadc01', 'pendente', 'media',
   4, 0, '2026-04-20', false, '2026-04-06 12:08:33.779843+00', '3.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('573c109d-63d5-4ecd-b8ce-026ec146a7eb', '3.2 Ficha Técnica e Custo', 'Criar fichas técnicas com custos de produção', 'f51a9f52-fbe5-4936-945a-8ee79d163730', '77f1e36c-a902-48f9-a65f-11b443dadc01', 'pendente', 'media',
   4, 0, '2026-04-20', false, '2026-04-06 12:08:33.779843+00', '3.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('4d6aeab7-cd99-4571-98e5-77c62a25d34b', '3.3 Ordem de Produção', 'Configurar fluxo de ordens de produção', 'f51a9f52-fbe5-4936-945a-8ee79d163730', '77f1e36c-a902-48f9-a65f-11b443dadc01', 'pendente', 'media',
   4, 0, '2026-04-20', false, '2026-04-06 12:08:33.779843+00', '3.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('787c612e-6ab5-4d35-95c3-5ecf98f5e0c3', '3.4 Virada de Sistema: Produção', 'Migrar operação de produção para o sistema', 'f51a9f52-fbe5-4936-945a-8ee79d163730', '77f1e36c-a902-48f9-a65f-11b443dadc01', 'pendente', 'media',
   4, 0, '2026-04-20', false, '2026-04-06 12:08:33.779843+00', '3.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('5ff167fb-7396-4548-9d95-96b6797c94a0', '3.5 Pagamento de Faccionistas', 'Cadastrar e configurar controle de facções', 'f51a9f52-fbe5-4936-945a-8ee79d163730', '77f1e36c-a902-48f9-a65f-11b443dadc01', 'pendente', 'media',
   2, 0, '2026-04-20', false, '2026-04-06 12:08:33.779843+00', '3.5', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('f1d3f264-c15b-4659-a21d-852899fd827e', '3.6 Controle de Estoque', 'Configurar controle de estoque de insumos', 'f51a9f52-fbe5-4936-945a-8ee79d163730', '77f1e36c-a902-48f9-a65f-11b443dadc01', 'pendente', 'media',
   3, 0, '2026-04-20', false, '2026-04-06 12:08:33.779843+00', '3.6', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('d00219e8-dc89-4904-8989-ee5ed0cb382d', '4.1 Fluxo de Caixa', 'Configurar relatório de fluxo de caixa', 'f51a9f52-fbe5-4936-945a-8ee79d163730', 'd7eb1375-2394-46bd-b238-c07204c38daf', 'pendente', 'media',
   2, 0, '2026-04-30', false, '2026-04-06 12:08:34.214741+00', '4.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('eda0f1b2-2633-4506-97a8-7988be2d77b5', '4.2 DRE', 'Configurar demonstrativo de resultados', 'f51a9f52-fbe5-4936-945a-8ee79d163730', 'd7eb1375-2394-46bd-b238-c07204c38daf', 'pendente', 'media',
   1, 0, '2026-04-30', false, '2026-04-06 12:08:34.214741+00', '4.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('1bc58aa2-c24f-4e20-9042-0f380a00411f', '4.3 Relatórios BI', 'Configurar dashboards e relatórios de business intelligence', 'f51a9f52-fbe5-4936-945a-8ee79d163730', 'd7eb1375-2394-46bd-b238-c07204c38daf', 'pendente', 'media',
   1, 0, '2026-04-30', false, '2026-04-06 12:08:34.214741+00', '4.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('18e020ad-d6c6-4451-b9f6-3516595714c3', '4.4 Finalização do Projeto', 'Encerramento formal do projeto de implantação', 'f51a9f52-fbe5-4936-945a-8ee79d163730', 'd7eb1375-2394-46bd-b238-c07204c38daf', 'pendente', 'media',
   0, 0, '2026-04-30', true, '2026-04-06 12:08:34.214741+00', '4.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('91e45b0e-b7d1-462f-9d4d-ef07d805e3b8', '0.2 Formulário de boas-vindas', 'Envio e preenchimento do formulário de boas-vindas', 'f51a9f52-fbe5-4936-945a-8ee79d163730', '6bd163f1-ff6f-4dab-add0-865167747af9', 'concluida', 'media',
   0, 0, '2026-03-21', true, '2026-04-06 12:08:32.430113+00', '0.2', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('3fc718f9-16b3-4754-bc4a-6da913671266', '0.3 Reunião de Alinhamento', 'Reunião inicial para alinhar expectativas e cronograma', 'f51a9f52-fbe5-4936-945a-8ee79d163730', '6bd163f1-ff6f-4dab-add0-865167747af9', 'concluida', 'media',
   0, 0, '2026-03-21', true, '2026-04-06 12:08:32.430113+00', '0.3', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('b80c0d70-6ad3-4120-834a-129d6da46716', '0.4 Planilha Enviada', 'Envio da planilha modelo para preenchimento pelo cliente', 'f51a9f52-fbe5-4936-945a-8ee79d163730', '6bd163f1-ff6f-4dab-add0-865167747af9', 'concluida', 'media',
   0, 0, '2026-03-21', true, '2026-04-06 12:08:32.430113+00', '0.4', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('adbdda0b-dff8-4d76-8c9e-397ab7d29112', '0.1 Primeiro Contato', 'Primeiro contato com o cliente', 'dccf443e-93c7-4008-bed6-959515e6114f', '04bf434d-89c1-4a48-984a-62281bc79c92', 'concluida', 'media',
   0, 0, '2026-03-20', true, '2026-04-06 12:08:59.222854+00', '0.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('fad4c1b0-7e8d-4d5d-a808-5b02ca67ba05', '0.2 Formulário de boas-vindas', 'Envio e preenchimento do formulário de boas-vindas', 'dccf443e-93c7-4008-bed6-959515e6114f', '04bf434d-89c1-4a48-984a-62281bc79c92', 'concluida', 'media',
   0, 0, '2026-03-20', true, '2026-04-06 12:08:59.222854+00', '0.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('1a92ca9e-25bc-4d34-ac39-bb0a9b4b3f03', '0.3 Reunião de Alinhamento', 'Reunião inicial para alinhar expectativas e cronograma', 'dccf443e-93c7-4008-bed6-959515e6114f', '04bf434d-89c1-4a48-984a-62281bc79c92', 'concluida', 'media',
   0, 0, '2026-03-20', true, '2026-04-06 12:08:59.222854+00', '0.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('4365f581-7d02-4ea7-93ca-fa8437d9271e', '0.4 Planilha Enviada', 'Envio da planilha modelo para preenchimento pelo cliente', 'dccf443e-93c7-4008-bed6-959515e6114f', '04bf434d-89c1-4a48-984a-62281bc79c92', 'concluida', 'media',
   0, 0, '2026-03-20', true, '2026-04-06 12:08:59.222854+00', '0.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('39e24a9b-90a3-4b01-aca3-49303a492e63', '0.5 Planilha Devolvida', 'Recebimento da planilha preenchida pelo cliente', 'dccf443e-93c7-4008-bed6-959515e6114f', '04bf434d-89c1-4a48-984a-62281bc79c92', 'concluida', 'media',
   0, 0, '2026-03-20', true, '2026-04-06 12:08:59.222854+00', '0.5', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('f246f576-04bd-4bed-b685-5ee4d5df45d2', '0.6 Cronograma Pendente', 'Definição e validação do cronograma de implantação', 'dccf443e-93c7-4008-bed6-959515e6114f', '04bf434d-89c1-4a48-984a-62281bc79c92', 'concluida', 'media',
   0, 0, '2026-03-20', true, '2026-04-06 12:08:59.222854+00', '0.6', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('8e71da38-3145-43b7-aaf4-d06c3f96dcb1', '2.1 Controle Financeiro', 'Configurar contas a pagar, receber, plano de contas', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', '46f511de-32be-4c94-a3c7-04439f75da2e', 'pendente', 'media',
   3, 0, '2026-01-06', false, '2026-04-10 14:29:01.75619+00', '2.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('aeb156f7-6e53-436a-b42c-05949e3d537f', '2.2 Boletos', 'Configurar emissão e integração de boletos', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', '46f511de-32be-4c94-a3c7-04439f75da2e', 'pendente', 'media',
   2, 0, '2026-01-06', false, '2026-04-10 14:29:01.75619+00', '2.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('116e0669-94e8-4ca6-be30-ef659553f5eb', '0.2 Formulário de boas-vindas', 'Envio e preenchimento do formulário de boas-vindas', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', 'b63e0f0e-ab51-4537-a655-7a29dcbfa450', 'pendente', 'media',
   0, 0, '2026-04-19', true, '2026-04-10 14:51:48.234436+00', '0.2', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('f3adadd7-b863-4c5f-9804-fee7e8d9757a', '0.3 Reunião de Alinhamento', 'Reunião inicial para alinhar expectativas e cronograma', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', 'b63e0f0e-ab51-4537-a655-7a29dcbfa450', 'pendente', 'media',
   0, 0, '2026-04-19', true, '2026-04-10 14:51:48.234436+00', '0.3', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('c436c80b-7834-4a07-b460-63c61869ba2e', '0.4 Planilha Enviada', 'Envio da planilha modelo para preenchimento pelo cliente', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', 'b63e0f0e-ab51-4537-a655-7a29dcbfa450', 'pendente', 'media',
   0, 0, '2026-04-19', true, '2026-04-10 14:51:48.234436+00', '0.4', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('a685609f-3e64-438e-bc06-0a02cbb496f6', '0.5 Planilha Devolvida', 'Recebimento da planilha preenchida pelo cliente', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', 'b63e0f0e-ab51-4537-a655-7a29dcbfa450', 'pendente', 'media',
   0, 0, '2026-04-19', true, '2026-04-10 14:51:48.234436+00', '0.5', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('c5a679d7-5e1b-43ed-bcc8-f1606c3c46d5', '0.6 Cronograma Pendente', 'Definição e validação do cronograma de implantação', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', 'b63e0f0e-ab51-4537-a655-7a29dcbfa450', 'pendente', 'media',
   0, 0, '2026-04-19', true, '2026-04-10 14:51:48.234436+00', '0.6', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('2ed90fa2-203d-488a-bbf8-9502d0a8a511', '0.1 Primeiro Contato', 'Primeiro contato com o cliente', 'b63f3bf0-e2f1-4409-816a-98d43d435161', '726bcc74-c5b0-4365-b5e2-bb1f2c61b40f', 'concluida', 'media',
   0, 0, '2026-02-19', true, '2026-04-06 12:11:25.642762+00', '0.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('806e44d5-7418-4b37-9acb-37359015672a', '0.1 Primeiro Contato', 'Primeiro contato com o cliente', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', 'b63e0f0e-ab51-4537-a655-7a29dcbfa450', 'concluida', 'media',
   0, 0, '2026-04-19', true, '2026-04-10 14:51:48.234436+00', '0.1', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('b639937b-39eb-4ddc-bf80-0250bd30484a', '1.6 Virada de Sistema: Vendas', 'Migrar operação de vendas para o novo sistema', 'dccf443e-93c7-4008-bed6-959515e6114f', '1796054f-456f-4ea6-bf75-38a359377bdc', 'pendente', 'media',
   4, 0, '2026-03-30', false, '2026-04-06 12:08:59.696192+00', '1.6', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('c66122da-7457-4954-96a4-6d0c398c6d4d', '3.1 Cadastros: Produção', 'Cadastrar matérias-primas, aviamentos, grades', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', 'b7702933-6d00-4af6-ac47-975687587a73', 'pendente', 'media',
   4, 0, '2026-01-16', false, '2026-04-10 14:29:02.150502+00', '3.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('15be6081-4d68-464a-844a-6866b014e531', '1.1 Instalação do Sistema', 'Instalar e configurar ambiente do cliente', 'dccf443e-93c7-4008-bed6-959515e6114f', '1796054f-456f-4ea6-bf75-38a359377bdc', 'concluida', 'media',
   2, 1.5, '2026-03-30', false, '2026-04-06 12:08:59.696192+00', '1.1', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('a97903b3-b93a-4460-bf3f-988df3b5fded', '3.2 Ficha Técnica e Custo', 'Criar fichas técnicas com custos de produção', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', 'b7702933-6d00-4af6-ac47-975687587a73', 'pendente', 'media',
   4, 0, '2026-01-16', false, '2026-04-10 14:29:02.150502+00', '3.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('000aeb62-ae5d-4c27-9b81-1917cbb52a36', '1.2 Configurações', 'Parametrizar regras comerciais, tabelas de preço', 'dccf443e-93c7-4008-bed6-959515e6114f', '1796054f-456f-4ea6-bf75-38a359377bdc', 'concluida', 'media',
   2, 1, '2026-03-30', false, '2026-04-06 12:08:59.696192+00', '1.2', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('62b9abba-cf8c-4ea2-8578-f893dd6b63c6', '3.3 Ordem de Produção', 'Configurar fluxo de ordens de produção', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', 'b7702933-6d00-4af6-ac47-975687587a73', 'pendente', 'media',
   4, 0, '2026-01-16', false, '2026-04-10 14:29:02.150502+00', '3.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('aba08a4b-b7e0-48bb-bcf5-1238d8a7fcb7', '3.4 Virada de Sistema: Produção', 'Migrar operação de produção para o sistema', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', 'b7702933-6d00-4af6-ac47-975687587a73', 'pendente', 'media',
   4, 0, '2026-01-16', false, '2026-04-10 14:29:02.150502+00', '3.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('c00a6323-82fc-494d-b06f-96fda18a2225', '3.5 Pagamento de Faccionistas', 'Cadastrar e configurar controle de facções', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', 'b7702933-6d00-4af6-ac47-975687587a73', 'pendente', 'media',
   2, 0, '2026-01-16', false, '2026-04-10 14:29:02.150502+00', '3.5', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('cd0f80dc-0f35-48e2-a328-dc5fbe204598', '3.6 Controle de Estoque', 'Configurar controle de estoque de insumos', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', 'b7702933-6d00-4af6-ac47-975687587a73', 'pendente', 'media',
   3, 0, '2026-01-16', false, '2026-04-10 14:29:02.150502+00', '3.6', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('19f8496e-fdcc-4d0c-95df-17b3109d94cf', '1.1 Instalação do Sistema', 'Instalar e configurar ambiente do cliente', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', 'ad10a837-fd3c-454e-aea4-af2194f9866c', 'pendente', 'media',
   2, 0, '2026-04-29', false, '2026-04-10 14:51:48.691518+00', '1.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('086b2afa-da3f-4a74-8216-cc80af666633', '1.2 Configurações', 'Parametrizar regras comerciais, tabelas de preço', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', 'ad10a837-fd3c-454e-aea4-af2194f9866c', 'pendente', 'media',
   2, 0, '2026-04-29', false, '2026-04-10 14:51:48.691518+00', '1.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('f5f2e532-79fe-476b-a2fd-7f1908b17a03', '1.3 Cadastros', 'Cadastrar clientes, produtos, condições de pagamento', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', 'ad10a837-fd3c-454e-aea4-af2194f9866c', 'pendente', 'media',
   4, 0, '2026-04-29', false, '2026-04-10 14:51:48.691518+00', '1.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('42a358bb-0dbb-47ff-a9c2-051f8304e666', '1.4 Vendas', 'Configurar e treinar módulo de vendas', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', 'ad10a837-fd3c-454e-aea4-af2194f9866c', 'pendente', 'media',
   4, 0, '2026-04-29', false, '2026-04-10 14:51:48.691518+00', '1.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('1edc1247-1116-4614-b9c2-981d4c54579d', '1.5 NF-e', 'Configurar emissão de NF-e, certificado digital', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', 'ad10a837-fd3c-454e-aea4-af2194f9866c', 'pendente', 'media',
   4, 0, '2026-04-29', false, '2026-04-10 14:51:48.691518+00', '1.5', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('8a75deb6-10dd-450d-80d3-e2dbd5964654', '1.6 Virada de Sistema: Vendas', 'Migrar operação de vendas para o novo sistema', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', 'ad10a837-fd3c-454e-aea4-af2194f9866c', 'pendente', 'media',
   4, 0, '2026-04-29', false, '2026-04-10 14:51:48.691518+00', '1.6', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('5d7c2236-d43c-42ec-a772-2c38683b8477', '1.4 Vendas', 'Configurar e treinar módulo de vendas', 'dccf443e-93c7-4008-bed6-959515e6114f', '1796054f-456f-4ea6-bf75-38a359377bdc', 'concluida', 'media',
   3, 0.5, '2026-03-30', false, '2026-04-06 12:08:59.696192+00', '1.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('1974d9c9-a02a-4360-aef1-c2a02535dc0a', '1.5 NF-e', 'Configurar emissão de NF-e, certificado digital', 'dccf443e-93c7-4008-bed6-959515e6114f', '1796054f-456f-4ea6-bf75-38a359377bdc', 'concluida', 'media',
   2, 0.5, '2026-03-30', false, '2026-04-06 12:08:59.696192+00', '1.5', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('c0b7581f-ca3e-482a-9bf8-f7d801e8e54b', '0.6 Cronograma Pendente', 'Definição e validação do cronograma de implantação', 'eedf5d41-73cc-4283-9f51-02152efab15e', '496d6e96-3b16-4ba5-9f2b-0c10e3880a29', 'concluida', 'media',
   0, 0, '2026-02-18', true, '2026-04-06 12:12:00.805445+00', '0.6', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('48e1b0fe-a0ba-4b80-9615-0ec1206616bd', '1.3 Cadastros', 'Cadastrar clientes, produtos, condições de pagamento', 'dccf443e-93c7-4008-bed6-959515e6114f', '1796054f-456f-4ea6-bf75-38a359377bdc', 'concluida', 'media',
   3, 0.5, '2026-03-30', false, '2026-04-06 12:08:59.696192+00', '1.3', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('61cc6b83-b5b8-4183-bf5b-0ebb08386a32', '2.1 Cadastros: Produção', 'Cadastrar matérias-primas, aviamentos, grades', 'dccf443e-93c7-4008-bed6-959515e6114f', '987b728a-4aef-49e2-af1b-ba04b4b1f704', 'pendente', 'media',
   3, 0, '2026-04-09', false, '2026-04-06 12:09:00.354894+00', '2.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('1acefff3-1e79-4445-b82a-a57c3c83dc3f', '2.2 Ordem de Produção', 'Configurar fluxo de ordens de produção', 'dccf443e-93c7-4008-bed6-959515e6114f', '987b728a-4aef-49e2-af1b-ba04b4b1f704', 'pendente', 'media',
   3, 0, '2026-04-09', false, '2026-04-06 12:09:00.354894+00', '2.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('b5aa45a9-4df7-40f7-8b7b-efabd96069a1', '2.3 Virada de Sistema: Produção', 'Migrar operação de produção para o sistema', 'dccf443e-93c7-4008-bed6-959515e6114f', '987b728a-4aef-49e2-af1b-ba04b4b1f704', 'pendente', 'media',
   4, 0, '2026-04-09', false, '2026-04-06 12:09:00.354894+00', '2.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('374dabc1-25c4-49de-93ba-3d6bf179d469', '4.1 Fluxo de Caixa', 'Configurar relatório de fluxo de caixa', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', 'be97f436-ea47-4934-8a63-a7dc20d79b8e', 'pendente', 'media',
   2, 0, '2026-01-26', false, '2026-04-10 14:29:02.615829+00', '4.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('acd51362-979b-4bb9-acf4-fa58299d3a50', '4.2 DRE', 'Configurar demonstrativo de resultados', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', 'be97f436-ea47-4934-8a63-a7dc20d79b8e', 'pendente', 'media',
   1, 0, '2026-01-26', false, '2026-04-10 14:29:02.615829+00', '4.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('00f132a8-bd1d-4c89-9b23-29902d78c95e', '4.3 Relatórios BI', 'Configurar dashboards e relatórios de business intelligence', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', 'be97f436-ea47-4934-8a63-a7dc20d79b8e', 'pendente', 'media',
   1, 0, '2026-01-26', false, '2026-04-10 14:29:02.615829+00', '4.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('ed4bb395-16de-4dcb-8aa6-ae46c6b6af9e', '4.4 Finalização do Projeto', 'Encerramento formal do projeto de implantação', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', 'be97f436-ea47-4934-8a63-a7dc20d79b8e', 'pendente', 'media',
   0, 0, '2026-01-26', true, '2026-04-10 14:29:02.615829+00', '4.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('c3905650-8299-48dc-bca2-04334131cb91', '0.2 Formulário de boas-vindas', 'Envio e preenchimento do formulário de boas-vindas', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', '1493b760-0bd8-4d56-bee1-e1d680065011', 'concluida', 'media',
   0, 0, '2025-12-17', true, '2026-04-10 14:29:00.882376+00', '0.2', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('39c5b2ea-e156-460d-8a46-1b616d51fb20', '2.1 Controle Financeiro', 'Configurar contas a pagar, receber, plano de contas', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', 'fc7b5405-bb61-4a2b-9b59-654673fd1180', 'pendente', 'media',
   3, 0, '2026-05-09', false, '2026-04-10 14:51:49.114305+00', '2.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('cda40a7e-035e-4b00-b5e5-ebb2502a1013', '2.2 Boletos', 'Configurar emissão e integração de boletos', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', 'fc7b5405-bb61-4a2b-9b59-654673fd1180', 'pendente', 'media',
   2, 0, '2026-05-09', false, '2026-04-10 14:51:49.114305+00', '2.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('92282b61-a595-4107-8d52-2a1d1ba8762b', '0.1 Primeiro Contato', 'Primeiro contato com o cliente', 'aa7deed2-435e-4f36-a85f-06e1023ba1de', 'ca2b5849-9ef5-44f1-8d7a-51aa13bc5c5b', 'concluida', 'media',
   0, 0, '2026-04-18', true, '2026-04-10 14:50:15.396324+00', '0.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('e00b1417-68f1-4c34-a51b-bc2d37849ef3', '3.1 Controle Financeiro', 'Configurar contas a pagar, receber, plano de contas', 'dccf443e-93c7-4008-bed6-959515e6114f', '9f22c560-2921-4d4c-a0dd-ba51a15854af', 'pendente', 'media',
   2, 0, '2026-04-19', false, '2026-04-06 12:09:00.781937+00', '3.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('b436c5e1-48ad-4f89-b75f-1df44978ee55', '3.2 Controle de Estoque: Produto Acabado', 'Configurar controle de estoque de produto acabado', 'dccf443e-93c7-4008-bed6-959515e6114f', '9f22c560-2921-4d4c-a0dd-ba51a15854af', 'pendente', 'media',
   1, 0, '2026-04-19', false, '2026-04-06 12:09:00.781937+00', '3.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('471deec7-0af7-4d51-942a-e9820b69f990', '3.3 Relatórios BI', 'Configurar dashboards e relatórios de business intelligence', 'dccf443e-93c7-4008-bed6-959515e6114f', '9f22c560-2921-4d4c-a0dd-ba51a15854af', 'pendente', 'media',
   1, 0, '2026-04-19', false, '2026-04-06 12:09:00.781937+00', '3.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('7154ddf1-02d1-45f0-9b50-69747929fb1b', '3.4 Finalização do Projeto', 'Encerramento formal do projeto de implantação', 'dccf443e-93c7-4008-bed6-959515e6114f', '9f22c560-2921-4d4c-a0dd-ba51a15854af', 'pendente', 'media',
   0, 0, '2026-04-19', true, '2026-04-06 12:09:00.781937+00', '3.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('84906499-1d3e-4085-b39c-ab007c869767', '0.5 Planilha Devolvida', 'Recebimento da planilha preenchida pelo cliente', 'be964773-2599-4300-86c1-5d7dae304952', 'ae200fd7-9af6-4dd1-9a76-03232a62b3bc', 'pendente', 'media',
   0, 0, '2026-03-20', true, '2026-04-06 12:09:22.402256+00', '0.5', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('041a70f0-3129-47a8-a2f9-2226d6b7ece3', '0.6 Cronograma Pendente', 'Definição e validação do cronograma de implantação', 'be964773-2599-4300-86c1-5d7dae304952', 'ae200fd7-9af6-4dd1-9a76-03232a62b3bc', 'pendente', 'media',
   0, 0, '2026-03-20', true, '2026-04-06 12:09:22.402256+00', '0.6', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('234479b3-b1b8-4738-80bb-e27aa3033147', '1.1 Instalação do Sistema', 'Instalar e configurar ambiente do cliente', 'be964773-2599-4300-86c1-5d7dae304952', '5c86c394-fab4-49af-930a-6be00f3275d1', 'pendente', 'media',
   2, 0, '2026-03-30', false, '2026-04-06 12:09:22.789609+00', '1.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('139f0b95-3f1a-4759-a7ff-8e1a512d8bd0', '1.2 Configurações', 'Parametrizar regras comerciais, tabelas de preço', 'be964773-2599-4300-86c1-5d7dae304952', '5c86c394-fab4-49af-930a-6be00f3275d1', 'pendente', 'media',
   2, 0, '2026-03-30', false, '2026-04-06 12:09:22.789609+00', '1.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('28fc744f-938b-49b8-b376-05ecea09d6e3', '1.3 Cadastros', 'Cadastrar clientes, produtos, condições de pagamento', 'be964773-2599-4300-86c1-5d7dae304952', '5c86c394-fab4-49af-930a-6be00f3275d1', 'pendente', 'media',
   4, 0, '2026-03-30', false, '2026-04-06 12:09:22.789609+00', '1.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('8847b4d3-bd7b-4edc-8f9a-1546fb7431ee', '1.4 Vendas', 'Configurar e treinar módulo de vendas', 'be964773-2599-4300-86c1-5d7dae304952', '5c86c394-fab4-49af-930a-6be00f3275d1', 'pendente', 'media',
   4, 0, '2026-03-30', false, '2026-04-06 12:09:22.789609+00', '1.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('08a55864-d4f3-4957-93e7-2648e0aac58b', '1.5 NF-e', 'Configurar emissão de NF-e, certificado digital', 'be964773-2599-4300-86c1-5d7dae304952', '5c86c394-fab4-49af-930a-6be00f3275d1', 'pendente', 'media',
   4, 0, '2026-03-30', false, '2026-04-06 12:09:22.789609+00', '1.5', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('f567457c-d2fb-4e3c-86d3-ac3c5335d7d1', '1.6 Virada de Sistema: Vendas', 'Migrar operação de vendas para o novo sistema', 'be964773-2599-4300-86c1-5d7dae304952', '5c86c394-fab4-49af-930a-6be00f3275d1', 'pendente', 'media',
   4, 0, '2026-03-30', false, '2026-04-06 12:09:22.789609+00', '1.6', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('aed067a3-037f-4730-9b83-5c2dd705150a', '2.1 Controle Financeiro', 'Configurar contas a pagar, receber, plano de contas', 'be964773-2599-4300-86c1-5d7dae304952', '69f1fee3-5b4d-4cac-85b5-7b4bc75cbdad', 'pendente', 'media',
   3, 0, '2026-04-09', false, '2026-04-06 12:09:23.239799+00', '2.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('9b629bb8-fa7c-4c0d-a22d-135ab815952c', '2.2 Boletos', 'Configurar emissão e integração de boletos', 'be964773-2599-4300-86c1-5d7dae304952', '69f1fee3-5b4d-4cac-85b5-7b4bc75cbdad', 'pendente', 'media',
   2, 0, '2026-04-09', false, '2026-04-06 12:09:23.239799+00', '2.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('c6ab58b6-4d59-4850-940a-6522f94a4a2e', '3.1 Cadastros: Produção', 'Cadastrar matérias-primas, aviamentos, grades', 'be964773-2599-4300-86c1-5d7dae304952', '84134b1c-028b-4ac4-ad46-fcd00624edf9', 'pendente', 'media',
   4, 0, '2026-04-19', false, '2026-04-06 12:09:23.600183+00', '3.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('0a0d68ad-845f-4d0d-b163-bf4535581a2d', '3.2 Ficha Técnica e Custo', 'Criar fichas técnicas com custos de produção', 'be964773-2599-4300-86c1-5d7dae304952', '84134b1c-028b-4ac4-ad46-fcd00624edf9', 'pendente', 'media',
   4, 0, '2026-04-19', false, '2026-04-06 12:09:23.600183+00', '3.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('d277d73c-6c33-4f5d-92ad-9f0eff6a4b59', '3.3 Ordem de Produção', 'Configurar fluxo de ordens de produção', 'be964773-2599-4300-86c1-5d7dae304952', '84134b1c-028b-4ac4-ad46-fcd00624edf9', 'pendente', 'media',
   4, 0, '2026-04-19', false, '2026-04-06 12:09:23.600183+00', '3.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('8538dd04-d7f5-4167-abde-1f63f2d046e3', '3.4 Virada de Sistema: Produção', 'Migrar operação de produção para o sistema', 'be964773-2599-4300-86c1-5d7dae304952', '84134b1c-028b-4ac4-ad46-fcd00624edf9', 'pendente', 'media',
   4, 0, '2026-04-19', false, '2026-04-06 12:09:23.600183+00', '3.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('cbd0f814-ba83-4e64-88b5-d6031b8a8eb4', '3.5 Pagamento de Faccionistas', 'Cadastrar e configurar controle de facções', 'be964773-2599-4300-86c1-5d7dae304952', '84134b1c-028b-4ac4-ad46-fcd00624edf9', 'pendente', 'media',
   2, 0, '2026-04-19', false, '2026-04-06 12:09:23.600183+00', '3.5', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('f6c43d1f-37ad-4f8e-81d4-eb5e277c6c3a', '3.6 Controle de Estoque', 'Configurar controle de estoque de insumos', 'be964773-2599-4300-86c1-5d7dae304952', '84134b1c-028b-4ac4-ad46-fcd00624edf9', 'pendente', 'media',
   3, 0, '2026-04-19', false, '2026-04-06 12:09:23.600183+00', '3.6', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('a8aa77a5-d0eb-4b9b-9096-c479e56abed6', '4.1 Fluxo de Caixa', 'Configurar relatório de fluxo de caixa', 'be964773-2599-4300-86c1-5d7dae304952', '11b4250c-af34-4ef6-9e4f-8a6488d36ac2', 'pendente', 'media',
   2, 0, '2026-04-29', false, '2026-04-06 12:09:24.023799+00', '4.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('b9964bd1-1367-43e4-9a9e-2e39ca964e1e', '4.2 DRE', 'Configurar demonstrativo de resultados', 'be964773-2599-4300-86c1-5d7dae304952', '11b4250c-af34-4ef6-9e4f-8a6488d36ac2', 'pendente', 'media',
   1, 0, '2026-04-29', false, '2026-04-06 12:09:24.023799+00', '4.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('c290c52b-9c93-4700-93c3-02d9ce8c33bb', '4.3 Relatórios BI', 'Configurar dashboards e relatórios de business intelligence', 'be964773-2599-4300-86c1-5d7dae304952', '11b4250c-af34-4ef6-9e4f-8a6488d36ac2', 'pendente', 'media',
   1, 0, '2026-04-29', false, '2026-04-06 12:09:24.023799+00', '4.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('a7b3f291-c422-41fb-8d0a-625b3807aa38', '4.4 Finalização do Projeto', 'Encerramento formal do projeto de implantação', 'be964773-2599-4300-86c1-5d7dae304952', '11b4250c-af34-4ef6-9e4f-8a6488d36ac2', 'pendente', 'media',
   0, 0, '2026-04-29', true, '2026-04-06 12:09:24.023799+00', '4.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('8939011f-ed29-401d-9eac-87c0d68eac99', '3.1 Cadastros: Produção', 'Cadastrar matérias-primas, aviamentos, grades', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', '0dbde837-8d2e-4f90-88f8-320f52b6bd57', 'pendente', 'media',
   4, 0, '2026-05-19', false, '2026-04-10 14:51:49.486493+00', '3.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('a92a1c0a-5587-4c40-a5ee-92b207741d96', '0.2 Formulário de boas-vindas', 'Envio e preenchimento do formulário de boas-vindas', 'be964773-2599-4300-86c1-5d7dae304952', 'ae200fd7-9af6-4dd1-9a76-03232a62b3bc', 'concluida', 'media',
   0, 0, '2026-03-20', true, '2026-04-06 12:09:22.402256+00', '0.2', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('a94011a1-4be2-4951-951d-4734b502764a', '0.3 Reunião de Alinhamento', 'Reunião inicial para alinhar expectativas e cronograma', 'be964773-2599-4300-86c1-5d7dae304952', 'ae200fd7-9af6-4dd1-9a76-03232a62b3bc', 'concluida', 'media',
   0, 0, '2026-03-20', true, '2026-04-06 12:09:22.402256+00', '0.3', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('7c91a1c3-13c2-4c86-b0b1-7f98287fc321', '0.4 Planilha Enviada', 'Envio da planilha modelo para preenchimento pelo cliente', 'be964773-2599-4300-86c1-5d7dae304952', 'ae200fd7-9af6-4dd1-9a76-03232a62b3bc', 'concluida', 'media',
   0, 0, '2026-03-20', true, '2026-04-06 12:09:22.402256+00', '0.4', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('a91f018b-8eb3-49e6-9ec7-e53bd62cf9eb', '0.1 Primeiro Contato', 'Primeiro contato com o cliente', '9a2aaacd-6f11-4931-b41d-b7c103006919', 'b92dfd36-95cb-4091-9c98-6321800c7590', 'concluida', 'media',
   0, 0, '2026-03-11', true, '2026-04-06 12:10:03.211774+00', '0.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('35894db8-3c06-4e8d-8b5a-5ff1c8a65a6e', '0.3 Reunião de Alinhamento', 'Reunião inicial para alinhar expectativas e cronograma', '9a2aaacd-6f11-4931-b41d-b7c103006919', 'b92dfd36-95cb-4091-9c98-6321800c7590', 'concluida', 'media',
   0, 0, '2026-03-11', true, '2026-04-06 12:10:03.211774+00', '0.3', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('33c07a19-65b7-42da-8e8d-c92b3c58b654', '0.4 Planilha Enviada', 'Envio da planilha modelo para preenchimento pelo cliente', '9a2aaacd-6f11-4931-b41d-b7c103006919', 'b92dfd36-95cb-4091-9c98-6321800c7590', 'concluida', 'media',
   0, 0, '2026-03-11', true, '2026-04-06 12:10:03.211774+00', '0.4', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('26664fb2-bc2a-4e8d-a594-195ff3f20d2f', '0.5 Planilha Devolvida', 'Recebimento da planilha preenchida pelo cliente', '9a2aaacd-6f11-4931-b41d-b7c103006919', 'b92dfd36-95cb-4091-9c98-6321800c7590', 'concluida', 'media',
   0, 0, '2026-03-11', true, '2026-04-06 12:10:03.211774+00', '0.5', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('2b1466d4-f9f7-42d4-a5ec-1c035036a589', '0.6 Cronograma Pendente', 'Definição e validação do cronograma de implantação', '9a2aaacd-6f11-4931-b41d-b7c103006919', 'b92dfd36-95cb-4091-9c98-6321800c7590', 'concluida', 'media',
   0, 0, '2026-03-11', true, '2026-04-06 12:10:03.211774+00', '0.6', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('c1811820-c514-4625-8c7d-4e2fd8610f66', '1.1 Instalação do Sistema', 'Instalar e configurar ambiente do cliente', '9a2aaacd-6f11-4931-b41d-b7c103006919', '6ee86de9-4b6a-4ca1-9e22-3463587efd41', 'concluida', 'media',
   2, 1.5, '2026-03-21', false, '2026-04-06 12:10:03.760304+00', '1.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('f4c4bfb9-da35-45e8-baec-b01c3ea4b9e1', '1.2 Configurações', 'Parametrizar regras comerciais, tabelas de preço', '9a2aaacd-6f11-4931-b41d-b7c103006919', '6ee86de9-4b6a-4ca1-9e22-3463587efd41', 'concluida', 'media',
   2, 2.5, '2026-03-21', false, '2026-04-06 12:10:03.760304+00', '1.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('1e023161-339e-46d0-9a4f-e2d94505c563', '1.5 NF-e', 'Configurar emissão de NF-e, certificado digital', '9a2aaacd-6f11-4931-b41d-b7c103006919', '6ee86de9-4b6a-4ca1-9e22-3463587efd41', 'pendente', 'media',
   4, 0, '2026-03-21', false, '2026-04-06 12:10:03.760304+00', '1.5', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('3aee15c5-f0e0-4fbe-bbcf-af11a150dc15', '1.6 Virada de Sistema: Vendas', 'Migrar operação de vendas para o novo sistema', '9a2aaacd-6f11-4931-b41d-b7c103006919', '6ee86de9-4b6a-4ca1-9e22-3463587efd41', 'pendente', 'media',
   4, 0, '2026-03-21', false, '2026-04-06 12:10:03.760304+00', '1.6', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('209b55e5-c376-485c-9ad6-ab8d9ad9d1c1', '2.1 Controle Financeiro', 'Configurar contas a pagar, receber, plano de contas', '9a2aaacd-6f11-4931-b41d-b7c103006919', '79bb802b-851a-4723-862c-0306c1e680e2', 'pendente', 'media',
   3, 0, '2026-03-31', false, '2026-04-06 12:10:04.248599+00', '2.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('597f4f27-5563-4177-9320-a1dc6b3e1a19', '2.2 Boletos', 'Configurar emissão e integração de boletos', '9a2aaacd-6f11-4931-b41d-b7c103006919', '79bb802b-851a-4723-862c-0306c1e680e2', 'pendente', 'media',
   2, 0, '2026-03-31', false, '2026-04-06 12:10:04.248599+00', '2.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('573e440c-e371-408f-a3cf-bb4b91307622', '3.1 Cadastros: Produção', 'Cadastrar matérias-primas, aviamentos, grades', '9a2aaacd-6f11-4931-b41d-b7c103006919', '75534dce-9a1b-4e4a-8f0c-6e705ab25523', 'pendente', 'media',
   4, 0, '2026-04-10', false, '2026-04-06 12:10:04.656836+00', '3.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('4dba8c3e-cb84-4b3c-a624-d61be24420f5', '3.2 Ficha Técnica e Custo', 'Criar fichas técnicas com custos de produção', '9a2aaacd-6f11-4931-b41d-b7c103006919', '75534dce-9a1b-4e4a-8f0c-6e705ab25523', 'pendente', 'media',
   4, 0, '2026-04-10', false, '2026-04-06 12:10:04.656836+00', '3.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('cbb2296b-cb9e-49e7-9704-4690681eb101', '3.3 Ordem de Produção', 'Configurar fluxo de ordens de produção', '9a2aaacd-6f11-4931-b41d-b7c103006919', '75534dce-9a1b-4e4a-8f0c-6e705ab25523', 'pendente', 'media',
   4, 0, '2026-04-10', false, '2026-04-06 12:10:04.656836+00', '3.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('b2ffd473-212b-4895-ad6e-3d7fd527c89e', '3.4 Virada de Sistema: Produção', 'Migrar operação de produção para o sistema', '9a2aaacd-6f11-4931-b41d-b7c103006919', '75534dce-9a1b-4e4a-8f0c-6e705ab25523', 'pendente', 'media',
   4, 0, '2026-04-10', false, '2026-04-06 12:10:04.656836+00', '3.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('eebab358-6fd6-4a46-a0d3-5caee46fdc46', '3.5 Pagamento de Faccionistas', 'Cadastrar e configurar controle de facções', '9a2aaacd-6f11-4931-b41d-b7c103006919', '75534dce-9a1b-4e4a-8f0c-6e705ab25523', 'pendente', 'media',
   2, 0, '2026-04-10', false, '2026-04-06 12:10:04.656836+00', '3.5', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('a66cd222-02e7-4257-9599-0b732d7e7b71', '3.6 Controle de Estoque', 'Configurar controle de estoque de insumos', '9a2aaacd-6f11-4931-b41d-b7c103006919', '75534dce-9a1b-4e4a-8f0c-6e705ab25523', 'pendente', 'media',
   3, 0, '2026-04-10', false, '2026-04-06 12:10:04.656836+00', '3.6', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('45fc9be2-5767-4852-a24c-e6a1d5682f28', '4.1 Fluxo de Caixa', 'Configurar relatório de fluxo de caixa', '9a2aaacd-6f11-4931-b41d-b7c103006919', 'caa4d299-0d37-452b-858f-e3923ba992df', 'pendente', 'media',
   2, 0, '2026-04-20', false, '2026-04-06 12:10:05.063674+00', '4.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('c1a34368-d89f-4ecf-9282-64916dbad5d3', '4.2 DRE', 'Configurar demonstrativo de resultados', '9a2aaacd-6f11-4931-b41d-b7c103006919', 'caa4d299-0d37-452b-858f-e3923ba992df', 'pendente', 'media',
   1, 0, '2026-04-20', false, '2026-04-06 12:10:05.063674+00', '4.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('a3b5d463-8cce-4eb0-b988-6d0858ccf8ad', '4.3 Relatórios BI', 'Configurar dashboards e relatórios de business intelligence', '9a2aaacd-6f11-4931-b41d-b7c103006919', 'caa4d299-0d37-452b-858f-e3923ba992df', 'pendente', 'media',
   1, 0, '2026-04-20', false, '2026-04-06 12:10:05.063674+00', '4.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('7f87e9d6-97e7-464b-b564-6e6de51bc7fb', '4.4 Finalização do Projeto', 'Encerramento formal do projeto de implantação', '9a2aaacd-6f11-4931-b41d-b7c103006919', 'caa4d299-0d37-452b-858f-e3923ba992df', 'pendente', 'media',
   0, 0, '2026-04-20', true, '2026-04-06 12:10:05.063674+00', '4.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('77ffdc77-1999-459a-bcd2-809423d15d5a', '2.1 Controle Financeiro', 'Configurar contas a pagar, receber, plano de contas', '74fbba58-ac87-4114-a216-e80f08557428', 'dd96c14a-2f06-4118-b0a7-3451614ccb7f', 'pendente', 'media',
   3, 0, '2026-03-20', false, '2026-04-06 12:10:48.558242+00', '2.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('4c38148b-4df2-4246-a284-0a77f8f07707', '2.2 Boletos', 'Configurar emissão e integração de boletos', '74fbba58-ac87-4114-a216-e80f08557428', 'dd96c14a-2f06-4118-b0a7-3451614ccb7f', 'pendente', 'media',
   2, 0, '2026-03-20', false, '2026-04-06 12:10:48.558242+00', '2.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('fd4299fb-bd3f-45b9-a43f-36c0ee1f018d', '3.1 Cadastros: Produção', 'Cadastrar matérias-primas, aviamentos, grades', '74fbba58-ac87-4114-a216-e80f08557428', 'b30b21b9-830b-4443-a1b2-e000a1a68662', 'pendente', 'media',
   4, 0, '2026-03-30', false, '2026-04-06 12:10:48.983092+00', '3.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('ac75f144-bb48-4887-838c-9dd6ea393d52', '3.2 Ficha Técnica e Custo', 'Criar fichas técnicas com custos de produção', '74fbba58-ac87-4114-a216-e80f08557428', 'b30b21b9-830b-4443-a1b2-e000a1a68662', 'pendente', 'media',
   4, 0, '2026-03-30', false, '2026-04-06 12:10:48.983092+00', '3.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('d14ccf8c-169e-43c3-80d4-450c662cdf15', '3.3 Ordem de Produção', 'Configurar fluxo de ordens de produção', '74fbba58-ac87-4114-a216-e80f08557428', 'b30b21b9-830b-4443-a1b2-e000a1a68662', 'pendente', 'media',
   4, 0, '2026-03-30', false, '2026-04-06 12:10:48.983092+00', '3.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('34ec0387-d62e-4a3c-901f-13de8dfd931c', '3.4 Virada de Sistema: Produção', 'Migrar operação de produção para o sistema', '74fbba58-ac87-4114-a216-e80f08557428', 'b30b21b9-830b-4443-a1b2-e000a1a68662', 'pendente', 'media',
   4, 0, '2026-03-30', false, '2026-04-06 12:10:48.983092+00', '3.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('af14b555-aa99-4ebf-bf5c-c0c9f6e79988', '3.5 Pagamento de Faccionistas', 'Cadastrar e configurar controle de facções', '74fbba58-ac87-4114-a216-e80f08557428', 'b30b21b9-830b-4443-a1b2-e000a1a68662', 'pendente', 'media',
   2, 0, '2026-03-30', false, '2026-04-06 12:10:48.983092+00', '3.5', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('7ab8f98d-a5b0-4050-92d7-65d52b0f64c9', '3.6 Controle de Estoque', 'Configurar controle de estoque de insumos', '74fbba58-ac87-4114-a216-e80f08557428', 'b30b21b9-830b-4443-a1b2-e000a1a68662', 'pendente', 'media',
   3, 0, '2026-03-30', false, '2026-04-06 12:10:48.983092+00', '3.6', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('5402c26c-44d2-4680-ada8-563a1b74e75e', '0.1 Primeiro Contato', 'Primeiro contato com o cliente', '74fbba58-ac87-4114-a216-e80f08557428', '5326af5e-8692-4413-b5a4-baec74ea7d2f', 'concluida', 'media',
   0, 0, '2026-02-28', true, '2026-04-06 12:10:47.517887+00', '0.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('344f1ac1-01be-4ef7-9d31-a0bbd038440d', '0.2 Formulário de boas-vindas', 'Envio e preenchimento do formulário de boas-vindas', '74fbba58-ac87-4114-a216-e80f08557428', '5326af5e-8692-4413-b5a4-baec74ea7d2f', 'concluida', 'media',
   0, 0, '2026-02-28', true, '2026-04-06 12:10:47.517887+00', '0.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('2defafe2-142a-4111-82f6-964184e3bea7', '0.3 Reunião de Alinhamento', 'Reunião inicial para alinhar expectativas e cronograma', '74fbba58-ac87-4114-a216-e80f08557428', '5326af5e-8692-4413-b5a4-baec74ea7d2f', 'concluida', 'media',
   0, 0, '2026-02-28', true, '2026-04-06 12:10:47.517887+00', '0.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('c2a1353f-9b39-4b99-8fd2-dd029853cda2', '0.4 Planilha Enviada', 'Envio da planilha modelo para preenchimento pelo cliente', '74fbba58-ac87-4114-a216-e80f08557428', '5326af5e-8692-4413-b5a4-baec74ea7d2f', 'concluida', 'media',
   0, 0, '2026-02-28', true, '2026-04-06 12:10:47.517887+00', '0.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('ac2d0c7f-8ce3-4795-b807-c80607cfbeee', '0.5 Planilha Devolvida', 'Recebimento da planilha preenchida pelo cliente', '74fbba58-ac87-4114-a216-e80f08557428', '5326af5e-8692-4413-b5a4-baec74ea7d2f', 'concluida', 'media',
   0, 0, '2026-02-28', true, '2026-04-06 12:10:47.517887+00', '0.5', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('c61a7d4b-45c6-49cf-a212-8abcc47ce83a', '0.6 Cronograma Pendente', 'Definição e validação do cronograma de implantação', '74fbba58-ac87-4114-a216-e80f08557428', '5326af5e-8692-4413-b5a4-baec74ea7d2f', 'concluida', 'media',
   0, 0, '2026-02-28', true, '2026-04-06 12:10:47.517887+00', '0.6', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('86191d49-ceea-4253-80c0-e3e00766673a', '1.6 Virada de Sistema: Vendas', 'Migrar operação de vendas para o novo sistema', '74fbba58-ac87-4114-a216-e80f08557428', '5669fd80-0808-4e9a-8eef-75651206f588', 'concluida', 'media',
   4, 8, '2026-03-10', false, '2026-04-06 12:10:48.015656+00', '1.6', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('650bbdd0-77ab-482e-b142-72d361e52953', '1.1 Instalação do Sistema', 'Instalar e configurar ambiente do cliente', '74fbba58-ac87-4114-a216-e80f08557428', '5669fd80-0808-4e9a-8eef-75651206f588', 'concluida', 'media',
   2, 2, '2026-03-10', false, '2026-04-06 12:10:48.015656+00', '1.1', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('7ebe1bd2-58b7-4e58-b1f4-62beff2069a5', '1.2 Configurações', 'Parametrizar regras comerciais, tabelas de preço', '74fbba58-ac87-4114-a216-e80f08557428', '5669fd80-0808-4e9a-8eef-75651206f588', 'concluida', 'media',
   2, 2, '2026-03-10', false, '2026-04-06 12:10:48.015656+00', '1.2', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('0d9e43d2-8741-4bec-8fce-4b302304f382', '1.3 Cadastros', 'Cadastrar clientes, produtos, condições de pagamento', '74fbba58-ac87-4114-a216-e80f08557428', '5669fd80-0808-4e9a-8eef-75651206f588', 'concluida', 'media',
   4, 2.5, '2026-03-10', false, '2026-04-06 12:10:48.015656+00', '1.3', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('1cb0f879-c181-48ba-8ebd-3fd3eaa02931', '1.4 Vendas', 'Configurar e treinar módulo de vendas', '74fbba58-ac87-4114-a216-e80f08557428', '5669fd80-0808-4e9a-8eef-75651206f588', 'concluida', 'media',
   4, 1.5, '2026-03-10', false, '2026-04-06 12:10:48.015656+00', '1.4', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('c0df55ad-9f44-4e0a-bcb2-9f40925d9c1e', '1.5 NF-e', 'Configurar emissão de NF-e, certificado digital', '74fbba58-ac87-4114-a216-e80f08557428', '5669fd80-0808-4e9a-8eef-75651206f588', 'concluida', 'media',
   4, 1, '2026-03-10', false, '2026-04-06 12:10:48.015656+00', '1.5', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('4f21d677-2931-4e59-a7d3-1bb3f8293361', '1.4 Vendas', 'Configurar e treinar módulo de vendas', '9a2aaacd-6f11-4931-b41d-b7c103006919', '6ee86de9-4b6a-4ca1-9e22-3463587efd41', 'concluida', 'media',
   4, 1, '2026-03-21', false, '2026-04-06 12:10:03.760304+00', '1.4', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('569bb0a3-e606-428f-b113-36398de1454a', '4.1 Fluxo de Caixa', 'Configurar relatório de fluxo de caixa', '74fbba58-ac87-4114-a216-e80f08557428', '826b43e6-93a5-4f0a-b897-346270e2195b', 'pendente', 'media',
   2, 0, '2026-04-09', false, '2026-04-06 12:10:49.598899+00', '4.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('2e5b94fa-6de6-4caf-93ab-abc8711d655d', '4.2 DRE', 'Configurar demonstrativo de resultados', '74fbba58-ac87-4114-a216-e80f08557428', '826b43e6-93a5-4f0a-b897-346270e2195b', 'pendente', 'media',
   1, 0, '2026-04-09', false, '2026-04-06 12:10:49.598899+00', '4.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('6c11ac8e-67d2-4242-a1b6-0693b091967a', '4.3 Relatórios BI', 'Configurar dashboards e relatórios de business intelligence', '74fbba58-ac87-4114-a216-e80f08557428', '826b43e6-93a5-4f0a-b897-346270e2195b', 'pendente', 'media',
   1, 0, '2026-04-09', false, '2026-04-06 12:10:49.598899+00', '4.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('8169b014-e813-4046-aa2e-0adaacbf2e47', '4.4 Finalização do Projeto', 'Encerramento formal do projeto de implantação', '74fbba58-ac87-4114-a216-e80f08557428', '826b43e6-93a5-4f0a-b897-346270e2195b', 'pendente', 'media',
   0, 0, '2026-04-09', true, '2026-04-06 12:10:49.598899+00', '4.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('83e415ec-87b7-4cb8-bb33-694d5a88485e', '2.1 Controle Financeiro', 'Configurar contas a pagar, receber, plano de contas', 'b63f3bf0-e2f1-4409-816a-98d43d435161', '329d89d3-69bc-42a2-b146-2e0e0ae9cac4', 'pendente', 'media',
   3, 0, '2026-03-11', false, '2026-04-06 12:11:26.45486+00', '2.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('922e2135-e52c-4ab8-a01b-17ce1e170969', '2.2 Boletos', 'Configurar emissão e integração de boletos', 'b63f3bf0-e2f1-4409-816a-98d43d435161', '329d89d3-69bc-42a2-b146-2e0e0ae9cac4', 'pendente', 'media',
   2, 0, '2026-03-11', false, '2026-04-06 12:11:26.45486+00', '2.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('66295f8c-bce4-4f0a-a7af-2268ddeb5472', '3.1 Cadastros: Produção', 'Cadastrar matérias-primas, aviamentos, grades', 'b63f3bf0-e2f1-4409-816a-98d43d435161', '89185410-ebdb-4647-b6d9-8e7fb76a6507', 'pendente', 'media',
   4, 0, '2026-03-21', false, '2026-04-06 12:11:26.817944+00', '3.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('874c1285-0cae-4191-bdaa-1797c4390e00', '3.2 Ficha Técnica e Custo', 'Criar fichas técnicas com custos de produção', 'b63f3bf0-e2f1-4409-816a-98d43d435161', '89185410-ebdb-4647-b6d9-8e7fb76a6507', 'pendente', 'media',
   4, 0, '2026-03-21', false, '2026-04-06 12:11:26.817944+00', '3.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('1f325fa0-9407-4e1d-84d6-33ee84ba92e1', '3.3 Ordem de Produção', 'Configurar fluxo de ordens de produção', 'b63f3bf0-e2f1-4409-816a-98d43d435161', '89185410-ebdb-4647-b6d9-8e7fb76a6507', 'pendente', 'media',
   4, 0, '2026-03-21', false, '2026-04-06 12:11:26.817944+00', '3.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('79f3046a-eb64-42f2-85ec-1e26967532a2', '3.4 Virada de Sistema: Produção', 'Migrar operação de produção para o sistema', 'b63f3bf0-e2f1-4409-816a-98d43d435161', '89185410-ebdb-4647-b6d9-8e7fb76a6507', 'pendente', 'media',
   4, 0, '2026-03-21', false, '2026-04-06 12:11:26.817944+00', '3.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('edd953b7-1d1f-422e-a39c-e6ac4fac0bd9', '3.5 Pagamento de Faccionistas', 'Cadastrar e configurar controle de facções', 'b63f3bf0-e2f1-4409-816a-98d43d435161', '89185410-ebdb-4647-b6d9-8e7fb76a6507', 'pendente', 'media',
   2, 0, '2026-03-21', false, '2026-04-06 12:11:26.817944+00', '3.5', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('5ea17f1b-e87a-441f-bf04-b5fc2b05a6aa', '3.6 Controle de Estoque', 'Configurar controle de estoque de insumos', 'b63f3bf0-e2f1-4409-816a-98d43d435161', '89185410-ebdb-4647-b6d9-8e7fb76a6507', 'pendente', 'media',
   3, 0, '2026-03-21', false, '2026-04-06 12:11:26.817944+00', '3.6', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('59c60dcc-3102-4bd2-a047-7ef669fad061', '4.1 Fluxo de Caixa', 'Configurar relatório de fluxo de caixa', 'b63f3bf0-e2f1-4409-816a-98d43d435161', 'd91c0d1f-1715-4ba5-84ee-e4b8e5831ef9', 'pendente', 'media',
   2, 0, '2026-03-31', false, '2026-04-06 12:11:27.184023+00', '4.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('0803721a-42c0-48f0-bf67-8089f1f0bd44', '4.2 DRE', 'Configurar demonstrativo de resultados', 'b63f3bf0-e2f1-4409-816a-98d43d435161', 'd91c0d1f-1715-4ba5-84ee-e4b8e5831ef9', 'pendente', 'media',
   1, 0, '2026-03-31', false, '2026-04-06 12:11:27.184023+00', '4.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('b2e839b0-e911-4a68-b752-3d42e9474bf4', '4.3 Relatórios BI', 'Configurar dashboards e relatórios de business intelligence', 'b63f3bf0-e2f1-4409-816a-98d43d435161', 'd91c0d1f-1715-4ba5-84ee-e4b8e5831ef9', 'pendente', 'media',
   1, 0, '2026-03-31', false, '2026-04-06 12:11:27.184023+00', '4.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('ab347ebe-8840-4f67-935c-61f43a7ec7b7', '4.4 Finalização do Projeto', 'Encerramento formal do projeto de implantação', 'b63f3bf0-e2f1-4409-816a-98d43d435161', 'd91c0d1f-1715-4ba5-84ee-e4b8e5831ef9', 'pendente', 'media',
   0, 0, '2026-03-31', true, '2026-04-06 12:11:27.184023+00', '4.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('340b3c94-1006-4ae8-9d29-4781142fb25f', '0.3 Reunião de Alinhamento', 'Reunião inicial para alinhar expectativas e cronograma', 'aa7deed2-435e-4f36-a85f-06e1023ba1de', 'ca2b5849-9ef5-44f1-8d7a-51aa13bc5c5b', 'pendente', 'media',
   0, 0, '2026-04-18', true, '2026-04-10 14:50:15.396324+00', '0.3', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('1276f927-9a3f-4edd-8fa8-d2c685a6c93d', '0.2 Formulário de boas-vindas', 'Envio e preenchimento do formulário de boas-vindas', 'b63f3bf0-e2f1-4409-816a-98d43d435161', '726bcc74-c5b0-4365-b5e2-bb1f2c61b40f', 'concluida', 'media',
   0, 0, '2026-02-19', true, '2026-04-06 12:11:25.642762+00', '0.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('546f63ea-a49f-4eff-adc7-0e0a9382700e', '0.3 Reunião de Alinhamento', 'Reunião inicial para alinhar expectativas e cronograma', 'b63f3bf0-e2f1-4409-816a-98d43d435161', '726bcc74-c5b0-4365-b5e2-bb1f2c61b40f', 'concluida', 'media',
   0, 0, '2026-02-19', true, '2026-04-06 12:11:25.642762+00', '0.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('d2d45073-01ad-4ee8-b95e-82dccdeb7800', '0.4 Planilha Enviada', 'Envio da planilha modelo para preenchimento pelo cliente', 'b63f3bf0-e2f1-4409-816a-98d43d435161', '726bcc74-c5b0-4365-b5e2-bb1f2c61b40f', 'concluida', 'media',
   0, 0, '2026-02-19', true, '2026-04-06 12:11:25.642762+00', '0.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('ca171353-c285-49c7-9ff0-0e394c9dfde8', '0.5 Planilha Devolvida', 'Recebimento da planilha preenchida pelo cliente', 'b63f3bf0-e2f1-4409-816a-98d43d435161', '726bcc74-c5b0-4365-b5e2-bb1f2c61b40f', 'concluida', 'media',
   0, 0, '2026-02-19', true, '2026-04-06 12:11:25.642762+00', '0.5', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('9deae621-40ad-42ab-81f2-94f4402fd27c', '0.6 Cronograma Pendente', 'Definição e validação do cronograma de implantação', 'b63f3bf0-e2f1-4409-816a-98d43d435161', '726bcc74-c5b0-4365-b5e2-bb1f2c61b40f', 'concluida', 'media',
   0, 0, '2026-02-19', true, '2026-04-06 12:11:25.642762+00', '0.6', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('ac29c5d6-bd1d-4503-8211-c6126efa3f9a', '0.1 Primeiro Contato', 'Primeiro contato com o cliente', 'eedf5d41-73cc-4283-9f51-02152efab15e', '496d6e96-3b16-4ba5-9f2b-0c10e3880a29', 'concluida', 'media',
   0, 0, '2026-02-18', true, '2026-04-06 12:12:00.805445+00', '0.1', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('30969eb6-4ad6-4a80-ae94-4fdf3d674491', '1.1 Instalação do Sistema', 'Instalar e configurar ambiente do cliente', 'b63f3bf0-e2f1-4409-816a-98d43d435161', 'a6be049c-17ea-4a5a-9bcb-8d625dd4a229', 'concluida', 'media',
   2, 2, '2026-03-01', false, '2026-04-06 12:11:26.042492+00', '1.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('e2162c89-4677-4d17-af1f-a18b2578d490', '1.2 Configurações', 'Parametrizar regras comerciais, tabelas de preço', 'b63f3bf0-e2f1-4409-816a-98d43d435161', 'a6be049c-17ea-4a5a-9bcb-8d625dd4a229', 'concluida', 'media',
   2, 4, '2026-03-01', false, '2026-04-06 12:11:26.042492+00', '1.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('1b5a6ef4-2616-477f-8a5c-43f5b805ad5e', '1.3 Cadastros', 'Cadastrar clientes, produtos, condições de pagamento', 'b63f3bf0-e2f1-4409-816a-98d43d435161', 'a6be049c-17ea-4a5a-9bcb-8d625dd4a229', 'concluida', 'media',
   4, 2.5, '2026-03-01', false, '2026-04-06 12:11:26.042492+00', '1.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('7503f5d2-3e47-4f8c-a866-ef352bf3a117', '1.4 Vendas', 'Configurar e treinar módulo de vendas', 'b63f3bf0-e2f1-4409-816a-98d43d435161', 'a6be049c-17ea-4a5a-9bcb-8d625dd4a229', 'concluida', 'media',
   4, 2, '2026-03-01', false, '2026-04-06 12:11:26.042492+00', '1.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('c86e60b7-68b4-4a10-a225-d3d449b44f9b', '1.5 NF-e', 'Configurar emissão de NF-e, certificado digital', 'b63f3bf0-e2f1-4409-816a-98d43d435161', 'a6be049c-17ea-4a5a-9bcb-8d625dd4a229', 'concluida', 'media',
   4, 10, '2026-03-01', false, '2026-04-06 12:11:26.042492+00', '1.5', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('ec0d273f-219b-4073-859b-c189229c1869', '1.6 Virada de Sistema: Vendas', 'Migrar operação de vendas para o novo sistema', 'b63f3bf0-e2f1-4409-816a-98d43d435161', 'a6be049c-17ea-4a5a-9bcb-8d625dd4a229', 'concluida', 'media',
   4, 3, '2026-03-01', false, '2026-04-06 12:11:26.042492+00', '1.6', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('809c0485-7b55-4d2d-a012-ecdd848ea7e1', '0.2 Formulário de boas-vindas', 'Envio e preenchimento do formulário de boas-vindas', 'eedf5d41-73cc-4283-9f51-02152efab15e', '496d6e96-3b16-4ba5-9f2b-0c10e3880a29', 'concluida', 'media',
   0, 0, '2026-02-18', true, '2026-04-06 12:12:00.805445+00', '0.2', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('4abf774c-3eba-46b6-903f-fe08ac03dd96', '0.3 Reunião de Alinhamento', 'Reunião inicial para alinhar expectativas e cronograma', 'eedf5d41-73cc-4283-9f51-02152efab15e', '496d6e96-3b16-4ba5-9f2b-0c10e3880a29', 'concluida', 'media',
   0, 0, '2026-02-18', true, '2026-04-06 12:12:00.805445+00', '0.3', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('d00af533-ca0b-418c-ba2e-24f54459235c', '0.4 Planilha Enviada', 'Envio da planilha modelo para preenchimento pelo cliente', 'eedf5d41-73cc-4283-9f51-02152efab15e', '496d6e96-3b16-4ba5-9f2b-0c10e3880a29', 'concluida', 'media',
   0, 0, '2026-02-18', true, '2026-04-06 12:12:00.805445+00', '0.4', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('623fa800-fc5f-444a-9409-49dec7ccdf10', '0.5 Planilha Devolvida', 'Recebimento da planilha preenchida pelo cliente', 'eedf5d41-73cc-4283-9f51-02152efab15e', '496d6e96-3b16-4ba5-9f2b-0c10e3880a29', 'concluida', 'media',
   0, 0, '2026-02-18', true, '2026-04-06 12:12:00.805445+00', '0.5', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('eec03abf-8b9e-4727-9bec-d8b8b96128c5', '0.4 Planilha Enviada', 'Envio da planilha modelo para preenchimento pelo cliente', 'aa7deed2-435e-4f36-a85f-06e1023ba1de', 'ca2b5849-9ef5-44f1-8d7a-51aa13bc5c5b', 'concluida', 'media',
   0, 0, '2026-04-18', true, '2026-04-10 14:50:15.396324+00', '0.4', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('5de3ef73-da8e-4d2c-92ba-5b1c701b3d78', '0.6 Cronograma Pendente', 'Definição e validação do cronograma de implantação', 'aa7deed2-435e-4f36-a85f-06e1023ba1de', 'ca2b5849-9ef5-44f1-8d7a-51aa13bc5c5b', 'pendente', 'media',
   0, 0, '2026-04-18', true, '2026-04-10 14:50:15.396324+00', '0.6', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('ee5eb36f-66fd-4dd8-ad5f-f14dd052a201', '3.2 Ficha Técnica e Custo', 'Criar fichas técnicas com custos de produção', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', '0dbde837-8d2e-4f90-88f8-320f52b6bd57', 'pendente', 'media',
   4, 0, '2026-05-19', false, '2026-04-10 14:51:49.486493+00', '3.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('15893fd2-5bae-4d2e-9fa9-62b19fd241ad', '3.3 Ordem de Produção', 'Configurar fluxo de ordens de produção', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', '0dbde837-8d2e-4f90-88f8-320f52b6bd57', 'pendente', 'media',
   4, 0, '2026-05-19', false, '2026-04-10 14:51:49.486493+00', '3.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('b1ff4e91-0375-4b88-a313-568f50159dbe', '3.4 Virada de Sistema: Produção', 'Migrar operação de produção para o sistema', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', '0dbde837-8d2e-4f90-88f8-320f52b6bd57', 'pendente', 'media',
   4, 0, '2026-05-19', false, '2026-04-10 14:51:49.486493+00', '3.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('499542ce-3110-4940-bac8-75e87627deeb', '3.5 Pagamento de Faccionistas', 'Cadastrar e configurar controle de facções', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', '0dbde837-8d2e-4f90-88f8-320f52b6bd57', 'pendente', 'media',
   2, 0, '2026-05-19', false, '2026-04-10 14:51:49.486493+00', '3.5', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('db6aa8ed-c72b-4eaa-863c-3f16516bf6c7', '3.6 Controle de Estoque', 'Configurar controle de estoque de insumos', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', '0dbde837-8d2e-4f90-88f8-320f52b6bd57', 'pendente', 'media',
   3, 0, '2026-05-19', false, '2026-04-10 14:51:49.486493+00', '3.6', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('4b3f08e8-a8d0-4f1a-8d2c-90954e6df723', '0.2 Formulário de boas-vindas', 'Envio e preenchimento do formulário de boas-vindas', 'aa7deed2-435e-4f36-a85f-06e1023ba1de', 'ca2b5849-9ef5-44f1-8d7a-51aa13bc5c5b', 'concluida', 'media',
   0, 0, '2026-04-18', true, '2026-04-10 14:50:15.396324+00', '0.2', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('86802a60-5ccd-462f-95de-e1d8f7665999', '1.1 Instalação do Sistema', 'Instalar e configurar ambiente do cliente', 'eedf5d41-73cc-4283-9f51-02152efab15e', 'ff6392a5-8f07-4092-9cb4-55546b99ec20', 'concluida', 'media',
   2, 2, '2026-02-28', false, '2026-04-06 12:12:01.246428+00', '1.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('75dbd1eb-6b3d-480f-8bf0-f5bf5b2aead1', '0.5 Planilha Devolvida', 'Recebimento da planilha preenchida pelo cliente', 'aa7deed2-435e-4f36-a85f-06e1023ba1de', 'ca2b5849-9ef5-44f1-8d7a-51aa13bc5c5b', 'concluida', 'media',
   0, 0, '2026-04-18', true, '2026-04-10 14:50:15.396324+00', '0.5', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('86e18ab1-de36-4957-8e07-d52f49194f01', '1.2 Configurações', 'Parametrizar regras comerciais, tabelas de preço', 'eedf5d41-73cc-4283-9f51-02152efab15e', 'ff6392a5-8f07-4092-9cb4-55546b99ec20', 'concluida', 'media',
   2, 2, '2026-02-28', false, '2026-04-06 12:12:01.246428+00', '1.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('49cc1bca-3805-4822-a0eb-77104aa88c43', '2.1 Controle Financeiro', 'Configurar contas a pagar, receber, plano de contas', 'eedf5d41-73cc-4283-9f51-02152efab15e', '89eede57-139b-40da-a676-a2cbc564649c', 'pendente', 'media',
   3, 0, '2026-03-10', false, '2026-04-06 12:12:01.689024+00', '2.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('69cfd1ab-4600-4524-abd8-125a06dfc2b0', '2.2 Boletos', 'Configurar emissão e integração de boletos', 'eedf5d41-73cc-4283-9f51-02152efab15e', '89eede57-139b-40da-a676-a2cbc564649c', 'pendente', 'media',
   2, 0, '2026-03-10', false, '2026-04-06 12:12:01.689024+00', '2.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('84a96019-0361-401d-8fda-759cb4a94d30', '1.3 Cadastros', 'Cadastrar clientes, produtos, condições de pagamento', 'eedf5d41-73cc-4283-9f51-02152efab15e', 'ff6392a5-8f07-4092-9cb4-55546b99ec20', 'concluida', 'media',
   4, 1, '2026-02-28', false, '2026-04-06 12:12:01.246428+00', '1.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('4cceb8a6-9f7c-4a16-9c66-1abb9acdac56', '1.4 Vendas', 'Configurar e treinar módulo de vendas', 'eedf5d41-73cc-4283-9f51-02152efab15e', 'ff6392a5-8f07-4092-9cb4-55546b99ec20', 'concluida', 'media',
   4, 2, '2026-02-28', false, '2026-04-06 12:12:01.246428+00', '1.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('ac96a139-eeab-41aa-807a-9e560709e683', '1.5 NF-e', 'Configurar emissão de NF-e, certificado digital', 'eedf5d41-73cc-4283-9f51-02152efab15e', 'ff6392a5-8f07-4092-9cb4-55546b99ec20', 'concluida', 'media',
   4, 1, '2026-02-28', false, '2026-04-06 12:12:01.246428+00', '1.5', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('3181ef44-b235-49c9-b2d6-ae19d696e84b', '3.1 Cadastros: Produção', 'Cadastrar matérias-primas, aviamentos, grades', 'eedf5d41-73cc-4283-9f51-02152efab15e', 'dfc6a37b-692b-4d31-9119-84d841a2888b', 'pendente', 'media',
   4, 0, '2026-03-20', false, '2026-04-06 12:12:02.136639+00', '3.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('6680e06c-2fce-4814-8fb5-ebb39d2c9e51', '3.2 Ficha Técnica e Custo', 'Criar fichas técnicas com custos de produção', 'eedf5d41-73cc-4283-9f51-02152efab15e', 'dfc6a37b-692b-4d31-9119-84d841a2888b', 'pendente', 'media',
   4, 0, '2026-03-20', false, '2026-04-06 12:12:02.136639+00', '3.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('fac989be-5be9-4bf2-add8-256831538064', '3.3 Ordem de Produção', 'Configurar fluxo de ordens de produção', 'eedf5d41-73cc-4283-9f51-02152efab15e', 'dfc6a37b-692b-4d31-9119-84d841a2888b', 'pendente', 'media',
   4, 0, '2026-03-20', false, '2026-04-06 12:12:02.136639+00', '3.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('0b383914-f292-47d3-a60e-89ade4a243d2', '3.4 Virada de Sistema: Produção', 'Migrar operação de produção para o sistema', 'eedf5d41-73cc-4283-9f51-02152efab15e', 'dfc6a37b-692b-4d31-9119-84d841a2888b', 'pendente', 'media',
   4, 0, '2026-03-20', false, '2026-04-06 12:12:02.136639+00', '3.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('9cb35136-d91d-4233-aee4-aa68b71d8660', '3.5 Pagamento de Faccionistas', 'Cadastrar e configurar controle de facções', 'eedf5d41-73cc-4283-9f51-02152efab15e', 'dfc6a37b-692b-4d31-9119-84d841a2888b', 'pendente', 'media',
   2, 0, '2026-03-20', false, '2026-04-06 12:12:02.136639+00', '3.5', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('9b14299a-57b0-4d7c-b143-f4247d1cbeb2', '3.6 Controle de Estoque', 'Configurar controle de estoque de insumos', 'eedf5d41-73cc-4283-9f51-02152efab15e', 'dfc6a37b-692b-4d31-9119-84d841a2888b', 'pendente', 'media',
   3, 0, '2026-03-20', false, '2026-04-06 12:12:02.136639+00', '3.6', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('bbf13134-2920-4dc4-983a-947d00880c27', '1.6 Virada de Sistema: Vendas', 'Migrar operação de vendas para o novo sistema', 'eedf5d41-73cc-4283-9f51-02152efab15e', 'ff6392a5-8f07-4092-9cb4-55546b99ec20', 'concluida', 'media',
   4, 5, '2026-02-28', false, '2026-04-06 12:12:01.246428+00', '1.6', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('028f5369-5fda-451d-8d32-8a83734e157a', '4.1 Fluxo de Caixa', 'Configurar relatório de fluxo de caixa', 'eedf5d41-73cc-4283-9f51-02152efab15e', '733c7609-85ef-4d60-a6f8-cbebb8f39ecd', 'pendente', 'media',
   2, 0, '2026-03-30', false, '2026-04-06 12:12:02.556321+00', '4.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('515f436c-f412-4b9c-8f88-6e58bf4daadf', '4.2 DRE', 'Configurar demonstrativo de resultados', 'eedf5d41-73cc-4283-9f51-02152efab15e', '733c7609-85ef-4d60-a6f8-cbebb8f39ecd', 'pendente', 'media',
   1, 0, '2026-03-30', false, '2026-04-06 12:12:02.556321+00', '4.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('a06b5023-ae49-48dd-a97f-37444342de84', '4.3 Relatórios BI', 'Configurar dashboards e relatórios de business intelligence', 'eedf5d41-73cc-4283-9f51-02152efab15e', '733c7609-85ef-4d60-a6f8-cbebb8f39ecd', 'pendente', 'media',
   1, 0, '2026-03-30', false, '2026-04-06 12:12:02.556321+00', '4.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('0bf9c395-f77b-43bb-be0b-fd2c775ef9cc', '4.4 Finalização do Projeto', 'Encerramento formal do projeto de implantação', 'eedf5d41-73cc-4283-9f51-02152efab15e', '733c7609-85ef-4d60-a6f8-cbebb8f39ecd', 'pendente', 'media',
   0, 0, '2026-03-30', true, '2026-04-06 12:12:02.556321+00', '4.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('7b687ba9-6627-4bd3-8414-7000009c304a', '0.1 Primeiro Contato', 'Primeiro contato com o cliente', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', '06b563ce-b05a-4cb7-b1df-4f07f31d922d', 'concluida', 'media',
   0, 0, '2026-04-10', true, '2026-04-06 11:59:45.324295+00', '0.1', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('6ba702bb-233a-40c8-95a7-9809cd761632', '0.1 Primeiro Contato', 'Primeiro contato com o cliente', '60476651-5c1f-4025-9539-16f9385fd826', '0f79a2b0-072c-4675-af8d-781d550861aa', 'concluida', 'media',
   0, 0, '2026-04-10', true, '2026-04-06 12:00:39.663657+00', '0.1', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('8b4896d9-66a9-4698-b53c-59663273cf3d', '0.2 Formulário de boas-vindas', 'Envio e preenchimento do formulário de boas-vindas', '60476651-5c1f-4025-9539-16f9385fd826', '0f79a2b0-072c-4675-af8d-781d550861aa', 'concluida', 'media',
   0, 0, '2026-04-10', true, '2026-04-06 12:00:39.663657+00', '0.2', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('6b2795b7-9b18-4515-b335-43ddc78a5624', '0.1 Primeiro Contato', 'Primeiro contato com o cliente', '4e36cf11-9121-4441-adcb-73aa56992196', 'cbe1da95-3f02-4185-83f5-e9e931db5c43', 'concluida', 'media',
   0, 0, '2026-04-04', true, '2026-04-06 12:05:25.505052+00', '0.1', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('12a8f808-da65-4421-8b83-667d754a5805', '0.1 Primeiro Contato', 'Primeiro contato com o cliente', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', 'a30f9538-e988-4613-b77e-378d665e8a97', 'concluida', 'media',
   0, 0, '2026-04-03', true, '2026-04-06 12:06:01.820523+00', '0.1', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('8944c5f5-1539-412c-b2f1-a358a0c43782', '0.1 Primeiro Contato', 'Primeiro contato com o cliente', 'a0806098-50e2-4cc8-a976-591117f36aa7', 'a11b7a30-5dd9-4500-bac3-e9d1325a73b1', 'concluida', 'media',
   0, 0, '2026-04-03', true, '2026-04-06 12:06:46.083688+00', '0.1', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('7ed6beba-ed21-48e8-b7d5-e21882688a4d', '0.2 Formulário de boas-vindas', 'Envio e preenchimento do formulário de boas-vindas', 'a0806098-50e2-4cc8-a976-591117f36aa7', 'a11b7a30-5dd9-4500-bac3-e9d1325a73b1', 'concluida', 'media',
   0, 0, '2026-04-03', true, '2026-04-06 12:06:46.083688+00', '0.2', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('dc6b6ba0-6d00-4848-811c-c4c02facdada', '0.1 Primeiro Contato', 'Primeiro contato com o cliente', 'f51a9f52-fbe5-4936-945a-8ee79d163730', '6bd163f1-ff6f-4dab-add0-865167747af9', 'concluida', 'media',
   0, 0, '2026-03-21', true, '2026-04-06 12:08:32.430113+00', '0.1', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('54a4fc66-6106-4fca-990f-dba29b13e442', '0.1 Primeiro Contato', 'Primeiro contato com o cliente', 'be964773-2599-4300-86c1-5d7dae304952', 'ae200fd7-9af6-4dd1-9a76-03232a62b3bc', 'concluida', 'media',
   0, 0, '2026-03-20', true, '2026-04-06 12:09:22.402256+00', '0.1', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('847be6a4-0e7b-4443-b6c0-7cf88d4a4b36', '0.2 Formulário de boas-vindas', 'Envio e preenchimento do formulário de boas-vindas', '9a2aaacd-6f11-4931-b41d-b7c103006919', 'b92dfd36-95cb-4091-9c98-6321800c7590', 'concluida', 'media',
   0, 0, '2026-03-11', true, '2026-04-06 12:10:03.211774+00', '0.2', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('b8ea0090-7d16-4fc1-a02a-ca6d406dbb9b', '1.3 Cadastros', 'Cadastrar clientes, produtos, condições de pagamento', '9a2aaacd-6f11-4931-b41d-b7c103006919', '6ee86de9-4b6a-4ca1-9e22-3463587efd41', 'concluida', 'media',
   4, 1.5, '2026-03-21', false, '2026-04-06 12:10:03.760304+00', '1.3', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('b3336bba-d158-4091-85ca-bd0ed0ab3ac3', '1.1 Instalação do Sistema', 'Instalar e configurar ambiente do cliente', 'aa7deed2-435e-4f36-a85f-06e1023ba1de', '35b056f4-6842-489f-bef7-abcad0829da3', 'pendente', 'media',
   2, 0, '2026-04-28', false, '2026-04-10 14:50:15.873402+00', '1.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('65c93cc0-158d-4d22-a7c4-20a234cb0b2d', '1.2 Configurações', 'Parametrizar regras comerciais, tabelas de preço', 'aa7deed2-435e-4f36-a85f-06e1023ba1de', '35b056f4-6842-489f-bef7-abcad0829da3', 'pendente', 'media',
   2, 0, '2026-04-28', false, '2026-04-10 14:50:15.873402+00', '1.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('0a24544c-237c-4bd8-99e6-3a21840c7b63', '1.3 Cadastros', 'Cadastrar clientes, produtos, condições de pagamento', 'aa7deed2-435e-4f36-a85f-06e1023ba1de', '35b056f4-6842-489f-bef7-abcad0829da3', 'pendente', 'media',
   3, 0, '2026-04-28', false, '2026-04-10 14:50:15.873402+00', '1.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('a603e0c7-0d48-49a5-9676-3dbd0a77470c', '1.4 Vendas', 'Configurar e treinar módulo de vendas', 'aa7deed2-435e-4f36-a85f-06e1023ba1de', '35b056f4-6842-489f-bef7-abcad0829da3', 'pendente', 'media',
   3, 0, '2026-04-28', false, '2026-04-10 14:50:15.873402+00', '1.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('8f8b0e85-6336-48d7-8684-fa8f39110440', '1.5 NF-e', 'Configurar emissão de NF-e, certificado digital', 'aa7deed2-435e-4f36-a85f-06e1023ba1de', '35b056f4-6842-489f-bef7-abcad0829da3', 'pendente', 'media',
   2, 0, '2026-04-28', false, '2026-04-10 14:50:15.873402+00', '1.5', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('1efcc5d3-4b33-4b0b-a351-9deac5fcea71', '1.6 Virada de Sistema: Vendas', 'Migrar operação de vendas para o novo sistema', 'aa7deed2-435e-4f36-a85f-06e1023ba1de', '35b056f4-6842-489f-bef7-abcad0829da3', 'pendente', 'media',
   4, 0, '2026-04-28', false, '2026-04-10 14:50:15.873402+00', '1.6', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('a233b3d7-53e7-449e-8f20-9e4095413636', '4.1 Fluxo de Caixa', 'Configurar relatório de fluxo de caixa', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', '57474492-0439-4bc7-aace-d781c6745ae0', 'pendente', 'media',
   2, 0, '2026-05-29', false, '2026-04-10 14:51:49.848602+00', '4.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('ffe57d5e-b553-4150-a93a-5c39b6d1ecd5', '4.2 DRE', 'Configurar demonstrativo de resultados', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', '57474492-0439-4bc7-aace-d781c6745ae0', 'pendente', 'media',
   1, 0, '2026-05-29', false, '2026-04-10 14:51:49.848602+00', '4.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('d1a854b6-eb83-4bc0-9f53-0525a3d9f73f', '4.3 Relatórios BI', 'Configurar dashboards e relatórios de business intelligence', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', '57474492-0439-4bc7-aace-d781c6745ae0', 'pendente', 'media',
   1, 0, '2026-05-29', false, '2026-04-10 14:51:49.848602+00', '4.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('a36ae632-2d02-40f1-b101-40b7fd052c27', '4.4 Finalização do Projeto', 'Encerramento formal do projeto de implantação', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', '57474492-0439-4bc7-aace-d781c6745ae0', 'pendente', 'media',
   0, 0, '2026-05-29', true, '2026-04-10 14:51:49.848602+00', '4.4', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('0fd38a4b-6412-4f93-a43e-1ba5f7c167be', '2.1 Cadastros: Produção', 'Cadastrar matérias-primas, aviamentos, grades', 'aa7deed2-435e-4f36-a85f-06e1023ba1de', '3d0eca6f-2584-4ed2-a115-39c238ae47a6', 'pendente', 'media',
   3, 0, '2026-05-08', false, '2026-04-10 14:50:16.299526+00', '2.1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('52bc1b4b-39ad-4d7b-85df-f9c89eea7df1', '2.2 Ordem de Produção', 'Configurar fluxo de ordens de produção', 'aa7deed2-435e-4f36-a85f-06e1023ba1de', '3d0eca6f-2584-4ed2-a115-39c238ae47a6', 'pendente', 'media',
   3, 0, '2026-05-08', false, '2026-04-10 14:50:16.299526+00', '2.2', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('acf47147-d78c-4b72-a9f2-66453d4814a9', '2.3 Virada de Sistema: Produção', 'Migrar operação de produção para o sistema', 'aa7deed2-435e-4f36-a85f-06e1023ba1de', '3d0eca6f-2584-4ed2-a115-39c238ae47a6', 'pendente', 'media',
   4, 0, '2026-05-08', false, '2026-04-10 14:50:16.299526+00', '2.3', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('ce9b7160-4d2c-4a3c-b3eb-6fff9447decf', '0.3 Reunião de Alinhamento', 'Reunião inicial para alinhar expectativas e cronograma', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', '06b563ce-b05a-4cb7-b1df-4f07f31d922d', 'concluida', 'media',
   0, 0, '2026-04-10', true, '2026-04-06 11:59:45.324295+00', '0.3', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, title, description, project_id, phase_id, status, priority,
   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)
VALUES
  ('8c636ace-129c-451d-bf99-d60b7eb8e3cd', '1.3 Cadastros', 'Cadastrar clientes, produtos, condições de pagamento', '66792e18-6327-421f-a82e-ebb6803ca1b0', 'e2fa344b-ac76-4933-bf42-3017647014a3', 'concluida', 'media',
   4, 3, '2026-04-01', false, '2026-04-06 12:07:55.303534+00', '1.3', 6)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 8. EVENTS (24 eventos)
-- ============================================================
INSERT INTO public.events
  (id, title, description, start_time, end_time, status, project_id, task_id, meeting_link, recording_link, created_at)
VALUES
  ('d8bf6874-b68b-48c2-bc78-682ac13b5e13', '1.2 Configurações', 'Parametrizar regras comerciais, tabelas de preço', '2026-04-10 17:15:00+00', '2026-04-10 18:45:00+00', 'agendado', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', '023686c1-ffd3-4748-ba70-4314190278a1', 'meet.google.com/yed-afvm-ryg', NULL, '2026-04-07 20:24:19.156864+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.events
  (id, title, description, start_time, end_time, status, project_id, task_id, meeting_link, recording_link, created_at)
VALUES
  ('e87513d4-df5f-47c9-b3cb-5a9ce5044e57', '1.3 Cadastros', 'Cadastrar clientes, produtos, condições de pagamento', '2026-04-13 19:00:00+00', '2026-04-13 20:30:00+00', 'agendado', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', '101caab5-2572-4981-8b65-33546bc77176', 'meet.google.com/omb-cuuw-sjn', NULL, '2026-04-07 20:24:57.906225+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.events
  (id, title, description, start_time, end_time, status, project_id, task_id, meeting_link, recording_link, created_at)
VALUES
  ('0231a76d-b252-4d7f-814a-8bce3d339c28', '1.4 Vendas', 'Configurar e treinar módulo de vendas', '2026-04-15 19:00:00+00', '2026-04-15 20:30:00+00', 'agendado', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', 'e22f2796-3901-4f70-bd1f-89d34befd5de', 'meet.google.com/qag-vgyx-pui', NULL, '2026-04-07 20:25:24.485027+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.events
  (id, title, description, start_time, end_time, status, project_id, task_id, meeting_link, recording_link, created_at)
VALUES
  ('190430e6-fd13-4b43-9658-1fa84b720116', '1.5 NF-e', 'Configurar emissão de NF-e, certificado digital', '2026-04-22 19:00:00+00', '2026-04-22 20:30:00+00', 'agendado', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', 'b283e65b-9288-4376-b0ad-e2db9137ebcc', 'meet.google.com/gio-hdrq-vzg', NULL, '2026-04-07 20:25:57.653247+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.events
  (id, title, description, start_time, end_time, status, project_id, task_id, meeting_link, recording_link, created_at)
VALUES
  ('9da2a53e-fa39-4c0d-b28a-75cbd17f4d95', '1.6 Virada de Sistema: Vendas', 'Migrar operação de vendas para o novo sistema', '2026-04-23 12:00:00+00', '2026-04-23 15:00:00+00', 'agendado', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', 'fa220fe3-0fcb-4cef-b68c-881dc9f770ef', 'meet.google.com/kai-infq-krr', NULL, '2026-04-07 20:26:18.519301+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.events
  (id, title, description, start_time, end_time, status, project_id, task_id, meeting_link, recording_link, created_at)
VALUES
  ('eb8c8180-a106-44ad-b7a6-dbd0fbb9a66b', '1.7 AzVendas', 'Configurar módulo AzVendas', '2026-04-27 19:00:00+00', '2026-04-27 20:30:00+00', 'agendado', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', 'cd24ef9f-eeed-4f95-82fb-2831e20e8501', 'meet.google.com/sbp-egjt-vip', NULL, '2026-04-07 20:26:42.547391+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.events
  (id, title, description, start_time, end_time, status, project_id, task_id, meeting_link, recording_link, created_at)
VALUES
  ('0c574ee4-7304-419f-a2a6-9e69e9b4bfa9', '1.8 Integração E-commerce', 'Integrar sistema com loja virtual', '2026-04-30 19:00:00+00', '2026-04-30 20:30:00+00', 'agendado', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', '4795cd36-0cad-4d4c-8bd4-04526c74e8c8', 'meet.google.com/nmv-evwh-spe', NULL, '2026-04-07 20:27:15.742316+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.events
  (id, title, description, start_time, end_time, status, project_id, task_id, meeting_link, recording_link, created_at)
VALUES
  ('44bffad1-bafe-45d9-b3af-b06f77473ceb', '1.2 Configurações', 'Parametrizar regras comerciais, tabelas de preço', '2026-04-13 17:15:00+00', '2026-04-13 18:45:00+00', 'agendado', '04400921-5e52-4bad-bc05-7bef132b8894', 'b0d924b8-6892-43c9-9f10-1c1d23625be6', NULL, NULL, '2026-04-07 21:02:12.263756+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.events
  (id, title, description, start_time, end_time, status, project_id, task_id, meeting_link, recording_link, created_at)
VALUES
  ('90cf6d75-67bd-4998-9bc2-d86188f50d1c', '1.3 Cadastros', 'Cadastrar clientes, produtos, condições de pagamento', '2026-04-13 12:00:00+00', '2026-04-13 13:30:00+00', 'agendado', '04400921-5e52-4bad-bc05-7bef132b8894', 'd8994250-25bb-4245-8544-b6ff879a1ec8', NULL, NULL, '2026-04-07 21:02:24.066014+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.events
  (id, title, description, start_time, end_time, status, project_id, task_id, meeting_link, recording_link, created_at)
VALUES
  ('5491e851-f95d-4569-a1bd-cc164044acd1', '1.4 Vendas', 'Configurar e treinar módulo de vendas', '2026-04-22 12:00:00+00', '2026-04-22 13:30:00+00', 'agendado', '04400921-5e52-4bad-bc05-7bef132b8894', 'bb78a806-66f1-4088-acaa-63611b2098e3', NULL, NULL, '2026-04-07 21:02:39.11726+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.events
  (id, title, description, start_time, end_time, status, project_id, task_id, meeting_link, recording_link, created_at)
VALUES
  ('01b933fd-dc5d-4f6a-93b0-c5405d5318c8', '1.5 NF-e', 'Configurar emissão de NF-e, certificado digital', '2026-04-24 12:00:00+00', '2026-04-24 13:30:00+00', 'agendado', '04400921-5e52-4bad-bc05-7bef132b8894', 'db617998-e825-4655-9ce2-65ff746d9e7d', NULL, NULL, '2026-04-07 21:02:48.961157+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.events
  (id, title, description, start_time, end_time, status, project_id, task_id, meeting_link, recording_link, created_at)
VALUES
  ('b6b9c0e0-04e2-4bb1-9fd5-cb909d669c7c', '1.6 Virada de Sistema: Vendas', 'Migrar operação de vendas para o novo sistema', '2026-04-27 12:00:00+00', '2026-04-27 15:00:00+00', 'agendado', '04400921-5e52-4bad-bc05-7bef132b8894', '72895002-945f-4e5f-90ce-5112d382b5c4', NULL, NULL, '2026-04-07 21:02:59.191042+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.events
  (id, title, description, start_time, end_time, status, project_id, task_id, meeting_link, recording_link, created_at)
VALUES
  ('bd754b8f-657f-47ce-84a4-610983fc6738', '1.1 Instalação do Sistema', 'Instalar e configurar ambiente do cliente', '2026-04-10 19:00:00+00', '2026-04-10 20:30:00+00', 'agendado', '4e36cf11-9121-4441-adcb-73aa56992196', 'ba82323e-1068-4d8c-8dd1-81392adfb27a', 'meet.google.com/zqn-gicb-ihv', NULL, '2026-04-09 20:33:27.528324+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.events
  (id, title, description, start_time, end_time, status, project_id, task_id, meeting_link, recording_link, created_at)
VALUES
  ('88b7ea72-9da6-4a9c-870e-12ef80fc8f97', '1.2 Configurações', 'Parametrizar regras comerciais, tabelas de preço', '2026-04-14 17:15:00+00', '2026-04-14 18:45:00+00', 'agendado', '4e36cf11-9121-4441-adcb-73aa56992196', '3b0fcaf5-f9c4-45b1-bac0-e8047772b106', 'meet.google.com/xmo-ukrh-yzy', NULL, '2026-04-09 20:34:21.508448+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.events
  (id, title, description, start_time, end_time, status, project_id, task_id, meeting_link, recording_link, created_at)
VALUES
  ('6fc1421e-16ca-4afc-86f6-a00606246236', '1.3 Cadastros', 'Cadastrar clientes, produtos, condições de pagamento', '2026-04-16 17:15:00+00', '2026-04-16 18:45:00+00', 'agendado', '4e36cf11-9121-4441-adcb-73aa56992196', '20690077-6205-4f9c-a763-c136b94502e1', 'meet.google.com/maw-kstf-xak', NULL, '2026-04-09 20:34:54.241898+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.events
  (id, title, description, start_time, end_time, status, project_id, task_id, meeting_link, recording_link, created_at)
VALUES
  ('436fee14-c830-4b76-b732-c35c8af27fb4', '1.4 Vendas', 'Configurar e treinar módulo de vendas', '2026-04-22 17:15:00+00', '2026-04-22 18:45:00+00', 'agendado', '4e36cf11-9121-4441-adcb-73aa56992196', '7a2bc3b6-9087-4b11-b20a-e4465f60b33a', 'meet.google.com/csf-urmf-pgd', NULL, '2026-04-09 20:35:39.760129+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.events
  (id, title, description, start_time, end_time, status, project_id, task_id, meeting_link, recording_link, created_at)
VALUES
  ('711f0d26-0752-4268-bbfa-990b38d392b4', '1.5 NF-e', 'Configurar emissão de NF-e, certificado digital', '2026-04-24 17:15:00+00', '2026-04-24 18:45:00+00', 'agendado', '4e36cf11-9121-4441-adcb-73aa56992196', '82de0e84-ca09-4b4e-b8b6-7f68f05f9be4', 'meet.google.com/owz-ptfj-jry', NULL, '2026-04-09 20:36:13.838132+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.events
  (id, title, description, start_time, end_time, status, project_id, task_id, meeting_link, recording_link, created_at)
VALUES
  ('043428ac-0cdf-4245-96b4-4ddc1af7baa9', '1.6 Virada de Sistema: Vendas', 'Migrar operação de vendas para o novo sistema', '2026-04-28 12:00:00+00', '2026-04-28 15:00:00+00', 'agendado', '4e36cf11-9121-4441-adcb-73aa56992196', '8bad043a-67d1-490d-babc-0d60da7afaad', 'meet.google.com/tnz-bsyw-hqj', NULL, '2026-04-09 20:36:34.597312+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.events
  (id, title, description, start_time, end_time, status, project_id, task_id, meeting_link, recording_link, created_at)
VALUES
  ('0c933b5e-de74-4ed0-a343-48ecdc511866', '1.1 Instalação do Sistema', 'Instalar e configurar ambiente do cliente', '2026-04-09 13:45:00+00', '2026-04-09 15:15:00+00', 'realizado', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', '07321770-8bbf-4839-92cb-8afaca2a5bcd', 'meet.google.com/sai-vxgj-mwv', NULL, '2026-04-07 20:23:52.115589+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.events
  (id, title, description, start_time, end_time, status, project_id, task_id, meeting_link, recording_link, created_at)
VALUES
  ('98f3a177-be71-48c8-9e4e-025314c26622', '1.3 Cadastros', 'Cadastrar clientes, produtos, condições de pagamento', '2026-04-07 12:00:00+00', '2026-04-07 15:00:00+00', 'realizado', '66792e18-6327-421f-a82e-ebb6803ca1b0', '8c636ace-129c-451d-bf99-d60b7eb8e3cd', 'https://meet.google.com/aeu-comn-iuj', NULL, '2026-04-07 12:04:55.816695+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.events
  (id, title, description, start_time, end_time, status, project_id, task_id, meeting_link, recording_link, created_at)
VALUES
  ('cf389eb8-9b6a-4d1c-8ece-155464107574', '1.5 NF-e', 'Configurar emissão de NF-e, certificado digital', '2026-04-08 17:15:00+00', '2026-04-08 18:45:00+00', 'cancelado', '9a2aaacd-6f11-4931-b41d-b7c103006919', '1e023161-339e-46d0-9a4f-e2d94505c563', 'meet.google.com/aim-gqeg-kcv', NULL, '2026-04-06 20:31:34.331481+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.events
  (id, title, description, start_time, end_time, status, project_id, task_id, meeting_link, recording_link, created_at)
VALUES
  ('370da0ab-563e-43ee-a3e0-969c2bf5a2ef', '1.1 Instalação do Sistema', 'Instalar e configurar ambiente do cliente', '2026-04-10 13:45:00+00', '2026-04-10 15:15:00+00', 'realizado', '04400921-5e52-4bad-bc05-7bef132b8894', '4a4dfe90-408d-412f-b1d5-48465aa7788a', NULL, NULL, '2026-04-07 21:01:55.827694+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.events
  (id, title, description, start_time, end_time, status, project_id, task_id, meeting_link, recording_link, created_at)
VALUES
  ('d95736aa-97d3-474f-85fb-37e3158a989d', '1.5 NF-e', 'Configurar emissão de NF-e, certificado digital', '2026-04-13 17:30:00+00', '2026-04-13 20:30:00+00', 'agendado', '66792e18-6327-421f-a82e-ebb6803ca1b0', '334febc8-736e-44cd-97ab-a6328d28cb1e', NULL, NULL, '2026-04-10 15:33:24.726307+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.events
  (id, title, description, start_time, end_time, status, project_id, task_id, meeting_link, recording_link, created_at)
VALUES
  ('44412344-91f8-4a1e-92cc-3c6e8ea3033d', '1.6 Virada de Sistema: Vendas', 'Migrar operação de vendas para o novo sistema', '2026-04-15 12:00:00+00', '2026-04-15 15:00:00+00', 'agendado', '66792e18-6327-421f-a82e-ebb6803ca1b0', 'e0fca211-dd96-469b-88d3-910ac2705bfc', NULL, NULL, '2026-04-10 15:33:36.192303+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 9. TIME LOGS (41 registros)
-- ============================================================
INSERT INTO public.time_logs
  (id, task_id, user_id, hours, log_type, notes, execution_date, is_locked)
VALUES
  ('83e6f3c9-83d9-4708-b15f-b2af9daf536a', '3fe0ef02-54e6-46ef-9b81-970e051a940e', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), 3, 'executado', '📌 KALHANDRA UNIFORMES – INSTALAÇÃO DO SISTEMA | 📅 31/03/2026

🧾 Resumo
Realizada a instalação do sistema Azoup nas máquinas da empresa, incluindo configuração inicial, instalação do certificado digital e preparação dos ambientes para uso.

⚠ Motivo / Contexto
Primeira etapa prática da implantação (Fase 01 – Vendas), com objetivo de preparar as máquinas e garantir que o sistema esteja pronto para os treinamentos.

📅 Alinhamento Realizado
• Confirmação prévia da instalação às 14h30

• Coleta das informações necessárias:

* E-mail para envio de NF-e
* Certificado digital A1
* Identificação das máquinas emissoras de NF-e

• Instalação iniciada às 14h31

• Instalações realizadas:

* Máquina da Alexandra (com emissão de NF-e)
* Máquina da Jaqueline (com emissão de NF-e)
* Máquina da Gisele
* Máquina da equipe comercial (Rayla e demais)

• Configuração do certificado digital realizada com sucesso

• Acesso remoto realizado via TeamViewer conforme padrão

• Validação final com cliente durante o processo

💰 Gestão de Horas
• Início: 14h31
• Término: 17h30

• Tempo total aproximado: 3h00 de implantação

👤 Responsáveis
• Anderson – Analista de Implantação
• Vinícius – Analista de Implantação
• Alexandra Moreira – Cliente
• Equipe Kalhandra (Jaqueline, Gisele, Rayla e demais)

🚀 Próximos Passos
• Continuidade para etapa de configurações do sistema
• Início dos treinamentos conforme cronograma
• Validação do funcionamento em todas as máquinas instaladas', '2026-03-31', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.time_logs
  (id, task_id, user_id, hours, log_type, notes, execution_date, is_locked)
VALUES
  ('3612f94e-f227-4ebb-b97e-96c3dbec7b7d', '25653c6c-5bb6-4252-959e-766d359588dc', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), 2, 'executado', '📌 KALHANDRA UNIFORMES – CONFIGURAÇÕES DO SISTEMA | 📅 02/04/2026

🧾 Resumo
Realizada a etapa de configurações iniciais do sistema Azoup, incluindo parâmetros fiscais, dados da empresa, logotipo e criação de usuários de acesso.

⚠ Motivo / Contexto
Segunda etapa da Fase 01 (Vendas), com objetivo de preparar o sistema para uso prático nos treinamentos.

📅 Alinhamento Realizado
• Início das configurações às 14h36

• Confirmado que a empresa realiza emissão de NF-e (não utiliza NFC-e)

• Solicitação e envio da logo da empresa para personalização de documentos

• Configuração realizada em máquina emissora de NF-e (prioridade)

• Coleta e validação de dados:

* Endereço (número do prédio)
* E-mail do contador

• Parte das configurações realizadas de forma remota, sem necessidade contínua de acesso via TeamViewer

• Criação dos usuários no sistema conforme estrutura informada:

* Administrativo / Gerencial
* Financeiro
* Comercial / Vendas
* Produção

• Acessos enviados ao cliente para utilização inicial

• Orientado que a troca de senhas será realizada em treinamento posterior

💰 Gestão de Horas
• Início: 14h36
• Término: 16h19

• Tempo total aproximado: 2h de implantação

👤 Responsáveis
• Anderson – Analista de Implantação
• Vinícius – Analista de Implantação
• Alexandra Moreira – Cliente
• Equipe Kalhandra (Jaqueline, Rayla e demais)

🚀 Próximos Passos
• Início dos treinamentos de cadastros (Fase 01 – Vendas)
• Orientação sobre uso dos acessos criados
• Ajustes finos conforme necessidade durante os treinamentos', '2026-04-02', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.time_logs
  (id, task_id, user_id, hours, log_type, notes, execution_date, is_locked)
VALUES
  ('4cc2004b-9f7a-4f71-b6a3-84f9a9248858', '15be6081-4d68-464a-844a-6866b014e531', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), 1.5, 'executado', '', '2026-03-17', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.time_logs
  (id, task_id, user_id, hours, log_type, notes, execution_date, is_locked)
VALUES
  ('4a4f81e6-b363-4274-a4fa-f950ae4cba86', '000aeb62-ae5d-4c27-9b81-1917cbb52a36', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), 1, 'executado', '', '2026-03-18', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.time_logs
  (id, task_id, user_id, hours, log_type, notes, execution_date, is_locked)
VALUES
  ('7bc92705-7ac5-43c8-8a04-cf686c0b15b2', 'c1811820-c514-4625-8c7d-4e2fd8610f66', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), 1.5, 'executado', '', '2026-03-20', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.time_logs
  (id, task_id, user_id, hours, log_type, notes, execution_date, is_locked)
VALUES
  ('3e9daeed-4fc6-4af6-ab4c-20486d48971b', 'f4c4bfb9-da35-45e8-baec-b01c3ea4b9e1', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), 2.5, 'executado', '', '2026-03-24', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.time_logs
  (id, task_id, user_id, hours, log_type, notes, execution_date, is_locked)
VALUES
  ('2389eb64-6269-4e8b-acc2-ba6282fe4b75', 'b8ea0090-7d16-4fc1-a02a-ca6d406dbb9b', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), 1.5, 'executado', '', '2026-03-26', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.time_logs
  (id, task_id, user_id, hours, log_type, notes, execution_date, is_locked)
VALUES
  ('e275e2bf-7545-4d5c-9053-e0062609a4cd', '650bbdd0-77ab-482e-b142-72d361e52953', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), 2, 'executado', '', '2026-03-09', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.time_logs
  (id, task_id, user_id, hours, log_type, notes, execution_date, is_locked)
VALUES
  ('ae066753-7d59-4fec-890e-66d4892d7b30', '7ebe1bd2-58b7-4e58-b1f4-62beff2069a5', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), 2, 'executado', '', '2026-03-10', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.time_logs
  (id, task_id, user_id, hours, log_type, notes, execution_date, is_locked)
VALUES
  ('874a08df-6f7e-402d-9ce0-fe8eb9edbf05', '0d9e43d2-8741-4bec-8fce-4b302304f382', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), 2.5, 'executado', '', '2026-03-11', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.time_logs
  (id, task_id, user_id, hours, log_type, notes, execution_date, is_locked)
VALUES
  ('740743a8-1336-488a-877a-797c86155665', '1cb0f879-c181-48ba-8ebd-3fd3eaa02931', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), 1.5, 'executado', '', '2026-03-13', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.time_logs
  (id, task_id, user_id, hours, log_type, notes, execution_date, is_locked)
VALUES
  ('191601d1-9c4c-4ef7-9b2c-36fc94abcb59', 'c0df55ad-9f44-4e0a-bcb2-9f40925d9c1e', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), 1, 'executado', '', '2026-03-17', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.time_logs
  (id, task_id, user_id, hours, log_type, notes, execution_date, is_locked)
VALUES
  ('1ecf5401-7807-4a20-bd10-0aac8ea284c8', '86191d49-ceea-4253-80c0-e3e00766673a', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), 4, 'cancelado_com_horas', 'Cancelada sem aviso prévio.', '2026-03-19', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.time_logs
  (id, task_id, user_id, hours, log_type, notes, execution_date, is_locked)
VALUES
  ('1df5493f-dab2-40fe-a610-eb596ab17f0e', '86191d49-ceea-4253-80c0-e3e00766673a', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), 4, 'executado', '', '2026-03-23', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.time_logs
  (id, task_id, user_id, hours, log_type, notes, execution_date, is_locked)
VALUES
  ('e6717ede-a47d-4c3e-97f7-805d1ffe5761', '4f21d677-2931-4e59-a7d3-1bb3f8293361', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), 1, 'executado', '', '2026-04-06', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.time_logs
  (id, task_id, user_id, hours, log_type, notes, execution_date, is_locked)
VALUES
  ('5970c575-441a-4fa0-b0c0-d5032535be90', 'c1811820-c514-4625-8c7d-4e2fd8610f66', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), -1.5, 'executado', '', '2026-04-06', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.time_logs
  (id, task_id, user_id, hours, log_type, notes, execution_date, is_locked)
VALUES
  ('1becfd14-a34a-4d3b-a4ff-6b83b64921c5', 'c1811820-c514-4625-8c7d-4e2fd8610f66', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), 1.5, 'executado', '', '2026-04-06', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.time_logs
  (id, task_id, user_id, hours, log_type, notes, execution_date, is_locked)
VALUES
  ('c81ecfee-4dae-43b3-89b9-b4fcf0d75cc4', '48e1b0fe-a0ba-4b80-9615-0ec1206616bd', _map_user('9db00f78-2ff2-4f31-9367-063789a92e52'), 0, 'executado', '', '2026-04-07', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.time_logs
  (id, task_id, user_id, hours, log_type, notes, execution_date, is_locked)
VALUES
  ('2c2aad10-5d7b-4c4b-a797-1c2171ef44f0', '48e1b0fe-a0ba-4b80-9615-0ec1206616bd', _map_user('9db00f78-2ff2-4f31-9367-063789a92e52'), 0, 'executado', '', '2026-04-07', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.time_logs
  (id, task_id, user_id, hours, log_type, notes, execution_date, is_locked)
VALUES
  ('6fc5d414-c66e-4039-b3d9-bc1884996bb3', '48e1b0fe-a0ba-4b80-9615-0ec1206616bd', _map_user('9db00f78-2ff2-4f31-9367-063789a92e52'), 0.3, 'executado', '', '2026-04-07', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.time_logs
  (id, task_id, user_id, hours, log_type, notes, execution_date, is_locked)
VALUES
  ('2cfc8e21-3318-405c-b1d1-d8c16cbd2037', '48e1b0fe-a0ba-4b80-9615-0ec1206616bd', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), 10, 'executado', '', '2026-04-07', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.time_logs
  (id, task_id, user_id, hours, log_type, notes, execution_date, is_locked)
VALUES
  ('4307a443-6476-4c61-9b89-cea923b0ecc7', '48e1b0fe-a0ba-4b80-9615-0ec1206616bd', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), 0.5, 'executado', '', '2026-04-07', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.time_logs
  (id, task_id, user_id, hours, log_type, notes, execution_date, is_locked)
VALUES
  ('6a61e110-0443-413b-895b-c9c52d073693', '48e1b0fe-a0ba-4b80-9615-0ec1206616bd', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), -10, 'executado', '', '2026-04-07', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.time_logs
  (id, task_id, user_id, hours, log_type, notes, execution_date, is_locked)
VALUES
  ('9efbc7aa-7489-4758-9bcc-a901993659a6', '07321770-8bbf-4839-92cb-8afaca2a5bcd', _map_user('f455b795-4baf-41af-8d95-7aedf28c24dd'), 1, 'executado', '', '2026-04-09', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.time_logs
  (id, task_id, user_id, hours, log_type, notes, execution_date, is_locked)
VALUES
  ('3f949915-446f-461b-b37a-ab23f7151521', '8c636ace-129c-451d-bf99-d60b7eb8e3cd', _map_user('f455b795-4baf-41af-8d95-7aedf28c24dd'), 3, 'executado', '', '2026-04-07', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.time_logs
  (id, task_id, user_id, hours, log_type, notes, execution_date, is_locked)
VALUES
  ('f19c00a2-28e8-438e-838c-cb9cb7fb5941', '445f8f79-5e3e-4191-8bc4-1de0445c83eb', _map_user('f455b795-4baf-41af-8d95-7aedf28c24dd'), 3, 'executado', '', '2026-04-09', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.time_logs
  (id, task_id, user_id, hours, log_type, notes, execution_date, is_locked)
VALUES
  ('7be02e65-2688-47c9-9319-b450b2a0ca1c', '4a4dfe90-408d-412f-b1d5-48465aa7788a', _map_user('f455b795-4baf-41af-8d95-7aedf28c24dd'), 1, 'executado', '', '2026-04-10', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.time_logs
  (id, task_id, user_id, hours, log_type, notes, execution_date, is_locked)
VALUES
  ('a6077280-2dfb-4e6c-9ab9-d6be413f711b', '5d7c2236-d43c-42ec-a772-2c38683b8477', _map_user('f455b795-4baf-41af-8d95-7aedf28c24dd'), 0.5, 'executado', '', '2026-04-07', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.time_logs
  (id, task_id, user_id, hours, log_type, notes, execution_date, is_locked)
VALUES
  ('9632b9a3-55a9-46f2-b633-beccd8919b62', '1974d9c9-a02a-4360-aef1-c2a02535dc0a', _map_user('f455b795-4baf-41af-8d95-7aedf28c24dd'), 0.5, 'executado', '', '2026-04-07', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.time_logs
  (id, task_id, user_id, hours, log_type, notes, execution_date, is_locked)
VALUES
  ('f30f764c-cc9b-4afe-9ce9-f76a5e8d42a5', '30969eb6-4ad6-4a80-ae94-4fdf3d674491', _map_user('f455b795-4baf-41af-8d95-7aedf28c24dd'), 2, 'executado', '', '2026-02-16', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.time_logs
  (id, task_id, user_id, hours, log_type, notes, execution_date, is_locked)
VALUES
  ('bf166fb9-673e-4efc-ae60-595efcedf644', 'e2162c89-4677-4d17-af1f-a18b2578d490', _map_user('f455b795-4baf-41af-8d95-7aedf28c24dd'), 4, 'executado', '', '2026-02-25', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.time_logs
  (id, task_id, user_id, hours, log_type, notes, execution_date, is_locked)
VALUES
  ('8352b428-5481-4899-9435-c7127084f3da', '1b5a6ef4-2616-477f-8a5c-43f5b805ad5e', _map_user('f455b795-4baf-41af-8d95-7aedf28c24dd'), 2.5, 'executado', '', '2026-02-23', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.time_logs
  (id, task_id, user_id, hours, log_type, notes, execution_date, is_locked)
VALUES
  ('2e77e529-1cb1-4638-96a0-d3018cbb19ee', '7503f5d2-3e47-4f8c-a866-ef352bf3a117', _map_user('f455b795-4baf-41af-8d95-7aedf28c24dd'), 2, 'executado', '', '2026-02-24', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.time_logs
  (id, task_id, user_id, hours, log_type, notes, execution_date, is_locked)
VALUES
  ('decb5234-3b61-46e3-a9f1-2f88241f94c1', 'c86e60b7-68b4-4a10-a225-d3d449b44f9b', _map_user('f455b795-4baf-41af-8d95-7aedf28c24dd'), 10, 'executado', '', '2026-03-17', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.time_logs
  (id, task_id, user_id, hours, log_type, notes, execution_date, is_locked)
VALUES
  ('b4ad1a0c-f66d-45cc-a936-7d98d9bad216', 'ec0d273f-219b-4073-859b-c189229c1869', _map_user('f455b795-4baf-41af-8d95-7aedf28c24dd'), 3, 'executado', '', '2026-03-31', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.time_logs
  (id, task_id, user_id, hours, log_type, notes, execution_date, is_locked)
VALUES
  ('93db03d0-7c51-499f-8c97-1951af97b91d', '86802a60-5ccd-462f-95de-e1d8f7665999', _map_user('f455b795-4baf-41af-8d95-7aedf28c24dd'), 2, 'executado', '', '2026-04-10', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.time_logs
  (id, task_id, user_id, hours, log_type, notes, execution_date, is_locked)
VALUES
  ('7abb41f3-82bb-4936-bd64-9e084d889a84', '86e18ab1-de36-4957-8e07-d52f49194f01', _map_user('f455b795-4baf-41af-8d95-7aedf28c24dd'), 2, 'executado', '', '2026-04-10', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.time_logs
  (id, task_id, user_id, hours, log_type, notes, execution_date, is_locked)
VALUES
  ('9f470028-6537-4cc5-89f1-ec21359cf14d', '84a96019-0361-401d-8fda-759cb4a94d30', _map_user('f455b795-4baf-41af-8d95-7aedf28c24dd'), 1, 'executado', '', '2026-04-10', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.time_logs
  (id, task_id, user_id, hours, log_type, notes, execution_date, is_locked)
VALUES
  ('0672f2c4-66df-4cd3-993f-6a23dd6847b0', '4cceb8a6-9f7c-4a16-9c66-1abb9acdac56', _map_user('f455b795-4baf-41af-8d95-7aedf28c24dd'), 2, 'executado', '', '2026-04-10', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.time_logs
  (id, task_id, user_id, hours, log_type, notes, execution_date, is_locked)
VALUES
  ('cd6be3b9-395e-4607-a391-3a426522a73a', 'ac96a139-eeab-41aa-807a-9e560709e683', _map_user('f455b795-4baf-41af-8d95-7aedf28c24dd'), 1, 'executado', '', '2026-04-10', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.time_logs
  (id, task_id, user_id, hours, log_type, notes, execution_date, is_locked)
VALUES
  ('5c961a47-8e3f-4cc0-aaa8-cddf3769a220', 'bbf13134-2920-4dc4-983a-947d00880c27', _map_user('f455b795-4baf-41af-8d95-7aedf28c24dd'), 5, 'executado', '', '2026-04-10', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 10. PROJECT CONTACTS (2 contatos)
-- ============================================================
INSERT INTO public.project_contacts (id, project_id, name, phone, role)
VALUES
  ('01ac3a54-9629-44d6-b6c3-7781baa9024e', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', 'Adriana', '+55 92 9221-1307', 'Comercial'),
  ('929092b8-c218-4630-842f-a7a6d949f90b', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', 'Francisco', '+55 92 9164-4749', 'Gerente')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 11. LABELS (422 labels)
-- ============================================================
INSERT INTO public.labels (id, project_id, code, name, status)
VALUES
  ('bd0302ab-ff63-4d93-9c3a-2c1a5068c93a', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', '0.1', 'Primeiro Contato', 'completed'),
  ('4ef06d8d-917c-4a33-aaff-e30337cb1594', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', '0.2', 'Formulário boas-vindas', 'not_started'),
  ('aaef2290-b8b3-42a8-978d-420832b43016', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', '0.3', 'Alinhamento', 'not_started'),
  ('2e85bca4-2888-4cb3-a12b-889c19001a08', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', '0.4', 'Planilha Enviada', 'not_started'),
  ('d74109c5-dc9c-4584-b1b0-9129099d220b', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', '0.5', 'Planilha Devolvida', 'not_started'),
  ('0eced90c-b468-40bf-97de-1a0881822cd0', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', '0.6', 'Cronograma', 'not_started'),
  ('f08f3d10-bb07-4b9d-9202-7ee2bb29baac', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', '1.1', 'Instalação', 'not_started'),
  ('ae1b2de8-e4fd-49ca-8743-2540936b09b5', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', '1.2', 'Configurações', 'not_started'),
  ('fa3c13fb-c6c1-44cd-bab6-21e6a9385605', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', '1.3', 'Cadastros', 'not_started'),
  ('4364d23d-c28e-42a2-be5a-ca0973905d58', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', '1.4', 'Vendas', 'not_started'),
  ('c0986541-4a99-4180-9fdd-af8be00a3cab', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', '1.5', 'NF-e', 'not_started'),
  ('9ce39900-8ac5-4ca8-9045-21f2573f641a', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', '1.6', 'Virada Vendas', 'not_started'),
  ('b0a6593b-577a-47f8-8195-cc6e6b989307', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', '2.1', 'Controle Financeiro', 'not_started'),
  ('b15a8a54-77f8-40cb-9b8b-fa0ae80cf14c', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', '2.2', 'Boletos', 'not_started'),
  ('dae0b899-6c2e-4f30-bdc1-7d4abe6ef289', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', '3.1', 'Cadastros Produção', 'not_started'),
  ('e40461b8-a0ac-4294-8997-d8a2f6cde1dc', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', '3.2', 'Ficha Técnica', 'not_started'),
  ('cc01ed44-1e82-4e4c-8a7f-25ac75207cd9', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', '3.3', 'Ordem Produção', 'not_started'),
  ('623f1d32-cf94-4b2a-a121-fa50fde7065d', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', '3.4', 'Virada Produção', 'not_started'),
  ('325e433a-bfae-451d-a3e2-c262604c16f9', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', '3.5', 'Faccionistas', 'not_started'),
  ('0d06cc48-7011-4600-9b81-01fccc438e7d', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', '0.1', 'Primeiro Contato', 'completed'),
  ('d8348618-2580-4061-9618-7e7a2815bb03', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', '0.2', 'Formulário boas-vindas', 'completed'),
  ('b939124e-9db6-4768-9c24-6d69d60c774d', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', '0.3', 'Alinhamento', 'completed'),
  ('dc0ef824-c240-4595-843d-0b55cf67976c', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', '0.4', 'Planilha Enviada', 'completed'),
  ('7ff0efa0-6fd5-4fe0-b5af-1837a91552c0', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', '0.5', 'Planilha Devolvida', 'not_started'),
  ('2c0f947c-6704-44ab-88a5-b5cf85fc13cd', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', '0.6', 'Cronograma', 'not_started'),
  ('9d6b8c4b-c5ae-4cb4-9e01-f49ada4d5835', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', '1.1', 'Instalação', 'not_started'),
  ('a4b6cbf7-a783-4ede-a6e7-7949fd419d62', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', '1.2', 'Configurações', 'not_started'),
  ('0a4fc4ab-3792-4a21-9ee1-9c8e94d9151f', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', '1.3', 'Cadastros', 'not_started'),
  ('a1211e6b-bd6c-470c-b195-9d252b657ba4', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', '1.4', 'Vendas', 'not_started'),
  ('df5c706c-5525-4fc0-a829-a21358866b97', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', '1.5', 'NF-e', 'not_started'),
  ('fedac37a-27d6-4be7-ba4c-cfe79a66c7f9', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', '1.6', 'Virada Vendas', 'not_started'),
  ('1b338deb-696e-4f41-8f27-3e2ca92e33a2', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', '1.7', 'AzVendas', 'not_started'),
  ('3921c0d3-e3c7-4309-92a2-a46ebec413c2', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', '1.8', 'E-commerce', 'not_started'),
  ('4d245898-85c3-4ebc-b14e-adf0edea108a', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', '2.1', 'Controle Financeiro', 'not_started'),
  ('f7a528bb-6a7b-424e-873d-7328c1bf0ad8', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', '2.2', 'Boletos', 'not_started'),
  ('e9fc7700-3713-4f4f-a8f5-fe64aa490526', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', '2.3', 'Controle de Cheque', 'not_started'),
  ('883ecc7f-ff05-4607-b7c9-ec6efdee033d', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', '3.1', 'Cadastros Produção', 'not_started'),
  ('94d06b91-f0cc-407b-b17a-e7d69ba9a52b', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', '3.2', 'Ficha Técnica', 'not_started'),
  ('6aba3af7-e7fd-40bf-8e9a-b048a6e6fa01', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', '3.3', 'Ordem Produção', 'not_started'),
  ('6f89063b-924d-4a78-bce3-6b4519a4202f', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', '3.4', 'Virada Produção', 'not_started'),
  ('ff21c181-e1a5-47e8-98b1-535ba71c4f51', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', '3.5', 'Faccionistas', 'not_started'),
  ('7f5dcb2d-ac04-4d06-94e2-8969afc307be', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', '3.6', 'Controle Estoque', 'not_started'),
  ('acda25db-877a-4482-bdd1-60293ce2787a', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', '4.1', 'Fluxo de Caixa', 'not_started'),
  ('bf6ae3c3-aab6-42b2-a843-181256850990', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', '4.2', 'DRE', 'not_started'),
  ('7a36cf41-d854-4310-889a-a46f4817ab4d', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', '4.3', 'Relatórios BI', 'not_started'),
  ('9486c2fd-e438-4e50-b923-0b435aefdecf', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', '4.4', 'Compras', 'not_started'),
  ('910361a3-8fe5-4440-8d9e-dda723c3cc39', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', '4.5', 'Integração Correios', 'not_started'),
  ('90523e2e-9c9d-4f91-823c-f72e7193c339', '6eb273c1-4edd-4cdb-8e56-25235ba2d539', '4.6', 'Finalização', 'not_started'),
  ('f797ece8-e6c0-44ce-92aa-ce78e34523bc', 'f51a9f52-fbe5-4936-945a-8ee79d163730', '0.2', 'Formulário boas-vindas', 'completed'),
  ('bc83c187-73eb-494c-a254-53f4f09e1a22', 'f51a9f52-fbe5-4936-945a-8ee79d163730', '0.3', 'Alinhamento', 'completed'),
  ('6b8bf45a-7dd7-48c5-9efe-7bc06e609f2b', 'f51a9f52-fbe5-4936-945a-8ee79d163730', '0.4', 'Planilha Enviada', 'completed'),
  ('b901149f-6af4-4da6-8ff4-a989d6cf557c', 'f51a9f52-fbe5-4936-945a-8ee79d163730', '0.5', 'Planilha Devolvida', 'not_started'),
  ('4e77ccca-3a10-45fa-861c-c8f539c23ca7', 'f51a9f52-fbe5-4936-945a-8ee79d163730', '0.6', 'Cronograma', 'not_started'),
  ('4190129f-f903-4962-a139-b0e753ffacbc', 'f51a9f52-fbe5-4936-945a-8ee79d163730', '1.1', 'Instalação', 'not_started'),
  ('962f8d27-cb37-4120-a0a6-b4954312645c', 'f51a9f52-fbe5-4936-945a-8ee79d163730', '1.2', 'Configurações', 'not_started'),
  ('91cad6fb-0c21-4a1f-9167-c187e01905c9', 'f51a9f52-fbe5-4936-945a-8ee79d163730', '1.3', 'Cadastros', 'not_started'),
  ('caa49043-637d-4c3f-bf9a-62cec1f0a86f', 'f51a9f52-fbe5-4936-945a-8ee79d163730', '1.4', 'Vendas', 'not_started'),
  ('dc18ebbf-b66a-449c-a711-f797e6a87823', 'f51a9f52-fbe5-4936-945a-8ee79d163730', '1.5', 'NF-e', 'not_started'),
  ('6c1f78f3-4732-4057-b3d8-7f6149a1188d', 'f51a9f52-fbe5-4936-945a-8ee79d163730', '1.6', 'Virada Vendas', 'not_started'),
  ('1aec6d8c-c9b9-4449-8593-5dd74f7c3b78', 'f51a9f52-fbe5-4936-945a-8ee79d163730', '2.1', 'Controle Financeiro', 'not_started'),
  ('7a91ea70-4b75-41fd-920a-fa9718013753', 'f51a9f52-fbe5-4936-945a-8ee79d163730', '2.2', 'Boletos', 'not_started'),
  ('130bc20b-e1e9-4b96-b78f-ccf070054a1c', 'f51a9f52-fbe5-4936-945a-8ee79d163730', '3.1', 'Cadastros Produção', 'not_started'),
  ('87a25a70-5f63-4e9c-af6f-f0a6a7660c77', 'f51a9f52-fbe5-4936-945a-8ee79d163730', '3.2', 'Ficha Técnica', 'not_started'),
  ('7d9ea48d-b08d-4d8d-842a-33a9927e392a', 'f51a9f52-fbe5-4936-945a-8ee79d163730', '3.3', 'Ordem Produção', 'not_started'),
  ('d51e8cab-20ea-474e-9c09-9254b715eb8e', 'f51a9f52-fbe5-4936-945a-8ee79d163730', '3.4', 'Virada Produção', 'not_started'),
  ('bc04d50f-4560-4e76-ae29-a502056c1bf9', 'f51a9f52-fbe5-4936-945a-8ee79d163730', '3.5', 'Faccionistas', 'not_started'),
  ('b03db6f5-f1c5-4d26-b76c-ff3e0d608065', 'f51a9f52-fbe5-4936-945a-8ee79d163730', '3.6', 'Controle Estoque', 'not_started'),
  ('24bb9df9-5ecd-44c9-ade7-d82da7d36f1e', 'f51a9f52-fbe5-4936-945a-8ee79d163730', '4.1', 'Fluxo de Caixa', 'not_started'),
  ('4259517e-1d7d-43b3-a2e6-4c044ca6bd45', 'f51a9f52-fbe5-4936-945a-8ee79d163730', '4.2', 'DRE', 'not_started'),
  ('e758228d-ed95-4644-8041-773e3c17889c', 'f51a9f52-fbe5-4936-945a-8ee79d163730', '4.3', 'Relatórios BI', 'not_started'),
  ('78e5f6f8-d65e-46cd-a18a-8a49b6700d33', 'f51a9f52-fbe5-4936-945a-8ee79d163730', '4.4', 'Compras', 'not_started'),
  ('964d1af6-5c76-492e-ba53-d4e99cfa3b41', 'f51a9f52-fbe5-4936-945a-8ee79d163730', '0.1', 'Primeiro Contato', 'completed'),
  ('d6a997e2-80c0-4e3b-865a-27ff5b4de7ac', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', '3.6', 'Controle Estoque', 'not_started'),
  ('98b9707d-9d9a-4299-aeaf-719b0eed5980', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', '4.1', 'Fluxo de Caixa', 'not_started'),
  ('3e731144-dd63-49fe-be3e-d2862a257163', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', '4.2', 'DRE', 'not_started'),
  ('9ea88001-d924-4de7-8ba1-76ff9d8126f9', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', '4.3', 'Relatórios BI', 'not_started'),
  ('db327c86-d2e3-4dc2-9f22-6757b1ce1e35', '38d0ade9-4cc8-454e-bdd2-f20e39ef9f53', '4.4', 'Compras', 'not_started'),
  ('f7b2abbe-3a14-492f-97dc-e90fff6d385a', 'a0806098-50e2-4cc8-a976-591117f36aa7', '0.3', 'Alinhamento', 'completed'),
  ('0a35a0a3-0088-4e06-b46e-b0775e6143a4', 'a0806098-50e2-4cc8-a976-591117f36aa7', '0.4', 'Planilha Enviada', 'completed'),
  ('dc54d203-13a3-484f-b69b-9d81ffa72b6d', 'a0806098-50e2-4cc8-a976-591117f36aa7', '0.5', 'Planilha Devolvida', 'not_started'),
  ('7a07cd3e-dcb8-4116-9902-2fcb19299d7e', 'a0806098-50e2-4cc8-a976-591117f36aa7', '0.6', 'Cronograma', 'not_started'),
  ('a5310495-bf5d-4d82-9fcf-27c05d633858', 'a0806098-50e2-4cc8-a976-591117f36aa7', '1.1', 'Instalação', 'not_started'),
  ('512974e9-0dcb-4e60-98fa-32dede3160d6', 'a0806098-50e2-4cc8-a976-591117f36aa7', '1.2', 'Configurações', 'not_started'),
  ('3fd3415d-1398-4a6a-9c3b-03b37327f124', 'a0806098-50e2-4cc8-a976-591117f36aa7', '1.3', 'Cadastros', 'not_started'),
  ('bdc7705b-49f2-46d9-87e2-8ccabfc18e67', 'a0806098-50e2-4cc8-a976-591117f36aa7', '1.4', 'Vendas', 'not_started'),
  ('c004549e-5a8c-4094-9987-d8dd7b930100', 'a0806098-50e2-4cc8-a976-591117f36aa7', '1.5', 'NF-e', 'not_started'),
  ('bc160e05-0365-48a9-8b9c-78f3669ff74b', 'a0806098-50e2-4cc8-a976-591117f36aa7', '1.6', 'Virada Vendas', 'not_started'),
  ('3c357cb5-802d-45e2-89e3-db8b94bd3c22', 'a0806098-50e2-4cc8-a976-591117f36aa7', '2.1', 'Controle Financeiro', 'not_started'),
  ('db5d7c48-2f5f-4727-866a-7c8ee36f7d74', 'a0806098-50e2-4cc8-a976-591117f36aa7', '2.2', 'Boletos', 'not_started'),
  ('7d1dacd6-f2e4-4c1e-8fed-49a0315afa27', 'a0806098-50e2-4cc8-a976-591117f36aa7', '2.3', 'Controle de Cheque', 'not_started'),
  ('f69fe220-cbcd-4a05-b002-53923a44bbf8', 'a0806098-50e2-4cc8-a976-591117f36aa7', '3.1', 'Cadastros Produção', 'not_started'),
  ('f037b7a0-ad92-42cf-8a7c-ac87a03f5435', 'a0806098-50e2-4cc8-a976-591117f36aa7', '3.2', 'Ficha Técnica', 'not_started'),
  ('2d466023-9338-4586-a415-d9b730bb3c5a', 'a0806098-50e2-4cc8-a976-591117f36aa7', '3.3', 'Ordem Produção', 'not_started'),
  ('b4842658-d6f6-4b6f-ae9a-6c8589574447', 'a0806098-50e2-4cc8-a976-591117f36aa7', '3.4', 'Virada Produção', 'not_started'),
  ('be612ce5-e33b-47d0-8a29-8ace0b3aa37c', 'a0806098-50e2-4cc8-a976-591117f36aa7', '0.1', 'Primeiro Contato', 'completed'),
  ('f5b41a1a-ad1a-4ece-9c6e-b961e14c9615', 'a0806098-50e2-4cc8-a976-591117f36aa7', '0.2', 'Formulário boas-vindas', 'completed'),
  ('4807c621-95cc-43ad-bbb1-70db424aa267', 'be964773-2599-4300-86c1-5d7dae304952', '0.2', 'Formulário boas-vindas', 'completed'),
  ('d386a04e-74bc-437b-a1e8-a7006907f1dd', 'be964773-2599-4300-86c1-5d7dae304952', '0.3', 'Alinhamento', 'completed'),
  ('c190071f-b32c-4fdd-9295-8f5a7eb218e5', 'be964773-2599-4300-86c1-5d7dae304952', '0.4', 'Planilha Enviada', 'completed'),
  ('f44dd7d4-4a72-4bc5-8244-ac13a185aff3', 'be964773-2599-4300-86c1-5d7dae304952', '0.5', 'Planilha Devolvida', 'not_started'),
  ('4917be69-ad9f-4455-8bf2-1a749405913f', 'be964773-2599-4300-86c1-5d7dae304952', '0.6', 'Cronograma', 'not_started'),
  ('394cbdf7-cc1e-4cd6-b5cc-3aa99fd7c31d', 'be964773-2599-4300-86c1-5d7dae304952', '1.1', 'Instalação', 'not_started'),
  ('287894bc-ad09-449c-bd7e-96a90a2cc9b2', 'be964773-2599-4300-86c1-5d7dae304952', '1.2', 'Configurações', 'not_started'),
  ('37a63419-e83c-4bb2-82ff-a63d0be490dc', 'be964773-2599-4300-86c1-5d7dae304952', '1.3', 'Cadastros', 'not_started'),
  ('66fc7d59-7535-4213-8a74-a8fc935e4471', 'be964773-2599-4300-86c1-5d7dae304952', '1.4', 'Vendas', 'not_started'),
  ('158b37e2-abaf-4194-8a75-f61eeec0b462', 'be964773-2599-4300-86c1-5d7dae304952', '1.5', 'NF-e', 'not_started'),
  ('aabfdd2c-5692-4081-af64-82c90a33cc59', 'be964773-2599-4300-86c1-5d7dae304952', '1.6', 'Virada Vendas', 'not_started'),
  ('2d0cfb2c-44e5-46e9-b0ad-2ade78d02197', 'be964773-2599-4300-86c1-5d7dae304952', '2.1', 'Controle Financeiro', 'not_started'),
  ('96d5ff53-f985-4f34-8eb9-63c7cd5eaf26', 'be964773-2599-4300-86c1-5d7dae304952', '2.2', 'Boletos', 'not_started'),
  ('79740c1c-0750-4c75-a25e-90d5bed0ecf2', 'be964773-2599-4300-86c1-5d7dae304952', '3.1', 'Cadastros Produção', 'not_started'),
  ('3e24b633-8014-4257-9d0a-a0920baf7d1d', 'be964773-2599-4300-86c1-5d7dae304952', '3.2', 'Ficha Técnica', 'not_started'),
  ('176be43f-138d-4f69-b5f1-69183887cd1d', 'be964773-2599-4300-86c1-5d7dae304952', '3.3', 'Ordem Produção', 'not_started'),
  ('ddebd96c-1653-4981-9531-a2be0c7d3384', 'be964773-2599-4300-86c1-5d7dae304952', '3.4', 'Virada Produção', 'not_started'),
  ('b10a90fa-f68a-4ab4-80d1-e9d53fd07ec8', 'be964773-2599-4300-86c1-5d7dae304952', '3.5', 'Faccionistas', 'not_started'),
  ('0ed6a501-75df-43b9-a950-dfb2653e6c79', 'be964773-2599-4300-86c1-5d7dae304952', '3.6', 'Controle Estoque', 'not_started'),
  ('d4dbc256-c925-4916-8801-067f187febc0', 'be964773-2599-4300-86c1-5d7dae304952', '4.1', 'Fluxo de Caixa', 'not_started'),
  ('c6ffe511-21da-4e9d-9a97-455c1079fe59', 'be964773-2599-4300-86c1-5d7dae304952', '4.2', 'DRE', 'not_started'),
  ('65639802-a31e-4ae5-a6fc-a0ac805e1979', '74fbba58-ac87-4114-a216-e80f08557428', '0.1', 'Primeiro Contato', 'completed'),
  ('9bc4b6ca-9de9-463c-b390-66fb2a72cf7c', '74fbba58-ac87-4114-a216-e80f08557428', '0.2', 'Formulário boas-vindas', 'completed'),
  ('017911c9-3089-4e35-aaa1-a1bc778db4ca', '74fbba58-ac87-4114-a216-e80f08557428', '0.3', 'Alinhamento', 'completed'),
  ('ffd407f1-7152-46e8-8296-ddf1da1f2c07', '74fbba58-ac87-4114-a216-e80f08557428', '0.4', 'Planilha Enviada', 'completed'),
  ('40ef2439-1e7d-4082-a3a8-e14e7aa7a823', '74fbba58-ac87-4114-a216-e80f08557428', '0.5', 'Planilha Devolvida', 'completed'),
  ('84f336b0-ea8a-4288-baad-6447c2b31e45', '74fbba58-ac87-4114-a216-e80f08557428', '0.6', 'Cronograma', 'completed'),
  ('12417c19-6123-4d2f-8123-63aa295810c0', '74fbba58-ac87-4114-a216-e80f08557428', '1.1', 'Instalação', 'completed'),
  ('5832ba15-e0f5-47cb-95c6-36a8456a59f1', '74fbba58-ac87-4114-a216-e80f08557428', '1.2', 'Configurações', 'completed'),
  ('98fb9171-11d7-4255-82e7-6d9b328b5235', '74fbba58-ac87-4114-a216-e80f08557428', '1.3', 'Cadastros', 'completed'),
  ('f81ef391-e933-44d9-ba65-799bd32d95f8', '74fbba58-ac87-4114-a216-e80f08557428', '1.4', 'Vendas', 'completed'),
  ('2bb152e2-9008-4419-a228-d5128e1badfd', '74fbba58-ac87-4114-a216-e80f08557428', '1.5', 'NF-e', 'completed'),
  ('23f4c346-f91b-4bb8-a613-2f84e96bf78b', '74fbba58-ac87-4114-a216-e80f08557428', '1.6', 'Virada Vendas', 'completed'),
  ('1f4aff96-0be7-4fde-aeee-7c755ba82d10', '74fbba58-ac87-4114-a216-e80f08557428', '2.1', 'Controle Financeiro', 'not_started'),
  ('7e0da900-64e9-4357-a2e4-1912868a8a08', '74fbba58-ac87-4114-a216-e80f08557428', '2.2', 'Boletos', 'not_started'),
  ('8fc9c329-f867-41c3-871a-5685acafb741', '74fbba58-ac87-4114-a216-e80f08557428', '3.1', 'Cadastros Produção', 'not_started'),
  ('a7d8dba1-fa53-4d76-ba7e-cbfeedd14656', '74fbba58-ac87-4114-a216-e80f08557428', '3.2', 'Ficha Técnica', 'not_started'),
  ('23a4c752-1a70-441f-8a80-bcac64771b90', '74fbba58-ac87-4114-a216-e80f08557428', '3.3', 'Ordem Produção', 'not_started'),
  ('e489344c-9d60-4b46-bc38-640f5692cfa1', '74fbba58-ac87-4114-a216-e80f08557428', '3.4', 'Virada Produção', 'not_started'),
  ('5dcd49a8-f7cb-4a34-a6f0-7e6ccbca06dd', '74fbba58-ac87-4114-a216-e80f08557428', '3.5', 'Faccionistas', 'not_started'),
  ('47622cc2-c5d5-4ecd-bc2d-d7d6f2643550', '74fbba58-ac87-4114-a216-e80f08557428', '3.6', 'Controle Estoque', 'not_started'),
  ('8a224e9e-347c-4177-876b-38771204d40f', '74fbba58-ac87-4114-a216-e80f08557428', '4.1', 'Fluxo de Caixa', 'not_started'),
  ('c1aea342-4379-42b4-8269-5b578c643cd5', '74fbba58-ac87-4114-a216-e80f08557428', '4.2', 'DRE', 'not_started'),
  ('59d72a9f-49fb-436c-8768-2f5ba2c6e8e8', '74fbba58-ac87-4114-a216-e80f08557428', '4.3', 'Relatórios BI', 'not_started'),
  ('866e066d-ac30-48e9-ad4e-c1b388c0ea7b', '74fbba58-ac87-4114-a216-e80f08557428', '4.4', 'Compras', 'not_started'),
  ('9a04fe93-32db-4de3-8b46-170478b9442c', '4e36cf11-9121-4441-adcb-73aa56992196', '0.2', 'Formulário boas-vindas', 'completed'),
  ('df51595c-2c43-4fdf-be4a-ef42f534c8f9', '4e36cf11-9121-4441-adcb-73aa56992196', '0.3', 'Alinhamento', 'completed'),
  ('eb3bbd76-008c-49bf-85e3-82358f57cadd', '4e36cf11-9121-4441-adcb-73aa56992196', '0.4', 'Planilha Enviada', 'completed'),
  ('1c4bd110-5bc9-481b-8022-4c77ecdbca75', '4e36cf11-9121-4441-adcb-73aa56992196', '0.5', 'Planilha Devolvida', 'completed'),
  ('06769127-34a1-44e5-a5a0-4594133c8028', '4e36cf11-9121-4441-adcb-73aa56992196', '0.6', 'Cronograma', 'completed'),
  ('7b41e5db-d9b7-406a-811d-d1b90042c77a', '4e36cf11-9121-4441-adcb-73aa56992196', '1.1', 'Instalação', 'not_started'),
  ('2316db66-1e92-41ee-978b-8905d59acfd5', '4e36cf11-9121-4441-adcb-73aa56992196', '1.2', 'Configurações', 'not_started'),
  ('92d518ec-cdfd-4a50-8e24-3c62ddc0076a', '4e36cf11-9121-4441-adcb-73aa56992196', '1.3', 'Cadastros', 'not_started'),
  ('6d76887b-9038-4f0e-ac4f-d429fa32453f', '4e36cf11-9121-4441-adcb-73aa56992196', '1.4', 'Vendas', 'not_started'),
  ('efe7e5dc-1222-4feb-bbcd-e9042123e4b6', '4e36cf11-9121-4441-adcb-73aa56992196', '1.5', 'NF-e', 'not_started'),
  ('ecc6c8aa-a230-4ccc-9fcd-8d64396442c5', '4e36cf11-9121-4441-adcb-73aa56992196', '1.6', 'Virada Vendas', 'not_started'),
  ('46154926-4b79-4c7d-bdf0-c58f1f5bd165', '4e36cf11-9121-4441-adcb-73aa56992196', '2.1', 'Controle Financeiro', 'not_started'),
  ('ccabee59-592d-4004-9b99-2675e56625b2', '4e36cf11-9121-4441-adcb-73aa56992196', '2.2', 'Boletos', 'not_started'),
  ('d57a4533-bfec-4cfd-a036-05c033f83b46', '4e36cf11-9121-4441-adcb-73aa56992196', '3.1', 'Cadastros Produção', 'not_started'),
  ('b21fefca-50d2-440c-88f9-22294be4f067', '4e36cf11-9121-4441-adcb-73aa56992196', '3.2', 'Ficha Técnica', 'not_started'),
  ('0f6a7e59-924e-463a-8aab-e680d26bc2c5', '4e36cf11-9121-4441-adcb-73aa56992196', '3.3', 'Ordem Produção', 'not_started'),
  ('30b7a2e5-2a8d-46d9-aa42-7089439eda87', '4e36cf11-9121-4441-adcb-73aa56992196', '3.4', 'Virada Produção', 'not_started'),
  ('a0636a67-7712-4e86-ae57-2d3491de1a68', '4e36cf11-9121-4441-adcb-73aa56992196', '3.5', 'Faccionistas', 'not_started'),
  ('cff94779-5cba-4e57-8bf3-3158c596dd3c', '4e36cf11-9121-4441-adcb-73aa56992196', '3.6', 'Controle Estoque', 'not_started'),
  ('89b2e6ca-6df4-45c9-a6af-f357f60ec9d5', 'be964773-2599-4300-86c1-5d7dae304952', '4.3', 'Relatórios BI', 'not_started'),
  ('69e2cbbe-3e23-4640-8fa2-df8290fb8f2f', 'be964773-2599-4300-86c1-5d7dae304952', '4.4', 'Compras', 'not_started'),
  ('99c6b0c4-d118-4522-9ed5-2a51c3f7c3d9', 'be964773-2599-4300-86c1-5d7dae304952', '0.1', 'Primeiro Contato', 'completed'),
  ('fd93f9b3-c5ea-4bbf-bf0f-b6bf24e1c41a', '4e36cf11-9121-4441-adcb-73aa56992196', '4.1', 'Fluxo de Caixa', 'not_started'),
  ('c0dbbddd-8010-4cf1-ac52-4e6721adb1a9', '4e36cf11-9121-4441-adcb-73aa56992196', '4.2', 'DRE', 'not_started'),
  ('71460a3f-0295-42c5-aa98-85f629916847', '4e36cf11-9121-4441-adcb-73aa56992196', '4.3', 'Relatórios BI', 'not_started'),
  ('b6a4b67a-f545-486f-adca-e2f345941dbb', '4e36cf11-9121-4441-adcb-73aa56992196', '4.4', 'Compras', 'not_started'),
  ('b9f8bc0c-f42b-4609-a782-b1c89205a684', '4e36cf11-9121-4441-adcb-73aa56992196', '0.1', 'Primeiro Contato', 'completed'),
  ('d4805f14-b677-4aba-a059-9b8972d93d76', 'dccf443e-93c7-4008-bed6-959515e6114f', '0.1', 'Primeiro Contato', 'completed'),
  ('bac1dbfc-fec3-435b-be16-ec9cec0798db', 'dccf443e-93c7-4008-bed6-959515e6114f', '0.2', 'Formulário boas-vindas', 'completed'),
  ('e3375322-0524-4584-9bf8-1ed406b2af68', 'dccf443e-93c7-4008-bed6-959515e6114f', '0.3', 'Alinhamento', 'completed'),
  ('7e70cda8-d383-4672-aac7-4b764a3f45ad', 'dccf443e-93c7-4008-bed6-959515e6114f', '0.4', 'Planilha Enviada', 'completed'),
  ('b1308677-7eb4-43d4-be21-4f065c20f31c', '9a2aaacd-6f11-4931-b41d-b7c103006919', '0.1', 'Primeiro Contato', 'completed'),
  ('72b00564-a4cf-4bcd-9299-737275051d93', '9a2aaacd-6f11-4931-b41d-b7c103006919', '0.3', 'Alinhamento', 'completed'),
  ('29543e49-6925-4d8f-9a30-09c191938423', '9a2aaacd-6f11-4931-b41d-b7c103006919', '0.4', 'Planilha Enviada', 'completed'),
  ('e0958357-7798-4fb3-a224-b9d2f734b866', '9a2aaacd-6f11-4931-b41d-b7c103006919', '0.5', 'Planilha Devolvida', 'completed'),
  ('a5d8c0ad-53cd-48ce-ab78-71a478bdd990', '9a2aaacd-6f11-4931-b41d-b7c103006919', '0.6', 'Cronograma', 'completed'),
  ('f54a0736-8975-4d1b-af3c-a35f519d3c6e', '9a2aaacd-6f11-4931-b41d-b7c103006919', '1.1', 'Instalação', 'completed'),
  ('45b30acf-4ca9-4046-93a6-5659071f2be5', '9a2aaacd-6f11-4931-b41d-b7c103006919', '1.2', 'Configurações', 'completed'),
  ('278c56b5-311b-4bbe-8b36-7166daf59836', '9a2aaacd-6f11-4931-b41d-b7c103006919', '1.4', 'Vendas', 'completed'),
  ('da0387c1-a6e4-4232-a5f3-ec5eb95d537c', '9a2aaacd-6f11-4931-b41d-b7c103006919', '1.5', 'NF-e', 'not_started'),
  ('587daa9b-58e9-4edc-a9f3-e5d76b51ec9e', '9a2aaacd-6f11-4931-b41d-b7c103006919', '1.6', 'Virada Vendas', 'not_started'),
  ('69c731d3-8e80-4a48-89db-0f3ac75892f5', '9a2aaacd-6f11-4931-b41d-b7c103006919', '2.1', 'Controle Financeiro', 'not_started'),
  ('0e4bf586-52a4-427d-b7b5-4537791b007f', '9a2aaacd-6f11-4931-b41d-b7c103006919', '2.2', 'Boletos', 'not_started'),
  ('2bac64fc-58a4-4f31-997d-a752e15382e6', '9a2aaacd-6f11-4931-b41d-b7c103006919', '3.1', 'Cadastros Produção', 'not_started'),
  ('00fb7ecb-cb02-4ecf-a1ca-2336cbe16ece', '9a2aaacd-6f11-4931-b41d-b7c103006919', '3.2', 'Ficha Técnica', 'not_started'),
  ('4452baa8-7e0b-41e7-9eff-2e88da54fbee', '9a2aaacd-6f11-4931-b41d-b7c103006919', '3.3', 'Ordem Produção', 'not_started'),
  ('796d50a8-9c92-487e-b246-aec0999c452a', '9a2aaacd-6f11-4931-b41d-b7c103006919', '3.4', 'Virada Produção', 'not_started'),
  ('8b0e97a4-5cf4-406f-956d-9c8cbe439e11', '9a2aaacd-6f11-4931-b41d-b7c103006919', '3.5', 'Faccionistas', 'not_started'),
  ('914930c0-134f-4bed-b9cb-d5ca867d3ff5', '9a2aaacd-6f11-4931-b41d-b7c103006919', '3.6', 'Controle Estoque', 'not_started'),
  ('79911e47-9a27-4286-be47-cc660e6982ba', '9a2aaacd-6f11-4931-b41d-b7c103006919', '4.1', 'Fluxo de Caixa', 'not_started'),
  ('9df222bd-2841-47c2-a0a9-6d238e2e6839', '9a2aaacd-6f11-4931-b41d-b7c103006919', '4.2', 'DRE', 'not_started'),
  ('74f0e624-7d1e-469a-a74c-261882cd23c2', '9a2aaacd-6f11-4931-b41d-b7c103006919', '4.3', 'Relatórios BI', 'not_started'),
  ('10444fb9-3483-43e2-9262-88519e743fc7', '9a2aaacd-6f11-4931-b41d-b7c103006919', '4.4', 'Compras', 'not_started'),
  ('41054f66-83a6-40bc-960e-a24b914b7415', '9a2aaacd-6f11-4931-b41d-b7c103006919', '0.2', 'Formulário boas-vindas', 'completed'),
  ('3bdf74f3-415d-44fd-8db0-4bafb7c8a322', '9a2aaacd-6f11-4931-b41d-b7c103006919', '1.3', 'Cadastros', 'completed'),
  ('458be2d0-cc0e-4455-ae2e-1a776de78b46', '60476651-5c1f-4025-9539-16f9385fd826', '1.1', 'Instalação', 'not_started'),
  ('8d7f3bf3-1357-4b01-881f-693092bdfc6b', '60476651-5c1f-4025-9539-16f9385fd826', '1.2', 'Configurações', 'not_started'),
  ('fe94bd38-29d4-42be-a1a6-f90a6590438a', '60476651-5c1f-4025-9539-16f9385fd826', '1.3', 'Cadastros', 'not_started'),
  ('d1af0f27-d009-49d4-8a78-64425282ff5f', '60476651-5c1f-4025-9539-16f9385fd826', '1.4', 'Vendas', 'not_started'),
  ('093fbe51-2983-4187-b6fd-8c1e242262d3', '60476651-5c1f-4025-9539-16f9385fd826', '1.5', 'NF-e', 'not_started'),
  ('81db3ea1-11a5-475e-9641-822b465868f6', '60476651-5c1f-4025-9539-16f9385fd826', '1.6', 'Virada Vendas', 'not_started'),
  ('c6a532eb-48b9-4b2e-ba38-c0e2228c8085', '60476651-5c1f-4025-9539-16f9385fd826', '3.1', 'Cadastros Produção', 'not_started'),
  ('18c55763-0267-4e42-b06b-fc22be30cfb0', '60476651-5c1f-4025-9539-16f9385fd826', '3.2', 'Ficha Técnica', 'not_started'),
  ('6a585dfe-406e-4202-aecd-36409c5f5ef1', '60476651-5c1f-4025-9539-16f9385fd826', '3.3', 'Ordem Produção', 'not_started'),
  ('872f359a-dc58-4dad-aa4e-817abc537fb2', '60476651-5c1f-4025-9539-16f9385fd826', '3.4', 'Virada Produção', 'not_started'),
  ('29cffe46-17da-49d8-84f1-1b0e211bb6ba', '60476651-5c1f-4025-9539-16f9385fd826', '3.5', 'Faccionistas', 'not_started'),
  ('1e1a838c-2823-49f2-98b6-f9cea2eae1d7', '60476651-5c1f-4025-9539-16f9385fd826', '3.6', 'Controle Estoque', 'not_started'),
  ('ecc9c1d2-0650-4bc3-b870-66df1ecdfcc4', '60476651-5c1f-4025-9539-16f9385fd826', '0.3', 'Alinhamento', 'completed'),
  ('72a3b070-1178-45cd-896d-89993e25ace0', '60476651-5c1f-4025-9539-16f9385fd826', '0.4', 'Planilha Enviada', 'completed'),
  ('7d969590-986b-4e80-8537-baa5762e9a20', '60476651-5c1f-4025-9539-16f9385fd826', '0.5', 'Planilha Devolvida', 'not_started'),
  ('ea2cd124-c2c3-4921-9241-334be2d6cc33', '60476651-5c1f-4025-9539-16f9385fd826', '0.6', 'Cronograma', 'not_started'),
  ('4713da09-4e1c-45e6-8ee2-3333ab8c9c67', '60476651-5c1f-4025-9539-16f9385fd826', '2.1', 'Controle Financeiro', 'not_started'),
  ('b0eccae0-2a2f-44c3-8ff9-ac48b989007d', '60476651-5c1f-4025-9539-16f9385fd826', '2.2', 'Boletos', 'not_started'),
  ('40adbe6e-8fdd-4cac-9bb9-569159b3b096', '60476651-5c1f-4025-9539-16f9385fd826', '4.1', 'Fluxo de Caixa', 'not_started'),
  ('f256bda1-79e2-40ec-8686-e19eaa88bb32', '60476651-5c1f-4025-9539-16f9385fd826', '4.2', 'DRE', 'not_started'),
  ('06027cc0-7c65-4da9-bf5b-12c652e4538f', '60476651-5c1f-4025-9539-16f9385fd826', '4.3', 'Relatórios BI', 'not_started'),
  ('f23d8ea9-0850-432e-8430-45e1ee88c7e6', '60476651-5c1f-4025-9539-16f9385fd826', '4.4', 'Compras', 'not_started'),
  ('cfe0fae0-42c3-4fec-a59c-f99e406c4522', '60476651-5c1f-4025-9539-16f9385fd826', '0.1', 'Primeiro Contato', 'completed'),
  ('652e8283-9381-4e9b-9d30-a094f84a9661', '60476651-5c1f-4025-9539-16f9385fd826', '0.2', 'Formulário boas-vindas', 'completed'),
  ('923c8f37-1ed9-4e84-ab4d-102fd1ea712a', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', '0.2', 'Formulário boas-vindas', 'completed'),
  ('cc223f3a-89e5-49d6-8fc5-9b57868f8a92', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', '0.3', 'Alinhamento', 'completed'),
  ('a4e2178c-de07-4304-a8d0-8ffb16dc0ff3', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', '0.4', 'Planilha Enviada', 'completed'),
  ('950e17a1-6980-46e1-9c3e-c1f1cc36a420', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', '0.5', 'Planilha Devolvida', 'completed'),
  ('70e1fdb0-32f9-44bc-a765-c2fd56bef02e', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', '0.6', 'Cronograma', 'completed'),
  ('76b5658e-44b3-4d27-87f4-f870948e8338', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', '1.1', 'Instalação', 'completed'),
  ('887c8265-c0d2-4e92-b102-c846a857191c', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', '1.2', 'Configurações', 'not_started'),
  ('d3cffa86-944a-4e88-88d0-e62ee08b7aa3', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', '1.3', 'Cadastros', 'not_started'),
  ('90c131b8-6cc5-40d0-85e5-f9723a84270e', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', '1.4', 'Vendas', 'not_started'),
  ('0a9a50a1-fc1e-4371-9147-a9e0061871ad', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', '1.5', 'NF-e', 'not_started'),
  ('3e6dd2a5-a1dc-484f-a770-60c41e92ee05', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', '1.6', 'Virada Vendas', 'not_started'),
  ('9acda519-a4b8-452c-90d8-d176ba08138c', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', '1.7', 'AzVendas', 'not_started'),
  ('1ad838f4-1022-4c10-9dc1-be55ef0cf10e', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', '0.2', 'Formulário boas-vindas', 'completed'),
  ('4ae99feb-e37f-469e-be1e-36927bbd804f', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', '0.4', 'Planilha Enviada', 'completed'),
  ('ecb3667c-bc3f-425e-b44b-e292faf47456', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', '0.5', 'Planilha Devolvida', 'not_started'),
  ('a05e04fc-c633-4b39-94b9-5a453267dbce', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', '0.6', 'Cronograma', 'not_started'),
  ('b389f2f1-04fb-45aa-a714-edff1495c8bd', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', '2.1', 'Controle Financeiro', 'not_started'),
  ('06410db3-edb6-4196-a5ce-26a3c16c5753', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', '2.2', 'Boletos', 'not_started'),
  ('60c91658-5ea0-4391-837d-2aad7603baf0', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', '4.1', 'Fluxo de Caixa', 'not_started'),
  ('1f99fd3f-6f7c-4a85-a8bf-1ce931039aa9', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', '4.2', 'DRE', 'not_started'),
  ('5da76d3c-54af-4592-9e7c-995c8d7e7a5d', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', '4.3', 'Relatórios BI', 'not_started'),
  ('e5eff9a3-0176-4d81-be15-9230fff0395a', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', '4.4', 'Compras', 'not_started'),
  ('61f1adf3-1372-4974-908e-138bebc0393b', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', '1.1', 'Instalação', 'not_started'),
  ('9d0fffba-9d23-45cd-a0d7-1f7a6e5d7ba9', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', '1.2', 'Configurações', 'not_started'),
  ('910d6421-0477-44bc-acfd-93e53f8853b4', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', '1.3', 'Cadastros', 'not_started'),
  ('d00beede-9771-456c-acdf-0687a1a88e28', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', '1.4', 'Vendas', 'not_started'),
  ('254c35a8-f2b1-47fb-910c-2f037fc5a2e0', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', '1.5', 'NF-e', 'not_started'),
  ('d306c46e-64b1-42a0-9031-f7e46bc5773e', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', '1.6', 'Virada Vendas', 'not_started'),
  ('d2ed4994-bfd3-4621-ae78-038b486468ad', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', '3.1', 'Cadastros Produção', 'not_started'),
  ('5cf32dc8-143c-40f3-8d14-ac33e7fa2aa2', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', '3.2', 'Ficha Técnica', 'not_started'),
  ('46781569-23da-4c89-b5e8-f1de380bb011', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', '3.3', 'Ordem Produção', 'not_started'),
  ('24cf4f92-1172-4e02-897e-7ab30e1ee61d', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', '3.4', 'Virada Produção', 'not_started'),
  ('7dd73dc0-abff-4106-b45f-9d51223d4edf', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', '3.5', 'Faccionistas', 'not_started'),
  ('77c18242-b271-4625-8ab8-f33c584ab9f4', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', '3.6', 'Controle Estoque', 'not_started'),
  ('047b72c8-ab65-4da9-820b-f33776874b90', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', '0.1', 'Primeiro Contato', 'completed'),
  ('1236df8e-e247-439c-b32f-6def6aefa797', 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', '0.3', 'Alinhamento', 'completed'),
  ('3f32574e-e8ee-43e1-9128-f223c928af66', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', '1.8', 'E-commerce', 'not_started'),
  ('6df4dcc9-2994-4948-b1d1-5125679a98b6', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', '2.1', 'Controle Financeiro', 'not_started'),
  ('3cc07e29-0a45-4511-b997-41893eb8f77f', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', '2.2', 'Boletos', 'not_started'),
  ('3046e836-a385-4d44-82a2-c51cafe0f3eb', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', '2.3', 'Controle de Cheque', 'not_started'),
  ('ea72f2a1-2a59-4ed9-bc6e-97667e20e819', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', '3.1', 'Cadastros Produção', 'not_started'),
  ('bd6ff586-5ad3-426f-be20-318ffcc34823', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', '3.2', 'Ficha Técnica', 'not_started'),
  ('e6c0801b-79f0-4081-be6a-377c0e9df827', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', '3.3', 'Ordem Produção', 'not_started'),
  ('79effbcf-c089-41b8-a238-f2f70b89bdab', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', '3.4', 'Virada Produção', 'not_started'),
  ('f27a4b87-33d2-4a27-8fa7-79deedb6e55d', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', '3.5', 'Faccionistas', 'not_started'),
  ('066098ad-9676-4ffd-9955-779f6f11befd', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', '3.6', 'Controle Estoque', 'not_started'),
  ('d70676ee-4207-4330-8b57-1e94b461a86a', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', '4.1', 'Fluxo de Caixa', 'not_started'),
  ('c498dced-d1aa-431e-973f-4057f039090d', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', '4.2', 'DRE', 'not_started'),
  ('f46de1d8-6b85-476a-a886-5a0a12f8cdca', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', '4.3', 'Relatórios BI', 'not_started'),
  ('52543990-b8ed-45a7-8fe8-55250b56c938', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', '4.4', 'Compras', 'not_started'),
  ('89ae5207-e702-418b-8c75-dd0f008960f3', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', '4.5', 'Integração Correios', 'not_started'),
  ('a834e4ab-b00f-4ced-b6dc-96e0b912b089', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', '4.6', 'Finalização', 'not_started'),
  ('908af3c2-8275-469b-a390-f22debcb03e1', '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', '0.1', 'Primeiro Contato', 'completed'),
  ('9d5e828c-70b9-4792-b3aa-fb4ebf0ab415', 'dccf443e-93c7-4008-bed6-959515e6114f', '0.5', 'Planilha Devolvida', 'completed'),
  ('4bb8fb3b-a554-4e6d-b668-198122b8a15a', 'dccf443e-93c7-4008-bed6-959515e6114f', '0.6', 'Cronograma', 'completed'),
  ('72ac0013-afbe-4d09-b59b-e72b31f23314', 'dccf443e-93c7-4008-bed6-959515e6114f', '1.1', 'Instalação', 'completed'),
  ('d6ab5f80-103c-455c-b6eb-ef194a83bde4', 'dccf443e-93c7-4008-bed6-959515e6114f', '1.2', 'Configurações', 'completed'),
  ('aa96a9da-dd68-47f4-b4ba-a1fcfab02aa4', 'dccf443e-93c7-4008-bed6-959515e6114f', '1.3', 'Cadastros', 'completed'),
  ('617f012d-60c2-445a-8f10-f89fbe8bddc7', 'dccf443e-93c7-4008-bed6-959515e6114f', '1.4', 'Vendas', 'completed'),
  ('07b1877f-395b-4edc-b4b0-4c4df6772fb8', 'dccf443e-93c7-4008-bed6-959515e6114f', '1.5', 'NF-e', 'completed'),
  ('7cd18a44-6755-48f9-9912-5d4562f6ce01', 'dccf443e-93c7-4008-bed6-959515e6114f', '1.6', 'Virada Vendas', 'not_started'),
  ('9985e916-7897-46bb-982c-6c113efc434a', 'dccf443e-93c7-4008-bed6-959515e6114f', '2.1', 'Controle Financeiro', 'not_started'),
  ('291874b3-34c7-45be-a914-d71731cdc719', 'dccf443e-93c7-4008-bed6-959515e6114f', '2.2', 'Boletos', 'not_started'),
  ('3ff699d2-1ba9-4ba0-b724-2954f7db61c8', 'dccf443e-93c7-4008-bed6-959515e6114f', '2.3', 'Controle de Cheque', 'not_started'),
  ('f2319872-99a0-468f-8d66-6f084e45030b', 'dccf443e-93c7-4008-bed6-959515e6114f', '3.1', 'Cadastros Produção', 'not_started'),
  ('351c22cf-e35e-4639-a2a6-4628cd12d348', 'dccf443e-93c7-4008-bed6-959515e6114f', '3.2', 'Ficha Técnica', 'not_started'),
  ('907b03ee-dcd2-48d1-bffd-478f1b1ef9f3', 'dccf443e-93c7-4008-bed6-959515e6114f', '3.3', 'Ordem Produção', 'not_started'),
  ('216fa756-2d09-48f3-929d-8b4644400368', 'dccf443e-93c7-4008-bed6-959515e6114f', '3.4', 'Virada Produção', 'not_started'),
  ('810ea0c1-2ff6-4763-8834-1c6b643fae7c', 'aa7deed2-435e-4f36-a85f-06e1023ba1de', '3.1', 'Cadastros Produção', 'not_started'),
  ('c8d00b17-c099-49f9-bb4e-40a66c2717de', 'aa7deed2-435e-4f36-a85f-06e1023ba1de', '3.2', 'Ficha Técnica', 'not_started'),
  ('8d0e371c-e3c2-43e8-a2c0-1cb95702b3ba', 'aa7deed2-435e-4f36-a85f-06e1023ba1de', '3.3', 'Ordem Produção', 'not_started'),
  ('a3f4a4ce-e37b-482c-8920-5e10df4e5bc5', 'aa7deed2-435e-4f36-a85f-06e1023ba1de', '3.4', 'Virada Produção', 'not_started'),
  ('5e22dc07-d18e-4610-88a9-64f0f58c29ef', 'aa7deed2-435e-4f36-a85f-06e1023ba1de', '0.1', 'Primeiro Contato', 'completed'),
  ('a2ca8061-892a-4bdd-a161-df7f0523f34f', 'aa7deed2-435e-4f36-a85f-06e1023ba1de', '0.3', 'Alinhamento', 'not_started'),
  ('c1b00f30-9ef4-46bf-8165-d02e8b619748', 'aa7deed2-435e-4f36-a85f-06e1023ba1de', '0.4', 'Planilha Enviada', 'completed'),
  ('d395423a-c617-40d4-b1a3-746b8e6bc7eb', 'aa7deed2-435e-4f36-a85f-06e1023ba1de', '0.5', 'Planilha Devolvida', 'completed'),
  ('a57b6d8a-7b38-4886-818f-b001396f9ae0', 'aa7deed2-435e-4f36-a85f-06e1023ba1de', '0.6', 'Cronograma', 'not_started'),
  ('3a5d5f4c-7647-4cbb-bdca-48161b41460a', 'aa7deed2-435e-4f36-a85f-06e1023ba1de', '0.2', 'Formulário boas-vindas', 'completed'),
  ('3e7068e4-d918-4125-8325-31a0c9f539ea', 'aa7deed2-435e-4f36-a85f-06e1023ba1de', '1.1', 'Instalação', 'not_started'),
  ('90263b7f-e94f-435e-9651-e2f41f2104a1', 'aa7deed2-435e-4f36-a85f-06e1023ba1de', '1.2', 'Configurações', 'not_started'),
  ('feb69ca6-34e1-474b-9fa0-61884fea566a', 'aa7deed2-435e-4f36-a85f-06e1023ba1de', '1.3', 'Cadastros', 'not_started'),
  ('625d5bf0-a14a-480f-b9d7-b5ad3a6a0866', 'aa7deed2-435e-4f36-a85f-06e1023ba1de', '1.4', 'Vendas', 'not_started'),
  ('236a0105-b2a6-4b78-a87b-ac956f7038f6', 'aa7deed2-435e-4f36-a85f-06e1023ba1de', '1.5', 'NF-e', 'not_started'),
  ('e21a9e79-d681-41f1-ae64-4d3124135c93', 'aa7deed2-435e-4f36-a85f-06e1023ba1de', '1.6', 'Virada Vendas', 'not_started'),
  ('5d2626a2-4a58-4b8f-b770-35455529082b', 'aa7deed2-435e-4f36-a85f-06e1023ba1de', '2.1', 'Controle Financeiro', 'not_started'),
  ('bf940bf0-19c4-44af-9c27-c1e0223cb99d', 'aa7deed2-435e-4f36-a85f-06e1023ba1de', '2.2', 'Boletos', 'not_started'),
  ('7e8feabe-736c-43b5-bbbd-567c73e8db74', 'aa7deed2-435e-4f36-a85f-06e1023ba1de', '2.3', 'Controle de Cheque', 'not_started'),
  ('b1f66301-f466-4414-8dd9-17b5b385aa87', '66792e18-6327-421f-a82e-ebb6803ca1b0', '0.1', 'Primeiro Contato', 'completed'),
  ('501b3bf7-25f9-4db8-b574-bb2495861988', '66792e18-6327-421f-a82e-ebb6803ca1b0', '0.2', 'Formulário boas-vindas', 'completed'),
  ('6a45191c-6397-49dd-979e-3f5d97d0d488', '66792e18-6327-421f-a82e-ebb6803ca1b0', '0.3', 'Alinhamento', 'completed'),
  ('82ddc6cf-6335-4d0c-b2d3-0dd93e056a08', '66792e18-6327-421f-a82e-ebb6803ca1b0', '0.4', 'Planilha Enviada', 'completed'),
  ('c891c3bd-17f7-467b-b6e5-bc40ce0afdd5', '66792e18-6327-421f-a82e-ebb6803ca1b0', '0.5', 'Planilha Devolvida', 'completed'),
  ('13b054ab-4fe5-4968-a214-df1721a8ddfe', '66792e18-6327-421f-a82e-ebb6803ca1b0', '0.6', 'Cronograma', 'completed'),
  ('5a0e4766-4458-4177-a76f-14671bb081e8', '66792e18-6327-421f-a82e-ebb6803ca1b0', '1.1', 'Instalação', 'completed'),
  ('b67a9888-d908-4498-bec6-cf02bdf3f251', '66792e18-6327-421f-a82e-ebb6803ca1b0', '1.2', 'Configurações', 'completed'),
  ('a1aef001-0159-4618-a42e-11ba69aa711d', '66792e18-6327-421f-a82e-ebb6803ca1b0', '1.4', 'Vendas', 'completed'),
  ('5f75fed8-64c8-48fa-b529-a33bdee1da6a', '66792e18-6327-421f-a82e-ebb6803ca1b0', '1.5', 'NF-e', 'not_started'),
  ('a8d3ee55-16b2-44c6-8250-fd496b1ae4af', '66792e18-6327-421f-a82e-ebb6803ca1b0', '1.6', 'Virada Vendas', 'not_started'),
  ('a5d1eb9a-eb9f-40f0-9282-44cf88feee35', '66792e18-6327-421f-a82e-ebb6803ca1b0', '2.1', 'Controle Financeiro', 'not_started'),
  ('ca2445d1-5f48-447e-a741-cc29d2cc20b0', '66792e18-6327-421f-a82e-ebb6803ca1b0', '2.2', 'Boletos', 'not_started'),
  ('680b3ec3-00a5-4efb-8a99-b3dc4f75b39b', '66792e18-6327-421f-a82e-ebb6803ca1b0', '3.1', 'Cadastros Produção', 'not_started'),
  ('d40b4ebe-0960-4457-a587-0505c7b03e3d', '66792e18-6327-421f-a82e-ebb6803ca1b0', '3.2', 'Ficha Técnica', 'not_started'),
  ('3a8d8e36-b94b-4cff-bb02-e1e186a353bd', '66792e18-6327-421f-a82e-ebb6803ca1b0', '3.3', 'Ordem Produção', 'not_started'),
  ('23471692-b7de-4f38-91fb-7409ad786067', '66792e18-6327-421f-a82e-ebb6803ca1b0', '3.4', 'Virada Produção', 'not_started'),
  ('91a6fb75-02da-4f44-852f-0b9bc1895860', '66792e18-6327-421f-a82e-ebb6803ca1b0', '3.5', 'Faccionistas', 'not_started'),
  ('015d7a97-c32a-4c21-8632-586708c3b664', '66792e18-6327-421f-a82e-ebb6803ca1b0', '3.6', 'Controle Estoque', 'not_started'),
  ('4d26363d-345e-4274-a5b9-7de7de338cb8', '66792e18-6327-421f-a82e-ebb6803ca1b0', '4.1', 'Fluxo de Caixa', 'not_started'),
  ('599af98e-9b5d-43e6-a6db-49daf60a18e3', '66792e18-6327-421f-a82e-ebb6803ca1b0', '4.2', 'DRE', 'not_started'),
  ('b46749cb-38d0-431c-9199-5452c6aa6cc0', '66792e18-6327-421f-a82e-ebb6803ca1b0', '4.3', 'Relatórios BI', 'not_started'),
  ('6140c11e-ff41-4545-bc7a-891e493ad602', '66792e18-6327-421f-a82e-ebb6803ca1b0', '4.4', 'Compras', 'not_started'),
  ('588faea9-6d18-4ccc-8345-79b6a01fd3d3', '66792e18-6327-421f-a82e-ebb6803ca1b0', '1.3', 'Cadastros', 'completed'),
  ('972a24e3-f634-4c97-965c-23dfcbb67fd7', '04400921-5e52-4bad-bc05-7bef132b8894', '0.1', 'Primeiro Contato', 'completed'),
  ('a86ab38c-f84a-407f-90f1-b13685a08e90', '04400921-5e52-4bad-bc05-7bef132b8894', '0.2', 'Formulário boas-vindas', 'completed'),
  ('3433355a-efe7-44cc-998a-16e2a0470530', '04400921-5e52-4bad-bc05-7bef132b8894', '0.3', 'Alinhamento', 'completed'),
  ('60e6a9f9-9924-4f64-89a5-dd6af172772f', '04400921-5e52-4bad-bc05-7bef132b8894', '0.4', 'Planilha Enviada', 'completed'),
  ('5566117c-3237-4ab7-bb99-15567b6127ff', '04400921-5e52-4bad-bc05-7bef132b8894', '0.5', 'Planilha Devolvida', 'completed'),
  ('01bbf39f-c048-4317-9caf-ed31bbfdf23c', '04400921-5e52-4bad-bc05-7bef132b8894', '0.6', 'Cronograma', 'completed'),
  ('617e38ec-dc31-4b6f-a395-5d8c450d626a', '04400921-5e52-4bad-bc05-7bef132b8894', '2.1', 'Controle Financeiro', 'not_started'),
  ('f2b1678a-0d4a-4c3d-8834-4a416c9abc89', '04400921-5e52-4bad-bc05-7bef132b8894', '2.2', 'Boletos', 'not_started'),
  ('1f8bd020-09d0-449f-845b-9f95a2880476', '04400921-5e52-4bad-bc05-7bef132b8894', '2.3', 'Controle de Cheque', 'not_started'),
  ('930c60ee-2b02-4569-9f80-ccefb84debef', '04400921-5e52-4bad-bc05-7bef132b8894', '1.1', 'Instalação', 'completed'),
  ('bc386cba-0e00-453f-acc3-8720bdb38967', '04400921-5e52-4bad-bc05-7bef132b8894', '1.2', 'Configurações', 'not_started'),
  ('d8654c02-f9a2-4592-959b-595578356453', '04400921-5e52-4bad-bc05-7bef132b8894', '1.3', 'Cadastros', 'not_started'),
  ('3b1195aa-5623-4ec6-be01-f519b3db8b02', '04400921-5e52-4bad-bc05-7bef132b8894', '1.4', 'Vendas', 'not_started'),
  ('34adb2c9-4ab2-40db-b004-8b78ad184c75', '04400921-5e52-4bad-bc05-7bef132b8894', '1.5', 'NF-e', 'not_started'),
  ('aafcd5db-1757-420a-b782-17791f3ccc6b', '04400921-5e52-4bad-bc05-7bef132b8894', '1.6', 'Virada Vendas', 'not_started'),
  ('e4df0500-d486-4fbd-9d22-909016a6a9da', '04400921-5e52-4bad-bc05-7bef132b8894', '3.1', 'Cadastros Produção', 'not_started'),
  ('c220171e-2748-41a4-868d-544c252d6f6d', '04400921-5e52-4bad-bc05-7bef132b8894', '3.2', 'Ficha Técnica', 'not_started'),
  ('75a624ad-588c-4e78-bbbd-ab4ffbdb1693', '04400921-5e52-4bad-bc05-7bef132b8894', '3.3', 'Ordem Produção', 'not_started'),
  ('f5a34bb8-35f7-433d-b71b-e2d9505296d5', '04400921-5e52-4bad-bc05-7bef132b8894', '3.4', 'Virada Produção', 'not_started'),
  ('d8305403-1062-4d1d-af2a-35e005378a22', 'eedf5d41-73cc-4283-9f51-02152efab15e', '0.6', 'Cronograma', 'completed'),
  ('471f2dfa-7283-4188-b8a2-dc162bde9df2', 'eedf5d41-73cc-4283-9f51-02152efab15e', '0.1', 'Primeiro Contato', 'completed'),
  ('0635db55-c5a5-4944-9cd5-28aa9433d94f', 'eedf5d41-73cc-4283-9f51-02152efab15e', '0.2', 'Formulário boas-vindas', 'completed'),
  ('86fa89bd-44bc-47a0-a83b-ddb4a7ee7ba7', 'eedf5d41-73cc-4283-9f51-02152efab15e', '0.3', 'Alinhamento', 'completed'),
  ('935882e9-6862-4e51-88bc-68829a9245c7', 'eedf5d41-73cc-4283-9f51-02152efab15e', '0.4', 'Planilha Enviada', 'completed'),
  ('dee12b80-e9d4-4ec0-9127-5968b4ec449c', 'eedf5d41-73cc-4283-9f51-02152efab15e', '0.5', 'Planilha Devolvida', 'completed'),
  ('9137ccb9-e9e3-4da7-8095-66a84f3c4586', 'eedf5d41-73cc-4283-9f51-02152efab15e', '1.1', 'Instalação', 'completed'),
  ('9fb9aa6c-fdf5-4415-adab-99e70c4130f7', 'eedf5d41-73cc-4283-9f51-02152efab15e', '1.2', 'Configurações', 'completed'),
  ('cd8a8457-8fc5-4f59-b343-c2049ce469b3', 'eedf5d41-73cc-4283-9f51-02152efab15e', '1.3', 'Cadastros', 'completed'),
  ('d14fa972-6ec8-4343-9336-9dc8f9b10d81', 'eedf5d41-73cc-4283-9f51-02152efab15e', '1.4', 'Vendas', 'completed'),
  ('37708eca-bb81-4c01-b469-2fc1862d83eb', 'eedf5d41-73cc-4283-9f51-02152efab15e', '1.5', 'NF-e', 'completed'),
  ('daf6cdd8-1697-4732-8f13-ec4ea7166974', 'eedf5d41-73cc-4283-9f51-02152efab15e', '1.6', 'Virada Vendas', 'completed'),
  ('6b24c69b-42a4-4a3a-b28b-67171315915a', 'eedf5d41-73cc-4283-9f51-02152efab15e', '2.1', 'Controle Financeiro', 'not_started'),
  ('a4037c14-63a1-4afe-bd2d-33faca42c816', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', '0.3', 'Alinhamento', 'completed'),
  ('0a7e6301-f16a-45f6-8331-a35aec42109e', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', '0.4', 'Planilha Enviada', 'completed'),
  ('77f15cef-2112-40d4-bdb5-1d0a24652d75', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', '0.5', 'Planilha Devolvida', 'completed'),
  ('e21a22c2-8550-4683-9474-e4da32bd3ad7', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', '0.6', 'Cronograma', 'not_started'),
  ('62b58f6b-0b52-460b-8b55-10234ef319de', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', '0.1', 'Primeiro Contato', 'completed'),
  ('45fe6124-5585-4ee4-8a4d-b8f7e8a6bea9', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', '1.1', 'Instalação', 'not_started'),
  ('96e4bf51-523d-4985-8b5d-be90c2883f64', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', '1.2', 'Configurações', 'not_started'),
  ('278095df-a67c-4c06-ad50-eb15d41e06f1', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', '1.3', 'Cadastros', 'not_started'),
  ('05e99ff8-3d9b-4d2f-a6ab-a202992226d7', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', '1.4', 'Vendas', 'not_started'),
  ('5a833313-ce80-4cbd-8851-d0e77d500d35', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', '1.5', 'NF-e', 'not_started'),
  ('9d56834c-3f5b-43e4-924e-428f89c82406', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', '1.6', 'Virada Vendas', 'not_started'),
  ('fc61281d-e7c8-491a-ac80-b07e9d66bfaa', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', '2.1', 'Controle Financeiro', 'not_started'),
  ('8d9d472d-e7d9-44ef-a95f-7dc5daae1955', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', '2.2', 'Boletos', 'not_started'),
  ('ab2f1283-b6cf-472a-93a2-801bd893d098', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', '3.1', 'Cadastros Produção', 'not_started'),
  ('96e812c8-16bb-4077-8473-c2fd9f7f77f6', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', '3.2', 'Ficha Técnica', 'not_started'),
  ('1dfcdcf9-6ed7-49ba-9a73-8e4ae1c90da7', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', '3.3', 'Ordem Produção', 'not_started'),
  ('385c06e5-56c1-4778-9444-577160e1dde9', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', '3.4', 'Virada Produção', 'not_started'),
  ('685920d2-de6e-4081-a9a1-f789b9a59cb9', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', '3.5', 'Faccionistas', 'not_started'),
  ('db433049-c8be-4af0-abbc-ff445d35806b', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', '3.6', 'Controle Estoque', 'not_started'),
  ('52715b93-f749-4ed7-9c8a-b2f803e4e161', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', '4.1', 'Fluxo de Caixa', 'not_started'),
  ('74caa457-7f5c-42e6-8734-66cd37db60fb', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', '4.2', 'DRE', 'not_started'),
  ('56a63884-636d-4040-a57c-1d0a51dfb9cc', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', '4.3', 'Relatórios BI', 'not_started'),
  ('d2a4833a-0c34-4dea-90a0-c7b1b140ddff', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', '4.4', 'Compras', 'not_started'),
  ('de9975cd-5abb-42f4-b647-1d94f97191e3', '98ca6e79-403d-40ab-b58f-8c4b319f3d29', '0.2', 'Formulário boas-vindas', 'completed'),
  ('42477ddb-d9d8-4da1-9d46-b072edc11129', 'eedf5d41-73cc-4283-9f51-02152efab15e', '2.2', 'Boletos', 'not_started'),
  ('7375f10e-3118-4a66-a3d9-be7e1ec90428', 'eedf5d41-73cc-4283-9f51-02152efab15e', '3.1', 'Cadastros Produção', 'not_started'),
  ('08c3345d-346d-4ba2-ace2-f933289a5b4b', 'eedf5d41-73cc-4283-9f51-02152efab15e', '3.2', 'Ficha Técnica', 'not_started'),
  ('bed2e9da-5de1-4422-a6ff-82460c1e3826', 'eedf5d41-73cc-4283-9f51-02152efab15e', '3.3', 'Ordem Produção', 'not_started'),
  ('66aeac1f-ac1a-476d-8cd8-3e80785f2f22', 'eedf5d41-73cc-4283-9f51-02152efab15e', '3.4', 'Virada Produção', 'not_started'),
  ('4a441781-cd94-4150-ad2c-5b6fa6948ccc', 'eedf5d41-73cc-4283-9f51-02152efab15e', '3.5', 'Faccionistas', 'not_started'),
  ('b21a81f1-4bda-4dfa-a2d1-182b8e9fb613', 'eedf5d41-73cc-4283-9f51-02152efab15e', '3.6', 'Controle Estoque', 'not_started'),
  ('f7516468-46f0-4e6f-b5e7-8368afc03a4b', 'eedf5d41-73cc-4283-9f51-02152efab15e', '4.1', 'Fluxo de Caixa', 'not_started'),
  ('cc382af5-da3f-4db8-8c99-291e0bbdab62', 'eedf5d41-73cc-4283-9f51-02152efab15e', '4.2', 'DRE', 'not_started'),
  ('c65b5f7f-cfe5-4a3b-8c30-8d4d46cf1f96', 'eedf5d41-73cc-4283-9f51-02152efab15e', '4.3', 'Relatórios BI', 'not_started'),
  ('9f909745-c1bf-4911-b62f-40a7424e21ae', 'eedf5d41-73cc-4283-9f51-02152efab15e', '4.4', 'Compras', 'not_started'),
  ('979a73d3-9021-47d5-8b95-c261ec733e82', 'b63f3bf0-e2f1-4409-816a-98d43d435161', '0.1', 'Primeiro Contato', 'completed'),
  ('887e9887-86b1-4087-be58-65deb470efa1', 'b63f3bf0-e2f1-4409-816a-98d43d435161', '0.2', 'Formulário boas-vindas', 'completed'),
  ('963342f8-f969-4d78-9c41-7ba60b583210', 'b63f3bf0-e2f1-4409-816a-98d43d435161', '0.3', 'Alinhamento', 'completed'),
  ('abccebde-ed24-4ded-af02-a4dfa62ba4e4', 'b63f3bf0-e2f1-4409-816a-98d43d435161', '0.4', 'Planilha Enviada', 'completed'),
  ('c5fed9fb-b377-4b51-992e-118eaa1e42e9', 'b63f3bf0-e2f1-4409-816a-98d43d435161', '0.5', 'Planilha Devolvida', 'completed'),
  ('092970ad-e12c-4742-a596-9c8cd0512e1d', 'b63f3bf0-e2f1-4409-816a-98d43d435161', '0.6', 'Cronograma', 'completed'),
  ('8b7178b7-f53c-4eaf-a406-7f85df0ac1f7', 'b63f3bf0-e2f1-4409-816a-98d43d435161', '1.1', 'Instalação', 'completed'),
  ('38dbf1aa-1137-4f27-ba82-ab63605bde84', 'b63f3bf0-e2f1-4409-816a-98d43d435161', '1.2', 'Configurações', 'completed'),
  ('fd9367da-b081-4302-9261-e04bea612caf', 'b63f3bf0-e2f1-4409-816a-98d43d435161', '1.3', 'Cadastros', 'completed'),
  ('161d18ae-1792-47f8-aa75-67b73fe6f5e7', 'b63f3bf0-e2f1-4409-816a-98d43d435161', '1.4', 'Vendas', 'completed'),
  ('30d36e28-10d3-4138-ad43-18f6aed31b3f', 'b63f3bf0-e2f1-4409-816a-98d43d435161', '1.5', 'NF-e', 'completed'),
  ('6e8e2a50-3a31-4b0f-b197-78fdf5201512', 'b63f3bf0-e2f1-4409-816a-98d43d435161', '1.6', 'Virada Vendas', 'completed'),
  ('91e74579-60cc-4233-ad9b-bdc19f19ed44', 'b63f3bf0-e2f1-4409-816a-98d43d435161', '2.1', 'Controle Financeiro', 'not_started'),
  ('68c88be8-3de5-44f2-b29e-4240ac1da439', 'b63f3bf0-e2f1-4409-816a-98d43d435161', '2.2', 'Boletos', 'not_started'),
  ('e9d96cc9-8481-4d44-940d-fcb201b212d9', 'b63f3bf0-e2f1-4409-816a-98d43d435161', '3.1', 'Cadastros Produção', 'not_started'),
  ('249399ac-daa5-468e-91f5-828096c1cc95', 'b63f3bf0-e2f1-4409-816a-98d43d435161', '3.2', 'Ficha Técnica', 'not_started'),
  ('c2da91aa-8ac7-4cb2-8193-bf909f3cd487', 'b63f3bf0-e2f1-4409-816a-98d43d435161', '3.3', 'Ordem Produção', 'not_started'),
  ('80adf82e-df89-4e19-8793-b2aefa578669', 'b63f3bf0-e2f1-4409-816a-98d43d435161', '3.4', 'Virada Produção', 'not_started'),
  ('22bb3cef-8f39-458b-ba45-66d1f898bd9e', 'b63f3bf0-e2f1-4409-816a-98d43d435161', '3.5', 'Faccionistas', 'not_started'),
  ('8b24c0ce-ed5b-42d1-b838-8988513e3c82', 'b63f3bf0-e2f1-4409-816a-98d43d435161', '3.6', 'Controle Estoque', 'not_started'),
  ('e5a90495-2e82-4191-be93-74bd478af973', 'b63f3bf0-e2f1-4409-816a-98d43d435161', '4.1', 'Fluxo de Caixa', 'not_started'),
  ('87f94358-6c79-4b75-b46c-80778d3f7dd2', 'b63f3bf0-e2f1-4409-816a-98d43d435161', '4.2', 'DRE', 'not_started'),
  ('c55c1b72-c7db-4b34-8a6a-cad546b8ae41', 'b63f3bf0-e2f1-4409-816a-98d43d435161', '4.3', 'Relatórios BI', 'not_started'),
  ('d450aed8-406b-41ac-b1e4-264826ce7ee4', 'b63f3bf0-e2f1-4409-816a-98d43d435161', '4.4', 'Compras', 'not_started')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 12. COMMENTS (82 comentários)
-- ============================================================
INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('393cfd4d-fb64-4766-8530-b7741949dd5e', '📌 REBOOL CAMISARIA E UNIFORMES – Primeiro Contato | 📅 02/04/2026

🧾 Resumo
Realizado primeiro contato com os responsáveis Adriana e Francisco, com apresentação inicial, boas-vindas e alinhamento do próximo passo do projeto (Reunião de Alinhamento).

⚠️ Motivo/Contexto
Início do processo de implantação após contratação do sistema, com objetivo de orientar o cliente sobre as próximas etapas.

📅 Solicitação/Ação do Cliente
Cliente confirmou disponibilidade para realização da reunião
Informou indisponibilidade no período da manhã de segunda-feira (reunião interna das 10h às 11h)
Solicitou agendamento no período da tarde, preferencialmente na mesma data

✅ Alinhamento Realizado
Apresentação do responsável pela implantação (Vinícius)
Boas-vindas ao cliente
Explicação sobre a reunião de alinhamento (objetivo, formato online via Google Meet)
Envio do formulário de pré-alinhamento para levantamento inicial de informações

Agendamento da reunião:
06/04/2026 (segunda-feira)
16h00 às 17h00 (horário do cliente)

💰 Gestão de Horas
Não houve consumo de horas (contato inicial / onboarding)

👤 Responsáveis
Vinícius – Analista de Implantação
Adriana – Cliente
Francisco – Cliente

🚀 Próximos Passos
Cliente realizar preenchimento do formulário de pré-alinhamento
Realização da reunião de alinhamento na data agendada
Início do planejamento das fases de implantação', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), NULL, '7b687ba9-6627-4bd3-8414-7000009c304a', NULL, '2026-04-06 12:17:11.465628+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('dabbae09-84e7-4887-98d4-885a15ef3688', '📌 REBOOL CAMISARIA E UNIFORMES – Primeiro Contato | 📅 02/04/2026

🧾 Resumo
Realizado primeiro contato com os responsáveis Adriana e Francisco, com apresentação inicial, boas-vindas e alinhamento do próximo passo do projeto (Reunião de Alinhamento).

⚠️ Motivo/Contexto
Início do processo de implantação após contratação do sistema, com objetivo de orientar o cliente sobre as próximas etapas.

📅 Solicitação/Ação do Cliente
Cliente confirmou disponibilidade para realização da reunião
Informou indisponibilidade no período da manhã de segunda-feira (reunião interna das 10h às 11h)
Solicitou agendamento no período da tarde, preferencialmente na mesma data

✅ Alinhamento Realizado
Apresentação do responsável pela implantação (Vinícius)
Boas-vindas ao cliente
Explicação sobre a reunião de alinhamento (objetivo, formato online via Google Meet)
Envio do formulário de pré-alinhamento para levantamento inicial de informações

Agendamento da reunião:
06/04/2026 (segunda-feira)
16h00 às 17h00 (horário do cliente)

💰 Gestão de Horas
Não houve consumo de horas (contato inicial / onboarding)

👤 Responsáveis
Vinícius – Analista de Implantação
Adriana – Cliente
Francisco – Cliente

🚀 Próximos Passos
Cliente realizar preenchimento do formulário de pré-alinhamento
Realização da reunião de alinhamento na data agendada
Início do planejamento das fases de implantação', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), NULL, '7b687ba9-6627-4bd3-8414-7000009c304a', NULL, '2026-04-06 12:49:43.344808+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('ff6da7e1-ae8e-411d-b89b-735b27d7485e', '📌 REBOOL CAMISARIA E UNIFORMES

0.1. Primeiro Contato | 📅 02/04/2026

🧾 Resumo
Realizado primeiro contato com os responsáveis Adriana e Francisco, com apresentação inicial, boas-vindas e alinhamento do próximo passo do projeto (Reunião de Alinhamento).

⚠️ Motivo/Contexto
Início do processo de implantação após contratação do sistema, com objetivo de orientar o cliente sobre as próximas etapas.

📅 Solicitação/Ação do Cliente
Cliente confirmou disponibilidade para realização da reunião
Informou indisponibilidade no período da manhã de segunda-feira (reunião interna das 10h às 11h)
Solicitou agendamento no período da tarde, preferencialmente na mesma data

✅ Alinhamento Realizado
Apresentação do responsável pela implantação (Vinícius)
Boas-vindas ao cliente
Explicação sobre a reunião de alinhamento (objetivo, formato online via Google Meet)
Envio do formulário de pré-alinhamento para levantamento inicial de informações

Agendamento da reunião:
06/04/2026 (segunda-feira)
16h00 às 17h00 (horário do cliente)

💰 Gestão de Horas
Não houve consumo de horas (contato inicial / onboarding)

👤 Responsáveis
Vinícius – Analista de Implantação
Adriana – Cliente
Francisco – Cliente

🚀 Próximos Passos
Cliente realizar preenchimento do formulário de pré-alinhamento
Realização da reunião de alinhamento na data agendada
Início do planejamento das fases de implantação', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', NULL, NULL, '2026-04-06 12:50:51.246047+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('f0cd8d30-aede-4635-8d4e-4edae9038608', '📌 REBOOL CAMISARIA E UNIFORMES

0.2. Formulário de Boas-Vindas | 📅 02/04/2026

🧾 Resumo
Recebido formulário de boas-vindas com informações gerais da empresa, estrutura operacional, equipe e expectativas do projeto, permitindo direcionar o planejamento da implantação.

⚠️ Motivo/Contexto
Coleta de informações iniciais para entendimento do cenário atual do cliente, estrutura da empresa e definição da estratégia de implantação.

📅 Informações Gerais
Responsável pelo preenchimento: Francisco Rebouças
Empresa: Rebool Camisaria
Segmento: Fardamentos
Regime tributário: Não informado
Tempo de atuação: 15 anos

📦 Controles Atuais
Controle de estoque de produtos acabados: Não informado
Controle de estoque de matéria-prima: Não informado
Controle de produção: Não utiliza sistema atualmente

🏭 Estrutura de Produtos e Produção
Quantidade de produtos: mais de 100 modelos
Matéria-prima (tecidos/aviamentos): aproximadamente 20 tipos
Máquinas que utilizarão o sistema: 25

👥 Equipe e Acessos
Quantidade de usuários: 25

Principais funções identificadas:
Supervisão comercial, consultores, pós-venda, designers, financeiro, RH, impressor, bordado, estamparia, PCP, corte, supervisão e produção

(Definição detalhada de permissões deverá ser refinada durante a implantação)

📅 Organização da Implantação
Prazo estimado para devolução de planilhas: 5 dias
Disponibilidade para reuniões: todos os dias disponíveis

🎯 Expectativas do Projeto
Melhoria nos controles em geral
Implementação de travas e organização dos processos

🔄 Processo Atual da Empresa
Fluxo atual:
Orçamento → venda → ordem de produção → PCP → distribuição nos setores → corte/impressão → costura → serigrafia/estampa/bordado → costura final → expedição

⚠️ Pontos de Atenção
Cliente indicou existência de diversas particularidades no processo (“todos”), sendo necessário aprofundar no alinhamento

👤 Responsáveis
Produção: Sidimar
Comercial: Adriana
Responsável geral pelo projeto: Francisco', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', NULL, NULL, '2026-04-06 13:07:07.567686+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('65f8fbda-12c2-470f-bf41-90c6644893d0', '📌 MARANELLO UNIFORMES – PRIMEIRO CONTATO | 📅 02/04/2026

🧾 Resumo
Realizado o primeiro contato com o cliente Bruno, da Maranello Uniformes, com apresentação inicial e alinhamento dos próximos passos para início da implantação do sistema.

⚠ Motivo/Contexto
Início do processo de implantação, com necessidade de apresentação do fluxo, coleta de informações iniciais e agendamento da reunião de alinhamento.

📅 Solicitação/Ação do Cliente
• Confirmação do horário da reunião considerando o fuso horário (Brasília)
• Confirmação do agendamento da reunião de alinhamento
• Preenchimento do formulário de boas-vindas (pendente no momento do contato)

✅ Alinhamento Realizado
• Apresentação inicial realizada com sucesso
• Explicação sobre a reunião de alinhamento (Google Meet) e objetivo da etapa
• Envio do formulário de boas-vindas para preenchimento prévio
• Reunião de alinhamento agendada para:
→ 06/04/2026 das 16h00 às 17h00 (horário de Brasília)
• Cliente confirmou participação na reunião
• Reforçado que dúvidas no preenchimento do formulário podem ser enviadas via WhatsApp

💰 Gestão de Horas
• Não houve consumo de horas (etapa inicial / onboarding)

👤 Responsáveis
• Cliente: Bruno
• Azoup: Vinícius

🚀 Próximos Passos
• Cliente realizar preenchimento do formulário de boas-vindas
• Realização da reunião de alinhamento na data agendada
• Início do planejamento das etapas de implantação após alinhamento', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '60476651-5c1f-4025-9539-16f9385fd826', NULL, NULL, '2026-04-06 13:13:31.498434+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('4b0a8e6d-6323-4831-9c3b-00930ef7f418', '📌 MARANELLO UNIFORMES – FORMULÁRIO DE BOAS-VINDAS | 📅 02/04/2026

🧾 Resumo
Recebido o formulário de boas-vindas com informações iniciais da empresa, estrutura operacional, equipe e expectativas com a implantação do sistema.

⚠ Motivo/Contexto
Coleta de dados essenciais para planejamento da implantação, definição de escopo e organização dos treinamentos.

📋 Dados Gerais
• Responsável pelo preenchimento: João Gomes
• Empresa: Bigarella e Gomes LTDA (Maranello Uniformes)
• Segmento: Uniformes
• Tempo de atuação: 33 anos
• Regime tributário: (não informado)

📦 Controles Atuais
• Controle de estoque (produtos acabados): Sim
• Controle de estoque (matéria-prima): Sim
• Controle de produção: Realizado via planilhas Excel

🏭 Produtos, Matéria-Prima e Produção
• Quantidade de produtos: Aproximadamente 15 modelos
• Matéria-prima: ~15 aviamentos e 4 tipos de tecido
• Máquinas que utilizarão o sistema: 17

👥 Equipe e Acessos
• Usuários do sistema: 6 pessoas

• Acessos informados:

* Bruno Bigarella – Acesso total
* João – Acesso total
* Cibele – Acesso total
* Geovani – Cadastros e Vendas

📅 Organização da Implantação
• Prazo para envio da planilha de produtos: 5 dias
• Disponibilidade: Dias úteis (indisponível apenas aos finais de semana)

🎯 Expectativas com o Projeto
• Resolver problemas de gestão em geral
• Melhorar controle e organização dos processos internos

🔄 Processo Atual da Empresa
• Início com orçamento solicitado pelo cliente
• Envio para aprovação
• Conversão em pedido após aprovação
• Emissão de NF-e de entrada
• Geração de ordem de produção
• Cálculo de tecidos e aviamentos
• Ordem de corte
• Ordem para estamparia

⚠ Pontos de Atenção
• Formação do preço de venda (processo crítico informado pelo cliente)

👤 Responsáveis pelos Treinamentos
• Geral: Bruno e João
• Cadastros e Vendas: Geovani

👑 Responsável pelo Projeto
• Bruno

💰 Gestão de Horas
• Não houve consumo de horas (etapa inicial)

🚀 Próximos Passos
• Validar regime tributário da empresa
• Iniciar planejamento da reunião de alinhamento
• Aguardar envio da planilha de produtos
• Estruturar cronograma conforme necessidades levantadas', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '60476651-5c1f-4025-9539-16f9385fd826', NULL, NULL, '2026-04-06 13:15:35.190806+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('21a011a2-69a5-4218-82f9-22fdc6a27677', '📌 IVY WEAR – PRIMEIRO CONTATO | 📅 31/03/2026

🧾 Resumo
Realizado o primeiro contato com a cliente Evelyn, com apresentação inicial e agendamento da reunião de alinhamento para início do processo de implantação.

⚠ Motivo/Contexto
Início do processo de implantação, com necessidade de apresentação do fluxo, alinhamento inicial e definição da primeira reunião.

📅 Solicitação/Ação do Cliente
• Confirmação de disponibilidade para reunião de alinhamento
• Confirmação do agendamento na data sugerida

✅ Alinhamento Realizado
• Apresentação inicial realizada com sucesso
• Explicação sobre a reunião de alinhamento (Google Meet) e objetivo da etapa
• Reunião de alinhamento agendada para:
→ 06/04/2026 das 11h00 às 12h00
• Cliente confirmou participação na reunião
• Canal aberto para dúvidas e suporte inicial

💰 Gestão de Horas
• Não houve consumo de horas (etapa inicial / onboarding)

👤 Responsáveis
• Cliente: Evelyn
• Azoup: Vinícius

🚀 Próximos Passos
• Realização da reunião de alinhamento na data agendada
• Início do levantamento de informações e planejamento da implantação
• Condução das próximas etapas conforme cronograma definido após alinhamento', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '04400921-5e52-4bad-bc05-7bef132b8894', NULL, NULL, '2026-04-06 13:18:25.644046+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('d1e09ad7-9904-4802-9a23-08e0e3a7430e', '📌 IVY WEAR – FORMULÁRIO DE BOAS-VINDAS (BASE E-MAIL DO COMERCIAL AZOUP) | 📅 31/03/2026

🧾 Resumo
Cadastro inicial do cliente realizado com base nas informações encaminhadas pelo comercial Azoup, sem preenchimento de formulário padrão. Cliente enquadrado em modelo específico de implantação (Plano Basic diferenciado – 30h), com escopo definido conforme e-mail comercial.

⚠ Motivo/Contexto
Cliente ainda não possuía CNPJ no momento inicial, sendo o processo iniciado via CPF. Implantação estruturada com base nas informações comerciais, sem necessidade de envio de formulário de boas-vindas tradicional.

📋 Dados Gerais
• Nome Fantasia: Ivy Wear
• Razão Social: Ivy Wear Artigos Esportivos LTDA
• CNPJ: 66.033.803/0001-50
• IE: 165.800.146.115
• Responsável: Evelyn
• Contato: (19) 99225-6407
• Segmento: Loja de roupas fitness + café

📦 Modelo de Negócio / Estrutura
• Operação de loja física (varejo e possível atacado)
• Venda online via e-commerce
• Operação híbrida: loja + café
• Necessidade de separação de vendas (café x loja) dentro do mesmo banco de dados

⚙️ Sistema e Módulos Contratados
• PDV
• Estoque
• Financeiro (Contas a Pagar e Receber)
• NF-e (Emissão de Notas Fiscais)
• Integração com E-commerce
• Integração com Correios

🔗 Integrações
• E-commerce: Nuvemshop
• Observação: Cliente já possui direcionamento para uso da plataforma

📊 Controles Atuais
• Não informado (dados não coletados via formulário padrão)

👥 Equipe e Acessos
• Não informado (será levantado em reunião de alinhamento)

📅 Organização da Implantação
• Modelo: Plano Basic diferenciado
• Carga horária: 30 horas
• Escopo: Definido conforme módulos e necessidades descritas no e-mail comercial (não segue padrão completo do formulário)

🎯 Expectativas com o Projeto
• Estruturar operação de loja física + café
• Implantar controle de vendas, estoque e financeiro
• Viabilizar vendas online integradas ao sistema

⚠ Pontos de Atenção
• Separação correta das vendas entre loja e café
• Integração com e-commerce (Nuvemshop)
• Estrutura inicial sem CNPJ (já regularizado posteriormente)
• Definição de regras fiscais e operacionais para dois tipos de operação no mesmo ambiente

👤 Responsáveis
• Cliente: Evelyn
• Azoup: Vinícius

💰 Gestão de Horas
• Plano Basic diferenciado – 30h
• Escopo baseado nos módulos definidos pelo comercial

🚀 Próximos Passos
• Realizar reunião de alinhamento para levantamento complementar de informações
• Validar fluxos de operação (loja + café)
• Definir estrutura de cadastros e separação de vendas
• Iniciar implantação conforme escopo definido pelo comercial', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '04400921-5e52-4bad-bc05-7bef132b8894', NULL, NULL, '2026-04-06 13:21:10.684378+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('723b178f-a44d-4d88-b134-53de99b9bda4', '📌 INNOVARE CONFECÇÃO – PRIMEIRO CONTATO | 📅 27/03/2026

🧾 Resumo
Realizado o primeiro contato com a cliente Shirley, com apresentação inicial, envio do formulário de boas-vindas e agendamento da reunião de alinhamento.

⚠ Motivo/Contexto
Início do processo de implantação, com necessidade de alinhamento inicial, coleta de informações e definição da primeira reunião.

📅 Solicitação/Ação do Cliente
• Solicitação de ajuste de horário da reunião (preferência período da manhã)
• Confirmação de preenchimento do formulário de boas-vindas

✅ Alinhamento Realizado
• Apresentação inicial realizada com sucesso
• Explicação sobre a reunião de alinhamento (Google Meet) e objetivo da etapa
• Envio do formulário de boas-vindas para preenchimento prévio
• Ajuste de agenda conforme disponibilidade da cliente
• Reunião de alinhamento agendada para:
→ 01/04/2026 às 09h00
• Cliente confirmou participação e realizou o preenchimento do formulário
• Confirmação de recebimento do formulário realizada posteriormente

💰 Gestão de Horas
• Não houve consumo de horas (etapa inicial / onboarding)

👤 Responsáveis
• Cliente: Shirley
• Azoup: Vinícius

🚀 Próximos Passos
• Realização da reunião de alinhamento na data agendada
• Análise das informações enviadas no formulário
• Estruturação do plano de implantação conforme cenário do cliente', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '6eb273c1-4edd-4cdb-8e56-25235ba2d539', NULL, NULL, '2026-04-06 13:24:21.000683+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('d99635cc-0098-4647-8894-ca6dea10b0a8', '📌 CUMPLICE DA MODA – FORMULÁRIO DE BOAS-VINDAS | 📅 26/03/2026

🧾 Resumo
Coleta de informações iniciais da cliente para início do processo de implantação, com levantamento de estrutura atual, equipe, processos e expectativas.

⚠ Motivo/Contexto
Preenchimento do formulário de boas-vindas para entendimento do cenário atual da empresa e preparação da implantação.

📅 Dados Gerais

* Nome: Aparecida Cristiane Mulizini Magalhães dos Santos
* Empresa: Mulizini e Magalhães Confecções LTDA
* Segmento: Moda feminina
* Tempo de atuação: 19 anos

📦 Controles Atuais

* Controle de estoque (produtos acabados): Sim
* Controle de estoque (matéria-prima): Sim
* Controle de produção: Realizado via planilhas

🏭 Produtos, Matéria-Prima e Produção

* Produtos: Aproximadamente 100 modelos
* Matéria-prima: Cerca de 10 tipos de tecidos
* Máquinas: 6

👥 Equipe e Acessos

* Usuários do sistema: 5 pessoas
* Equipe:

  * Cristiane – Administração
  * Matheus – Financeiro e Cadastros
  * Elaine – Produção
  * Cirleide – Vendas
  * Dará – Vendas

📊 Organização da Implantação

* Prazo para envio da planilha: 10 dias
* Disponibilidade: Indisponível das 12:00 às 13:30

🎯 Expectativas com o Projeto

* Melhor organização geral da empresa

🔄 Processo Atual

* Produção baseada em pronta entrega
* Desenvolvimento de modelos → compra de tecidos → corte e costura terceirizados (faccionistas) → retorno para conferência e acabamento → envio para loja para venda

⚠ Particularidades

* Possui site com dificuldades operacionais (fluxo de vendas)

🎓 Treinamentos e Responsáveis

* Responsáveis por setor:

  * Cristiane – Administração
  * Elaine – Produção / Modelagem
  * Matheus – Financeiro e Cadastros

👤 Responsável pelo Projeto

* Matheus

🚀 Próximos Passos

* Utilizar informações levantadas para condução da reunião de alinhamento
* Definição do cronograma de implantação
* Início da Fase 01 – Vendas 🚀', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', NULL, NULL, '2026-04-06 13:44:01.227318+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('7e071f7e-0abb-4276-895e-cb63cb93ac5a', '📌 INNOVARE CONFECÇÃO – FORMULÁRIO DE BOAS-VINDAS | 📅 28/03/2026

🧾 Resumo
Recebido o formulário de boas-vindas com informações completas sobre a estrutura da empresa, operação atual, equipe e expectativas com a implantação do sistema.

⚠ Motivo/Contexto
Levantamento inicial de dados para planejamento da implantação, definição de escopo e organização dos treinamentos conforme realidade do cliente.

📋 Dados Gerais
• Responsável pelo preenchimento: Shirley Queiroz Perejon Salles
• Empresa: INNOVARE CONFECÇÃO DE ROUPAS LTDA
• Segmento: Uniformes para empresas e escolas
• Tempo de atuação: 20 anos (17 anos com CNPJ)
• Regime tributário: (não informado)

📦 Controles Atuais
• Controle de estoque (produtos acabados): Sim
• Controle de estoque (matéria-prima): Sim
• Controle de produção: Realizado via papéis e cadernos

🏭 Produtos, Matéria-Prima e Produção
• Quantidade de produtos: Mais de 2.000 modelos
• Matéria-prima: Mais de 500 tipos (tecidos e aviamentos)
• Equipamentos: 3 computadores e 4 notebooks

👥 Equipe e Acessos
• Usuários do sistema: 7 pessoas

• Acessos informados:

* Shirley – Acesso total
* Wellington e Débora – Cadastros de matéria-prima
* Isabella, Juliana, Roze e Lilian – Cadastros gerais e Vendas

📅 Organização da Implantação
• Prazo para envio da planilha de produtos: 10 a 15 dias
• Disponibilidade:

* Segunda e sexta: manhã indisponível
* Terça e quinta: tarde indisponível

🎯 Expectativas com o Projeto
• Tornar as vendas mais ágeis
• Melhorar controle de estoque geral
• Aumentar controle da produção
• Melhor gestão de estoque de matéria-prima

🔄 Processo Atual da Empresa
• Fluxo segue padrão: orçamento → aprovação → pedido → ordem de produção → produção → faturamento → NF-e

⚠ Pontos de Atenção
• Alto volume de produtos e matéria-prima (complexidade elevada)
• Processo atual não digitalizado (uso de papel/caderno)
• Necessidade de estruturação forte na parte de produção e estoque

👤 Responsáveis pelos Treinamentos
• Financeiro e cadastros (fábrica): Shirley e Isabella
• Cadastros loja e vendas: Roze, Juliana e Isabella

👑 Responsável pelo Projeto
• Shirley e Isabella (proprietária e filha)

💰 Gestão de Horas
• Não houve consumo de horas (etapa inicial)

🚀 Próximos Passos
• Planejar estrutura de implantação considerando alto volume de dados
• Definir estratégia para cadastro/importação de produtos e matéria-prima
• Realizar reunião de alinhamento com base nas informações levantadas
• Iniciar estruturação dos processos de produção no sistema', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '6eb273c1-4edd-4cdb-8e56-25235ba2d539', NULL, NULL, '2026-04-06 13:25:50.46124+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('0407cabc-cbb7-4b7b-a0e1-20a3191b7c3f', '📌 INNOVARE CONFECÇÃO – REUNIÃO DE ALINHAMENTO | 📅 01/04/2026

🧾 Resumo
Reunião inicial de alinhamento para apresentação do projeto de implantação, definição do plano contratado (MASTER – 70h), estrutura de comunicação e início da Fase 01 (Vendas). Também foram alinhados instalação, treinamentos e envio de planilhas para início do processo.

⚠️ Motivo/Contexto
Primeiro alinhamento oficial após fechamento do projeto, com objetivo de estruturar toda a implantação, definir responsabilidades, ferramentas e próximos passos.

📅 Solicitação/Ação do Cliente
• Participação na reunião de alinhamento
• Organização interna para início do projeto
• Disponibilização das máquinas para instalação
• Preenchimento da planilha de produtos

✅ Alinhamento Realizado
• Plano contratado: MASTER (70 horas de consultoria), com saldo remanescente utilizável futuramente
• Comunicação centralizada via grupo de WhatsApp (envio de links, dúvidas e materiais)
• Instalação do sistema via acesso remoto (TeamViewer)
• Validação técnica das máquinas antes do início
• Treinamentos realizados via Google Meet com apoio remoto na base do cliente

• Estrutura da implantação definida em 4 fases:

* Fase 01: Vendas (cadastros, pedidos, NF-e, uso inicial) → ~20 dias úteis
* Fase 02: Financeiro → ~5 dias úteis
* Fase 03: Produção → ~20 dias úteis
* Fase 04: Relatórios Gerenciais / BI

• Cadastro inicial de produtos será feito via planilha
• Orientação de iniciar com 3 a 5 produtos para validação antes da importação completa
• Campos principais obrigatórios: nome do produto e preço de venda
• NCM deve ser validado com a contabilidade
• Sistema pode gerar códigos internos automaticamente

• Cancelamentos devem ser informados com 24h de antecedência (impacto nas horas)
• Será disponibilizado controle de horas do projeto

💰 Gestão de Horas
• Plano MASTER: 70 horas totais
• Horas consumidas conforme agendas realizadas
• Horas não utilizadas permanecem disponíveis para uso futuro

👤 Responsáveis
• Shirley – Responsável principal pelo projeto
• Isabela – Apoio no processo e treinamentos
• Vinícius / Anderson – Implantação Azoup

🚀 Próximos Passos
• Criar grupo de WhatsApp e centralizar comunicação
• Enviar planilhas de cadastro (produtos, clientes, fornecedores)
• Instalar TeamViewer nas máquinas
• Preencher planilha de produtos (iniciar com 3 a 5 itens para validação)
• Após validação, finalizar preenchimento completo para importação
• Enviar orientações para configuração de boletos na Fase 02', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '6eb273c1-4edd-4cdb-8e56-25235ba2d539', NULL, NULL, '2026-04-06 13:31:27.502022+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('9c7e8903-06fb-496f-b374-06861b27ef42', '📌 INNOVARE CONFECÇÃO – ENVIO DE PLANILHAS | 📅 06/04/2026

🧾 Resumo
Envio das planilhas iniciais para preenchimento e início da etapa de cadastros no sistema, conforme alinhado em reunião.

⚠️ Motivo/Contexto
Dar início à estruturação dos cadastros (principalmente produtos), etapa essencial para avanço da Fase 01 – Vendas.

📅 Solicitação/Ação do Cliente
• Acessar as planilhas enviadas
• Iniciar o preenchimento dos dados
• Priorizar envio de alguns produtos para validação inicial

✅ Alinhamento Realizado
• Envio das planilhas mencionadas na reunião de alinhamento
• Compartilhamento da pasta com gravações das reuniões e treinamentos:
Link: https://drive.google.com/drive/folders/127pznUps8sXVw81_00UqXlKZ27e1qUqg?usp=sharing
• Orientação para utilização das planilhas como base de importação de dados

💰 Gestão de Horas
• Sem consumo de horas (atividade assíncrona)

👤 Responsáveis
• Shirley / Equipe INNOVARE – Preenchimento das planilhas
• Vinícius – Suporte e validação dos dados

🚀 Próximos Passos
• Preencher planilha com 3 a 5 produtos para validação inicial
• Após validação, finalizar preenchimento completo
• Retornar planilhas preenchidas para importação no sistema
• Seguir com agendamento dos próximos treinamentos da Fase 01', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '6eb273c1-4edd-4cdb-8e56-25235ba2d539', NULL, NULL, '2026-04-06 13:33:15.434812+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('ee212e1b-472e-44ee-be03-9df9ef77c8cb', '📌 LVT SPORTS – PRIMEIRO CONTATO | 📅 26/03/2026

🧾 Resumo
Realizado primeiro contato com o cliente, apresentação inicial e alinhamento sobre o próximo passo do projeto: Reunião de Alinhamento. Formulário de boas-vindas enviado e preenchido pelo cliente.

⚠️ Motivo/Contexto
Início do processo de implantação após entrada do cliente, com objetivo de estruturar agenda e coleta de informações iniciais.

📅 Solicitação/Ação do Cliente
• Preenchimento do formulário de boas-vindas
• Confirmação de disponibilidade para reunião de alinhamento

✅ Alinhamento Realizado
• Apresentação inicial do analista de implantação
• Explicação sobre a Reunião de Alinhamento (Google Meet)
• Envio do formulário de boas-vindas para coleta de informações
• Reunião de alinhamento agendada para:

* 📅 30/03/2026
* ⏰ 11h00 às 12h00

• Cliente confirmou participação na reunião
• Cliente retornou posteriormente informando formulário preenchido

💰 Gestão de Horas
• Sem consumo de horas

👤 Responsáveis
• Thyago – Responsável pelo preenchimento e participação inicial
• Vinícius – Analista de implantação

🚀 Próximos Passos
• Realização da reunião de alinhamento
• Análise das informações enviadas no formulário
• Início do planejamento da implantação conforme cenário do cliente', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '4e36cf11-9121-4441-adcb-73aa56992196', NULL, NULL, '2026-04-06 13:35:50.078442+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('036e0e66-e5ab-4d64-9688-0f9e395dd33a', '📌 MCE CONFECÇÕES – REUNIÃO DE ALINHAMENTO | 📅 30/03/2026

🧾 Resumo
Reunião de alinhamento inicial para apresentação do processo de implantação do sistema Azoup, definição da equipe responsável, plano contratado (30h) e estrutura de suporte técnico.

⚠ Motivo/Contexto
Início do projeto de implantação, com objetivo de alinhar metodologia, etapas, responsabilidades e próximos passos com a cliente.

📅 Alinhamento Realizado

• Equipe de Implantação

* Responsáveis: Vinícius e Anderson
* Comunicação centralizada via WhatsApp (mesmo número)
* Criação de grupo para envio de links, materiais e dúvidas

• Plano Contratado

* Plano Basic com 30 horas de consultoria
* Horas não utilizadas ficam disponíveis para uso futuro
* Possibilidade de contratação de horas adicionais, se necessário

• Suporte Técnico

* Disponível após implantação para demandas pontuais
* Exemplo: certificado digital, ajustes técnicos

💻 Instalação e Ambiente

* Instalação será realizada remotamente via TeamViewer
* Verificação técnica das máquinas (memória, desempenho e internet)
* Sistema funciona em ambiente Windows
* Base de dados em nuvem (dependente de internet)

🎓 Treinamentos

* Realizados via Google Meet
* Reuniões gravadas e disponibilizadas em drive
* Acesso remoto via TeamViewer durante treinamentos
* Cancelamentos devem ser informados com 24h de antecedência

📦 Importação de Dados (Planilha)

* Será enviada planilha para cadastro de produtos

* Campos obrigatórios:
  • Descrição
  • Unidade
  • NCM

* Campos opcionais:
  • Código interno
  • Código de barras
  • Preço de custo (recomendado inserir média)

* Orientações:
  • Preencher inicialmente 3 a 5 produtos para validação
  • Após validação, preencher restante da base

🎯 Regras de Cadastro

* Tamanhos devem ser separados por vírgula
* Cores podem ser utilizadas ou definido como “única” inicialmente
* Ausência de controle de cor pode impactar relatórios de produção
* Informações fiscais devem ser validadas com contador

🚀 Estrutura do Projeto

• Fase 1 – Vendas (≈ 20 dias úteis)

* Cadastro geral
* Pedidos e vendas
* Emissão de NF-e
* Virada de sistema (início do uso real)

• Fase 2 – Produção (≈ 15 dias úteis)

* Matéria-prima
* Locais de produção
* Controle de produção

• Fase 3 – Gerencial (≈ 5 dias úteis)

* Financeiro
* Estoque
* Relatórios

📌 Regras do Projeto

* Avanço entre fases somente após conclusão da anterior
* Importação da planilha leva até 3 dias úteis após envio
* Cronograma depende do envio da planilha preenchida

👤 Responsáveis

* Paloma: responsável principal pelo projeto

🚀 Próximos Passos

* Cliente instalar TeamViewer nas máquinas
* CS Azoup enviar planilhas (produtos, clientes e fornecedores)
* Cliente preencher e enviar 3 a 5 produtos para validação
* Após validação, envio completo para importação
* Montagem do cronograma da Fase 1 após importação', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), 'a0806098-50e2-4cc8-a976-591117f36aa7', NULL, NULL, '2026-04-06 15:16:18.853157+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('adf56b98-3aec-4d4e-93c1-d2388ab7433f', '📌 KALHANDRA UNIFORMES – PLANILHA DEVOLVIDA | 📅 20/03/2026 a 25/03/2026

🧾 Resumo
Cliente realizou envio parcial e posteriormente atualizado da base de produtos exportada do sistema anterior, com validações sobre estrutura dos dados e autorização para adaptação antes da importação.

⚠ Motivo / Contexto
Necessidade de validar e adaptar os dados exportados do sistema anterior para viabilizar a importação no sistema Azoup.

📅 Alinhamento Realizado
• Cliente inicialmente sinalizou dificuldade de tempo para envio completo dos dados

• Alinhado envio de relatório exportado do sistema anterior (produtos), similar ao processo feito com clientes

• Primeira versão da planilha continha apenas:

* Código interno
* Descrição do produto

• Orientado que a estrutura estava incompleta para importação ideal

• Cliente informou que geraria novo relatório mais completo

• Novo relatório foi enviado posteriormente para validação

• Identificado que a planilha não possuía:

* Preço de custo
* Preço de venda

• Validado com cliente que importação poderia seguir mesmo assim
• Cliente confirmou que complementará os cadastros posteriormente no sistema

• Alinhado ajuste necessário nos códigos dos produtos:

* Remoção de letras, pontos e caracteres especiais
* Manter apenas números inteiros

• Validado também que cada variação (ex: tamanho) será importada como um cadastro individual

💰 Gestão de Horas
• Interações de validação e alinhamento não consumiram horas de implantação

👤 Responsáveis
• Vinícius – Analista de Implantação
• Alexandra Moreira – Cliente

🚀 Próximos Passos
• Equipe Azoup realizar adaptação dos dados (estrutura e códigos)
• Prosseguir com importação da base de produtos
• Cliente seguirá com complementação de cadastros no sistema, se necessário
• Envio pendente das informações bancárias restantes (Santander)
• Continuidade do processo de implantação com base nos dados importados', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '66792e18-6327-421f-a82e-ebb6803ca1b0', NULL, NULL, '2026-04-06 15:30:36.847683+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('0e7055cf-1a00-4f13-b7a6-0c202a6acded', '📌 LVT SPORTS – FORMULÁRIO DE BOAS-VINDAS | 📅 27/03/2026

🧾 Resumo
Recebimento do formulário de boas-vindas com informações completas sobre estrutura atual da empresa, operação, equipe e expectativas com o projeto.

⚠️ Motivo/Contexto
Coleta de dados iniciais para direcionamento da implantação conforme realidade do cliente.

📅 Solicitação/Ação do Cliente
• Preenchimento do formulário de boas-vindas
• Detalhamento dos processos atuais e estrutura da empresa

✅ Alinhamento Realizado

🔹 Dados Gerais
• Responsável: Thyago Lopes
• Empresa: LVT Sports
• Segmento: Uniformes esportivos
• Tempo de atuação: 8 anos

🔹 Controles Atuais
• Controle de estoque (produtos acabados): Não informado explicitamente
• Controle de estoque (matéria-prima): Não informado explicitamente
• Controle de produção: Realizado via planilha Excel própria (controle considerado precário)

🔹 Produtos, Matéria-Prima e Produção
• Aproximadamente 6 modelos de produtos
• Cerca de 8 tipos de tecidos
• Estrutura de máquinas: 2 desktops e 1 notebook

🔹 Equipe e Acessos
• Total de usuários: 3 pessoas
• Thyago – CEO – Acesso total
• Débora – Acesso total
• Adeilson – Cadastros e Vendas

🔹 Organização da Implantação
• Prazo estimado para envio de planilhas: até 2 dias
• Disponibilidade: dias úteis (sem disponibilidade aos finais de semana)

🔹 Expectativas com o Projeto
• Melhorar organização da gestão
• Estruturar e otimizar o controle de produção

🔹 Processo Atual da Empresa
• Atendimento via WhatsApp, Instagram e presencial
• Criação de arte → aprovação do cliente
• Definição de quantidades e tamanhos
• Corte → impressão → sublimação → costura → acabamento → revisão → expedição
• Comunicação interna via grupo de WhatsApp
• Prazo médio de produção: 4 a 5 dias após aprovação

🔹 Particularidades
• Utilização de DTF com terceirização da impressão
• Aplicação realizada internamente
• Demais processos produtivos internos

🔹 Treinamentos e Responsáveis
• Thyago – Geral
• Débora – Geral / Vendas
• Adeilson – Cadastros / Vendas

🔹 Responsável pelo Projeto
• Thyago – CEO

💰 Gestão de Horas
• Não se aplica nesta etapa

👤 Responsáveis
• Thyago – Responsável principal pelo projeto
• Equipe LVT – Apoio operacional
• Vinícius – Implantação Azoup

🚀 Próximos Passos
• Analisar cenário atual para definição da estratégia de implantação
• Iniciar estruturação dos cadastros (produtos e processos)
• Agendar e conduzir reunião de alinhamento
• Seguir com início da Fase 01 – Vendas', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '4e36cf11-9121-4441-adcb-73aa56992196', NULL, NULL, '2026-04-06 13:36:55.912306+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('0df4b769-8622-42b2-806a-87af9afcb2b2', '📌 LVT SPORTS – REUNIÃO DE ALINHAMENTO | 📅 30/03/2026

🧾 Resumo
Reunião de alinhamento inicial com apresentação do plano contratado (PRÓ – 50h), definição da comunicação, estrutura do projeto em fases e orientação sobre instalação, treinamentos e início dos cadastros.

⚠️ Motivo/Contexto
Início oficial da implantação, com objetivo de estruturar o projeto, alinhar expectativas e preparar o cliente para a Fase 01 – Vendas.

📅 Solicitação/Ação do Cliente
• Participação na reunião de alinhamento
• Preenchimento da planilha de produtos (ou definição de cadastro direto no sistema)
• Organização para instalação do sistema

✅ Alinhamento Realizado
• Plano contratado: PRÓ (50 horas de consultoria)
• Horas não utilizadas permanecem disponíveis para uso futuro
• Suporte técnico disponível após implantação para demandas pontuais

• Comunicação será centralizada via grupo de WhatsApp
• Compartilhamento de links de reuniões, gravações e controle de horas pelo grupo

• Instalação do sistema será realizada via acesso remoto (TeamViewer)
• Será feita validação técnica das máquinas (hardware e internet)

• Treinamentos realizados via Google Meet
• Gravações disponibilizadas em pasta no Google Drive
• Cancelamentos devem ser informados com 24h de antecedência

• Cadastro inicial de produtos poderá ser feito via planilha ou diretamente no sistema
• Planilha sugerida para agilizar processo de importação
• Campos importantes: nome do produto, unidade, preço, NCM, grade (tamanhos e cores)
• Sistema permite geração automática de códigos internos

• Estrutura do projeto definida em fases:

* Fase 01: Vendas + Virada de Sistema (~20 dias úteis)
* Fase 02: Financeiro (~5 dias úteis)
* Fase 03: Produção + Estoque (~20 dias úteis)
* Fase 04: Gerencial / Relatórios

• Virada de sistema marca o início obrigatório do uso do sistema nas vendas

💰 Gestão de Horas
• Plano PRÓ: 50 horas totais
• Consumo conforme agendas realizadas
• Horas remanescentes ficam disponíveis para uso futuro

👤 Responsáveis
• Thyago – Responsável principal pelo projeto
• Vinícius / Anderson – Implantação Azoup

🚀 Próximos Passos
• Criar grupo de WhatsApp para comunicação do projeto
• Enviar planilha de cadastro de produtos
• Cliente definir estratégia de cadastro (planilha ou direto no sistema)
• Preencher e devolver planilha (caso opte por importação)
• Realizar instalação do sistema
• Iniciar cronograma da Fase 01 – Vendas', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '4e36cf11-9121-4441-adcb-73aa56992196', NULL, NULL, '2026-04-06 13:38:02.254393+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('d2bbab44-3a86-4905-99d6-73e0302a3a22', '📌 LVT SPORTS – PLANILHAS ENVIADAS / ORIENTAÇÕES | 📅 30/03 a 06/04/2026

🧾 Resumo
Envio das planilhas de cadastro (produtos, clientes e fornecedores) e link da pasta de gravações. Cliente iniciou preenchimento, apresentou dúvidas sobre campos fiscais e estrutura da planilha, sendo orientado pela equipe.

⚠ Motivo/Contexto
Planilhas enviadas após reunião de alinhamento para agilizar o cadastro inicial no sistema e preparação para início da operação.

📅 Solicitação/Ação do Cliente

* Informou que iria preencher as planilhas
* Solicitou orientação sobre preenchimento
* Dúvidas específicas sobre:

  * Campos fiscais (Grupo Fiscal, CFOP, CST)
  * Código de barras (se precisa criar ou já existe)

✅ Alinhamento Realizado

* Planilhas devem ser preenchidas com os dados que serão importados para o sistema
* Campos fiscais (Grupo Fiscal, CFOP, CST) devem ser validados com a contabilidade
* Código de barras pode ser criado ou gerado posteriormente no sistema
* Cadastro de clientes pode ser inicial (básico), sendo completo apenas para emissão de NF-e
* Cadastro de fornecedores pode conter apenas o nome inicialmente
* Objetivo das planilhas: agilizar o início da operação e evitar cadastros manuais durante uso

💰 Gestão de Horas
Sem consumo de horas (suporte e orientação pontual via WhatsApp)

👤 Responsáveis

* Vinícius / Anderson – Orientações e suporte
* Thyago – Preenchimento das planilhas

🚀 Próximos Passos

* Cliente finalizar preenchimento das planilhas
* Equipe Azoup validar dados recebidos
* Importação das informações no sistema
* Início da Fase 01 – Vendas 🚀', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '4e36cf11-9121-4441-adcb-73aa56992196', NULL, NULL, '2026-04-06 13:40:44.472823+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('79f431d7-83e6-4630-9a48-fc119e529d25', '📌 CUMPLICE DA MODA – PRIMEIRO CONTATO | 📅 26/03/2026

🧾 Resumo
Realizado primeiro contato com a cliente Cristiane, com apresentação inicial da Azoup e alinhamento dos próximos passos para início da implantação. Reunião de alinhamento agendada e formulário preenchido previamente pela cliente.

⚠ Motivo/Contexto
Início do processo de implantação após entrada do cliente na base Azoup.

📅 Solicitação/Ação do Cliente

* Informou indisponibilidade no horário inicial sugerido (manhã)
* Solicitou reagendamento para período da tarde
* Preencheu o formulário de boas-vindas (mesmo que parcialmente, devido à ausência de divisão clara de funções no momento)

✅ Alinhamento Realizado

* Apresentação inicial e boas-vindas ao cliente
* Explicação sobre a reunião de alinhamento e próximos passos
* Envio do formulário de boas-vindas para coleta de informações
* Reunião de alinhamento agendada para:

  * 📅 30/03/2026 – 16h30 às 17h30
* Validado que o preenchimento parcial do formulário é suficiente para início

💰 Gestão de Horas
Sem consumo de horas (etapa inicial / primeiro contato)

👤 Responsáveis

* Vinícius – Condução do primeiro contato
* Cristiane – Preenchimento do formulário e alinhamento de agenda

🚀 Próximos Passos

* Realização da reunião de alinhamento na data agendada
* Levantamento detalhado dos processos durante a reunião
* Início da estruturação do cronograma de implantação 🚀', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', NULL, NULL, '2026-04-06 13:42:49.932961+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('c0a327cb-073f-41f0-9972-469716222da8', '📌 ANESA UNIFORMES – PRIMEIRO CONTATO | 📅 03/03/2026

👋 Boas-vindas

* Vinícius (Analista de Implantação Azoup) deu as boas-vindas à equipe da Anesa Uniformes
* Vanessa respondeu com mensagem acolhedora, informando horário de atendimento 🕘

📅 Agendamento Reunião de Alinhamento

* Sugestão inicial: sexta-feira 06/03/2026, das 14h30 às 16h00
* Confirmado: sexta-feira 06/03/2026 às 16h30 ✅

📝 Formulário Preparatório

* Link enviado para preenchimento antes da reunião: https://forms.gle/JujKqFy281KaPDjL6
* Importante para organizar conteúdos e alinhamentos da reunião
* Suporte disponível para dúvidas durante o preenchimento 💻

🚀 Próximos Passos

* Vanessa e equipe preencherão o formulário
* Reunião de alinhamento acontecerá conforme horário confirmado
* CS Azoup acompanhará e auxiliará no preparo para o uso inicial do sistema', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '9a2aaacd-6f11-4931-b41d-b7c103006919', NULL, NULL, '2026-04-06 18:06:01.182792+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('3ba9b7a3-92ab-47a5-a4e8-676fe9098932', '📌 CUMPLICE DA MODA – REUNIÃO DE ALINHAMENTO | 📅 30/03/2026

🧾 Resumo
Realizada reunião de alinhamento inicial com apresentação do plano contratado (Master – 70h), definição da comunicação via WhatsApp, explicação da metodologia de implantação em fases e orientação sobre o processo de importação de dados.

⚠ Motivo/Contexto
Início oficial do projeto de implantação, com alinhamento de expectativas, processos e próximos passos junto à cliente.

📅 Solicitação/Ação do Cliente

* Participação na reunião de alinhamento (Cristiane e Matheus)
* Informaram prazo estimado de 10 dias para preenchimento da planilha de produtos
* Validaram entendimento inicial do processo, sem dúvidas críticas no momento

✅ Alinhamento Realizado

* Plano contratado: Master (70 horas de consultoria)
* Horas não utilizadas poderão ser utilizadas futuramente
* Comunicação centralizada via grupo de WhatsApp (com envio de links, gravações e suporte)
* Instalação será realizada remotamente via TeamViewer, com validação técnica das máquinas
* Treinamentos via Google Meet, com gravação e disponibilização no Google Drive
* Cancelamentos devem ser feitos com 24h de antecedência para não consumir horas

📦 Importação de Dados

* Envio de planilha padrão para cadastro de produtos
* Orientação para preenchimento inicial de 3 a 5 produtos para validação
* Após validação, preenchimento completo para importação
* Prazo médio de importação: até 3 dias úteis após envio completo

📊 Estrutura do Projeto (Fases)

* Fase 01 – Vendas (≈ 20 dias úteis)

  * Cadastros, pedidos, NF-e e virada de sistema
* Fase 02 – Financeiro (≈ 5 dias úteis)

  * Contas a pagar/receber, boletos
* Fase 03 – Produção (≈ 20 dias úteis)

  * Matéria-prima, ficha técnica, ordens de produção, facções
* Fase 04 – Gerencial

  * Relatórios, fluxo de caixa, DRE, BI

🔄 Processo Atual e Pontos Relevantes

* Produção com faccionistas (terceirizada)
* Uso de e-commerce (Nuvemshop) com intenção de integração
* Uso de vendedores externos (possível uso do app mobile)
* Necessidade futura de configuração de boletos (Bradesco, Itaú e PagSeguro)
* Controle de consignação será abordado na fase de vendas

💰 Gestão de Horas
Sem consumo de horas (reunião de alinhamento inclusa no processo inicial)

👤 Responsáveis

* Vinícius / Anderson – Implantação e suporte
* Cristiane / Matheus – Acompanhamento do projeto e validações

🚀 Próximos Passos

* Criar grupo de WhatsApp com a equipe
* Enviar planilhas (produtos, clientes e fornecedores)
* Cliente iniciar preenchimento (priorizando principais produtos)
* Receber planilha preenchida e realizar importação
* Montar cronograma da Fase 01 e iniciar implantação 🚀', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', NULL, NULL, '2026-04-06 13:45:03.235717+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('e8c12736-c90c-4bcc-a7dd-2b71e23dc947', '📌 CUMPLICE DA MODA – PLANILHAS ENVIADAS | 📅 31/03/2026

🧾 Resumo
Envio das planilhas de cadastro e link da pasta de gravações após a reunião de alinhamento. Cliente confirmou recebimento.

⚠ Motivo/Contexto
Disponibilização das planilhas necessárias para início do preenchimento e posterior importação de dados no sistema.

📅 Solicitação/Ação do Cliente

* Confirmação de recebimento das planilhas enviadas

✅ Alinhamento Realizado

* Envio das planilhas de cadastro (produtos, clientes e fornecedores)
* Envio do link da pasta de gravações dos treinamentos
* Orientação implícita para início do preenchimento conforme alinhado em reunião

🔗 Link Compartilhado

* Pasta de gravações: [https://drive.google.com/dr…](https://drive.google.com/dr…)

💰 Gestão de Horas
Sem consumo de horas (envio de material e comunicação inicial)

👤 Responsáveis

* Vinícius – Envio das planilhas e orientações
* Cristiane – Recebimento e início do preenchimento

🚀 Próximos Passos

* Cliente iniciar preenchimento das planilhas
* Envio para validação pela equipe Azoup
* Importação dos dados no sistema
* Início da Fase 01 – Vendas 🚀', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', NULL, NULL, '2026-04-06 13:46:14.598065+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('9efa7bca-f705-400c-8580-8b5682979617', '📌 CUMPLICE DA MODA – PLANILHAS DEVOLVIDAS | 📅 01/04 a 02/04/2026

🧾 Resumo
Cliente realizou envio das planilhas de cadastro (produtos e fornecedores), incluindo atualização dos dados após ajustes internos. Material encaminhado para equipe responsável pela conversão/importação.

⚠ Motivo/Contexto
Devolução das planilhas preenchidas para continuidade do processo de implantação e preparação da base de dados no sistema.

📅 Solicitação/Ação do Cliente

* Envio inicial da planilha de produtos
* Informou necessidade de complementar com dados da loja
* Envio de planilha de produtos atualizada
* Envio da planilha de fornecedores preenchida

✅ Alinhamento Realizado

* Confirmado recebimento das planilhas
* Validado que ainda haverão complementos com base no estoque da loja
* Dados encaminhados para equipe de desenvolvimento para conversão/importação

💰 Gestão de Horas
Sem consumo de horas (etapa de coleta e preparação de dados)

👤 Responsáveis

* Cristiane / Elaine / Matheus – Envio e ajustes das planilhas
* Vinícius – Recebimento e direcionamento interno
* Equipe de Desenvolvimento – Conversão dos dados

🚀 Próximos Passos

* Finalizar conversão/importação das planilhas
* Validar dados importados junto ao cliente
* Iniciar cronograma da Fase 01 – Vendas 🚀', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', NULL, NULL, '2026-04-06 13:49:32.837373+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('0dd5d9a7-2036-4671-ac62-fbf0c2ab66e1', '📌 MCE CONFECÇÕES – PRIMEIRO CONTATO | 📅 26/03/2026

🧾 Resumo
Realizado primeiro contato com a cliente Paloma, com apresentação inicial da Azoup e alinhamento dos próximos passos para início da implantação. Reunião de alinhamento agendada e formulário encaminhado para preenchimento.

⚠ Motivo/Contexto
Início do processo de implantação após entrada do cliente na base Azoup.

📅 Solicitação/Ação do Cliente

* Confirmou disponibilidade para reunião de alinhamento
* Informou que irá preencher o formulário assim que possível

✅ Alinhamento Realizado

* Apresentação inicial e boas-vindas ao cliente
* Explicação sobre a reunião de alinhamento e processo de implantação
* Envio do formulário de boas-vindas para coleta de informações
* Reunião de alinhamento agendada para:

  * 📅 30/03/2026 – 09h30 às 10h30

💰 Gestão de Horas
Sem consumo de horas (etapa inicial / primeiro contato)

👤 Responsáveis

* Vinícius – Condução do primeiro contato
* Paloma – Preenchimento do formulário e participação na reunião

🚀 Próximos Passos

* Cliente preencher formulário de boas-vindas
* Realização da reunião de alinhamento na data agendada
* Levantamento de processos e definição do cronograma de implantação 🚀', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), 'a0806098-50e2-4cc8-a976-591117f36aa7', NULL, NULL, '2026-04-06 15:08:21.056102+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('60b9991f-c8af-482c-bd2d-9d5862845da9', '📌 MCE CONFECÇÕES – FORMULÁRIO DE BOAS-VINDAS

🧾 Resumo
Formulário de boas-vindas preenchido pela cliente Paloma Magalhães, contendo informações gerais da empresa, estrutura atual, controles, equipe, expectativas e organização para início da implantação do sistema Azoup.

🏢 1. DADOS GERAIS
Responsável pelo preenchimento: Paloma Magalhães
Empresa: MCE Confecções e Estamparia
Segmento: Uniformes
Tempo de atuação: 6 anos
Regime Tributário: Não informado

📦 2. CONTROLES ATUAIS
Estoque de produtos acabados: Não informado
Estoque de matéria-prima: Não informado
Controle de produção:
Atualmente não possui nenhum tipo de controle formal

🧵 3. PRODUTOS, MATÉRIA-PRIMA E PRODUÇÃO
Quantidade de produtos: Aproximadamente 30 modelos
Tipos de matéria-prima: Aproximadamente 50 tipos
Máquinas/Equipamentos: 3 máquinas

👥 4. EQUIPE E ACESSOS AO SISTEMA
Usuários do sistema: 3 pessoas

Permissões:

* Paloma – Acesso total
* Michel – Acesso total
* Isadora – Cadastros e Financeiro

📅 5. ORGANIZAÇÃO DA IMPLANTAÇÃO
Prazo para envio da planilha: 3 dias

Disponibilidade:

* Disponibilidade geral
* Período da manhã com maior dificuldade

🎯 6. EXPECTATIVAS COM O PROJETO

* Controle total das demandas de produção
* Visão completa do financeiro

Processo atual:
Fluxo inicia com orçamento → aprovação → criação de layout → montagem de ficha técnica (via Excel, com muitos erros) → compra de matéria-prima → início da produção.
Atualmente não há sistema de controle.

Observações adicionais:

* Não possui controle de estoque

🎓 7. TREINAMENTOS E RESPONSÁVEIS
Participantes dos treinamentos:

* Paloma – Geral
* Isadora – Cadastros básicos (clientes)

Responsável principal pelo projeto:

* Paloma', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), 'a0806098-50e2-4cc8-a976-591117f36aa7', NULL, NULL, '2026-04-06 15:11:59.027739+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('2d601016-d2eb-4700-81b7-2ca3aa28c7af', '📌 MCE CONFECÇÕES – PLANILHAS ENVIADAS | 📅 30/03/2026

🧾 Resumo
Envio das planilhas de cadastro (produtos, clientes e fornecedores) após reunião de alinhamento, com orientações sobre preenchimento, prazos para importação e esclarecimento de dúvidas da cliente.

⚠ Motivo/Contexto
Dar início à etapa de importação de dados para agilizar a implantação do sistema e preparação da Fase 01 (Vendas).

📅 Solicitação/Ação do Cliente

* Cliente confirmou inclusão da equipe no grupo de WhatsApp
* Isadora solicitou reenvio das planilhas por dificuldade ao abrir os arquivos
* Cliente questionou sobre necessidade de envio da planilha antes da implantação, devido prazo do sistema antigo (até dia 05)

✅ Alinhamento Realizado

* Planilhas reenviadas conforme solicitado

* Orientado que:
  • Após envio da planilha de produtos preenchida, prazo de até 3 dias úteis para conversão dos dados
  • Após conversão, será enviado cronograma com:

  * Instalação
  * Configuração
  * Treinamentos da Fase 01

* Informado que a importação é opcional:
  • Objetivo: agilizar início da operação
  • Alternativa: cadastro manual durante treinamentos

* Reforçado que Fase 01 (Vendas) possui expectativa de ~20 dias úteis

💰 Gestão de Horas
Sem consumo de horas (atividade operacional/comunicação inicial)

👤 Responsáveis

* CS Azoup: Vinícius
* Cliente: Paloma / Isadora

🚀 Próximos Passos

* Cliente definir se realizará importação ou cadastro manual

* Caso opte por importação:
  • Preencher planilha de produtos
  • Enviar para validação/conversão

* Aguardar envio do cronograma da Fase 01 após conversão dos dados', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), 'a0806098-50e2-4cc8-a976-591117f36aa7', NULL, NULL, '2026-04-06 15:18:40.314169+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('9ec55654-1b16-47b8-a5d4-b8463e75e018', '📌 KALHANDRA UNIFORMES – PRIMEIRO CONTATO | 📅 13/03/2026

🧾 Resumo
Primeiro contato realizado com a cliente Alexandra, com apresentação do analista responsável, envio do formulário inicial e sugestão de agendamento da reunião de alinhamento.

📅 Contato Realizado

* Apresentação do analista de implantação (Vinícius)
* Boas-vindas ao cliente
* Confirmação de contato com a responsável (Alexandra)

📄 Formulário de Boas-Vindas

* Enviado formulário para coleta de informações iniciais:
  https://forms.gle/iq5kZviboPPXdDTA9

📆 Agendamento

* Sugerido:
  • Terça-feira – 17/03
  • Horário: 09h00 às 10h30

👤 Responsáveis

* CS Azoup: Vinícius
* Cliente: Alexandra

🚀 Próximos Passos

* Cliente preencher formulário de boas-vindas
* Confirmar agendamento da reunião de alinhamento
* Realizar reunião para início do projeto', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '66792e18-6327-421f-a82e-ebb6803ca1b0', NULL, NULL, '2026-04-06 15:23:46.240247+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('21d6daa9-771f-476e-85e3-7e5b155c298b', '📌 KALHANDRA UNIFORMES – FORMULÁRIO DE BOAS-VINDAS

🧾 Resumo
Formulário de boas-vindas preenchido pela cliente Alexandra Moreira, contendo informações gerais da empresa, estrutura atual, controles, equipe, expectativas e organização para início da implantação.

🏢 1. DADOS GERAIS
Responsável pelo preenchimento: Alexandra Moreira
Empresa: Kalhandra
Segmento: Uniformes
Tempo de atuação: 28 anos
Regime Tributário: Não informado

📦 2. CONTROLES ATUAIS
Estoque de produtos acabados: Não informado
Estoque de matéria-prima: Não informado
Controle de produção:
Entrada de pedidos via sistema e ficha técnica impressa

🧵 3. PRODUTOS, MATÉRIA-PRIMA E PRODUÇÃO
Quantidade de produtos: Aproximadamente 60 modelos
Tipos de matéria-prima: Aproximadamente 50 tipos
Máquinas/Equipamentos: Aproximadamente 3 notebooks e 7 desktops

👥 4. EQUIPE E ACESSOS AO SISTEMA
Usuários do sistema: 9 pessoas

Permissões:

* Alexandra – Gerente Geral
* Jaqueline – Financeiro
* Rayla – Assistente Gerente
* Gislaine, Gisele, Nayara e Silvana – Vendas
* Natalina e Marlene – Produção

📅 5. ORGANIZAÇÃO DA IMPLANTAÇÃO
Prazo para envio da planilha: 10 dias

Disponibilidade:

* Indisponibilidade às sextas-feiras

🎯 6. EXPECTATIVAS COM O PROJETO

* Melhorar principalmente a gestão da produção

Processo atual:
Fluxo inicia na digitação de orçamentos → aprovação → geração de pedido → emissão de ordem de produção → conferência → faturamento → emissão de NF-e

Observações adicionais:

* Necessidade de controle de estoque de produto acabado para cliente com contrato anual

🎓 7. TREINAMENTOS E RESPONSÁVEIS
Participantes dos treinamentos:

* Alexandra – Geral
* Jaqueline – Financeiro
* Rayla – Assistente Gerente
* Gislaine, Gisele, Nayara e Silvana – Vendas
* Natalina e Marlene – Produção

Responsáveis principais pelo projeto:

* Alexandra – Gerente Geral
* Rayla – Assistente Gerente
* João e Marcelo – Consultores internos', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '66792e18-6327-421f-a82e-ebb6803ca1b0', NULL, NULL, '2026-04-06 15:25:31.531062+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('05c32100-9bb0-4dfa-85dd-53d3fd1516d8', '📌 KALHANDRA UNIFORMES – REUNIÃO DE ALINHAMENTO | 📅 17/03/2026

🧾 Resumo
Reunião de alinhamento do projeto de implantação, onde foram apresentados o plano contratado de 50 horas, a metodologia de trabalho, a comunicação via WhatsApp e a divisão do projeto em 4 fases.

⚠ Motivo / Contexto
Início da implantação do sistema Azoup, com objetivo de alinhar expectativas, explicar o funcionamento do projeto e definir próximos passos.

📅 Alinhamento Realizado
• Plano PRO com 50 horas de consultoria e treinamento
• Horas não utilizadas ficam armazenadas para uso futuro
• Comunicação centralizada via grupo de WhatsApp
• Envio de links de reuniões, gravações e materiais pelo grupo

• Instalação inicial via TeamViewer para validação das máquinas e internet
• Treinamentos realizados via Google Meet, com gravações disponíveis no Drive
• Necessidade de aviso prévio de 24h para reagendamentos sem consumo de horas

• Envio de planilhas para importação inicial de dados:

* Produtos
* Clientes
* Fornecedores

• Prazo de até 3 dias úteis para conversão dos dados após devolução das planilhas

• Estrutura do projeto em fases:

* Fase 1: Vendas (≈ 20 dias úteis)
* Fase 2: Financeiro (≈ 5 dias úteis)
* Fase 3: Produção (≈ 20 dias úteis)
* Fase 4: Gerencial (relatórios e BI)

💰 Gestão de Horas
• Horas utilizadas apenas em reuniões, treinamentos e consultorias
• Suporte técnico disponível após implantação para dúvidas pontuais
• Possibilidade de contratação de horas adicionais, se necessário

👤 Responsáveis
• Vinícius – Analista de Implantação
• Anderson – Analista de Implantação
• Alexandra Moreira – Responsável do projeto (cliente)

🚀 Próximos Passos
• Criação do grupo de WhatsApp com equipe do cliente
• Envio das planilhas de cadastro (produtos, clientes e fornecedores)
• Preenchimento e devolução das planilhas pela Kalhandra
• Conversão dos dados pela equipe Azoup (até 3 dias úteis)
• Montagem e envio do cronograma da Fase 1', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '66792e18-6327-421f-a82e-ebb6803ca1b0', NULL, NULL, '2026-04-06 15:27:07.777298+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('87888cee-8dd5-425a-8d8b-6b5da199e922', '📌 KALHANDRA UNIFORMES – PLANILHAS ENVIADAS | 📅 17/03/2026

🧾 Resumo
Envio das planilhas padrão para importação de dados e início das tratativas relacionadas à migração de informações, além de alinhamentos sobre boletos e integração bancária.

⚠ Motivo / Contexto
Dar início ao processo de estruturação da base de dados no sistema Azoup (produtos, clientes e fornecedores) e orientar sobre integrações financeiras.

📅 Alinhamento Realizado
• Envio das planilhas padrão para preenchimento:

* Produtos acabados
* Clientes
* Fornecedores

• Compartilhamento da pasta com gravações:
• Cliente informou que possui base de clientes extraída do sistema atual
• Arquivo encaminhado para análise da equipe de desenvolvimento para possível reaproveitamento/importação

• Alinhado que o sistema permite integração com 2 ou mais bancos para emissão de boletos

• Informações necessárias para configuração de boletos:

* Banco
* CNPJ
* Agência e Conta
* Convênio / Código Cedente
* Carteira e tipo de carteira
* Número atual de boletos
* Mensagens e instruções
* Layout CNAB (240 ou 400)
* Sequencial de remessa

• Enviado ao cliente os dados técnicos da integração:

* Sistema: Azoup
* Tipo: CNAB (remessa bancária)
* Finalidade: cobrança (recebimentos)
* Layout: CNAB 240

• Enviado também layout CNAB240 para apoio no preenchimento junto ao banco

💰 Gestão de Horas
• Interações de suporte e orientação não consumiram horas de implantação

👤 Responsáveis
• Vinícius – Analista de Implantação
• Anderson – Analista de Implantação
• Alexandra Moreira – Cliente
• Rayla Lee – Cliente

🚀 Próximos Passos
• Cliente finalizar preenchimento das planilhas
• Validação dos dados pela equipe Azoup
• Conversão/importação das informações
• Definição e envio do cronograma da Fase 1
• Finalização das configurações bancárias para emissão de boletos', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '66792e18-6327-421f-a82e-ebb6803ca1b0', NULL, NULL, '2026-04-06 15:29:21.338859+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('feddeabc-26cd-4efd-b0e7-d18190d05222', '📅 AZOUP & CUMPLICE DA MODA

Fase 01 - Vendas
1.1.Instalação do Sistema - 09/04/2026 - 10h45 às 12h15 
1.2.Configurações - 10/04/2026 - 14h15 às 15h45
1.3.Cadastros - 13/04/2026 - 16h00 às 17h30
1.4.Vendas - 15/04/2026 - 16h00 às 17h30
1.5.NF-e - 22/04/2026 - 16h00 às 17h30
1.6.Virada de Sistema: Vendas - 23/04/2026 - 09h00 às 12h00
1.7.AzVendas - 27/04/2026 - 16h00 às 17h30
1.8.Integração E-commerce - 30/04/2026 - 16h00 às 17h30', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', NULL, NULL, '2026-04-07 20:22:59.992318+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('922ef292-7389-40a6-8409-03b278151a3c', '📌 KALHANDRA UNIFORMES – CRONOGRAMA ENVIADO | 📅 30/03/2026

🧾 Resumo
Envio do cronograma da Fase 01 (Vendas), contemplando instalação, configurações, treinamentos e virada de sistema.

⚠ Motivo / Contexto
Definição e validação das agendas iniciais do projeto após preparação dos dados para início da implantação.

📅 Alinhamento Realizado
• Enviado cronograma completo da Fase 01 (Vendas):

31/03/2026 – 14h30 às 16h30
Instalação do Sistema [Conexão Remota]

02/04/2026 – 14h30 às 16h30
Configurações [Conexão Remota]

07/04/2026 – 09h00 às 12h00
Treinamento de Cadastros: Vendas [Reunião Online]

09/04/2026 – 14h30 às 17h30
Treinamento de Vendas [Reunião Online]

13/04/2026 – 14h30 às 17h30
Treinamento de NF-e [Reunião Online]

15/04/2026 – 09h00 às 12h00
Virada de Sistema: Vendas [Acompanhamento Online]

• Cronograma enviado para validação do cliente antes do agendamento definitivo

• Cliente sinalizou possível confirmação das agendas

• Confirmada primeira agenda:
31/03/2026 às 14h30 (Instalação)

💰 Gestão de Horas
• Horas serão contabilizadas conforme execução das agendas previstas

👤 Responsáveis
• Vinícius – Analista de Implantação
• Alexandra Moreira – Cliente

🚀 Próximos Passos
• Execução da instalação conforme agenda confirmada
• Validação e confirmação das demais datas do cronograma
• Início dos treinamentos conforme planejamento da Fase 01', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '66792e18-6327-421f-a82e-ebb6803ca1b0', NULL, NULL, '2026-04-06 15:32:02.681727+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('36a72cb9-c686-4ecc-b140-75e18d83250e', '📌 KALHANDRA UNIFORMES – INSTALAÇÃO DO SISTEMA | 📅 31/03/2026

🧾 Resumo
Realizada a instalação do sistema Azoup nas máquinas da empresa, incluindo configuração inicial, instalação do certificado digital e preparação dos ambientes para uso.

⚠ Motivo / Contexto
Primeira etapa prática da implantação (Fase 01 – Vendas), com objetivo de preparar as máquinas e garantir que o sistema esteja pronto para os treinamentos.

📅 Alinhamento Realizado
• Confirmação prévia da instalação às 14h30

• Coleta das informações necessárias:

* E-mail para envio de NF-e
* Certificado digital A1
* Identificação das máquinas emissoras de NF-e

• Instalação iniciada às 14h31

• Instalações realizadas:

* Máquina da Alexandra (com emissão de NF-e)
* Máquina da Jaqueline (com emissão de NF-e)
* Máquina da Gisele
* Máquina da equipe comercial (Rayla e demais)

• Configuração do certificado digital realizada com sucesso

• Acesso remoto realizado via TeamViewer conforme padrão

• Validação final com cliente durante o processo

💰 Gestão de Horas
• Início: 14h31
• Término: 17h30

• Tempo total aproximado: 3h00 de implantação

👤 Responsáveis
• Anderson – Analista de Implantação
• Vinícius – Analista de Implantação
• Alexandra Moreira – Cliente
• Equipe Kalhandra (Jaqueline, Gisele, Rayla e demais)

🚀 Próximos Passos
• Continuidade para etapa de configurações do sistema
• Início dos treinamentos conforme cronograma
• Validação do funcionamento em todas as máquinas instaladas', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '66792e18-6327-421f-a82e-ebb6803ca1b0', NULL, NULL, '2026-04-06 15:35:43.612826+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('d8d83094-f46e-4e96-9b59-9fe3aaa4d690', '📌 KALHANDRA UNIFORMES – CONFIGURAÇÕES DO SISTEMA | 📅 02/04/2026

🧾 Resumo
Realizada a etapa de configurações iniciais do sistema Azoup, incluindo parâmetros fiscais, dados da empresa, logotipo e criação de usuários de acesso.

⚠ Motivo / Contexto
Segunda etapa da Fase 01 (Vendas), com objetivo de preparar o sistema para uso prático nos treinamentos.

📅 Alinhamento Realizado
• Início das configurações às 14h36

• Confirmado que a empresa realiza emissão de NF-e (não utiliza NFC-e)

• Solicitação e envio da logo da empresa para personalização de documentos

• Configuração realizada em máquina emissora de NF-e (prioridade)

• Coleta e validação de dados:

* Endereço (número do prédio)
* E-mail do contador

• Parte das configurações realizadas de forma remota, sem necessidade contínua de acesso via TeamViewer

• Criação dos usuários no sistema conforme estrutura informada:

* Administrativo / Gerencial
* Financeiro
* Comercial / Vendas
* Produção

• Acessos enviados ao cliente para utilização inicial

• Orientado que a troca de senhas será realizada em treinamento posterior

💰 Gestão de Horas
• Início: 14h36
• Término: 16h19

• Tempo total aproximado: 2h de implantação

👤 Responsáveis
• Anderson – Analista de Implantação
• Vinícius – Analista de Implantação
• Alexandra Moreira – Cliente
• Equipe Kalhandra (Jaqueline, Rayla e demais)

🚀 Próximos Passos
• Início dos treinamentos de cadastros (Fase 01 – Vendas)
• Orientação sobre uso dos acessos criados
• Ajustes finos conforme necessidade durante os treinamentos', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '66792e18-6327-421f-a82e-ebb6803ca1b0', NULL, NULL, '2026-04-06 15:37:02.770808+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('65f482c4-42a6-4dde-a57b-1fbbaf3d4f4f', '📌 NERO CONFECÇÃO – PRIMEIRO CONTATO | 📅 13/03/2026

🧾 Resumo
Realizado primeiro contato com o cliente para apresentação inicial e agendamento da reunião de alinhamento.

⚠ Motivo / Contexto
Início do relacionamento com o cliente após contratação, com objetivo de dar sequência no processo de implantação.

📅 Alinhamento Realizado
• Apresentação do analista responsável pelo projeto (Vinícius)

• Envio do formulário de boas-vindas para coleta de informações iniciais:
https://forms.gle/iq5kZviboPPXdDTA9

• Proposta de agendamento da reunião de alinhamento:
16/03/2026 – 14h15 às 15h45

• Cliente confirmou disponibilidade para o horário sugerido

💰 Gestão de Horas
• Interação inicial não contabiliza horas de implantação

👤 Responsáveis
• Vinícius – Analista de Implantação
• João – Cliente

🚀 Próximos Passos
• Preenchimento do formulário de boas-vindas pelo cliente
• Realização da reunião de alinhamento na data agendada', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), 'f51a9f52-fbe5-4936-945a-8ee79d163730', NULL, NULL, '2026-04-06 17:12:40.371823+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('bffa2ae0-2afb-4cff-a44d-9996e6e91dab', '📌 NERO CONFECÇÕES – REUNIÃO DE ALINHAMENTO | 📅 16/03/2026

🧾 Resumo
Reunião de alinhamento para início da implantação do sistema, com validação do plano contratado (Pro com módulos adicionais), definição da comunicação via WhatsApp, uso do TeamViewer para instalações e apresentação das fases do projeto.

⚠ Motivo/Contexto
Início do projeto de implantação, com necessidade de alinhar plano contratado, formato de trabalho, comunicação, importação de dados e estrutura das fases.

📅 Solicitação/Ação do Cliente

* Correção do plano contratado: de Master para Pro, incluindo módulos adicionais (Compras, E-commerce e Boletos)
* Solicitação de criação imediata do grupo no WhatsApp
* Interesse em enviar planilhas já existentes (produtos, cores e tamanhos) para análise de importação

✅ Alinhamento Realizado

* Equipe: Vinícius e Anderson como responsáveis pela implantação
* Comunicação centralizada via grupo de WhatsApp (envio de links, arquivos e dúvidas)
* Instalações e configurações realizadas via TeamViewer em todas as máquinas
* Treinamentos via Google Meet, com gravações disponibilizadas no Google Drive
* Cancelamentos devem ser informados com 24h de antecedência para não consumo de horas

📦 Importação de Dados

* Envio de planilha padrão para cadastro de produtos
* Orientação de preenchimento inicial com 3 a 5 produtos para validação
* Possibilidade de análise das planilhas já existentes do cliente para adaptação
* Prazo de até 3 dias úteis para importação após recebimento dos dados

📊 Fases do Projeto

* Fase 1: Vendas (~20 dias úteis)

* Fase 2: Financeiro e Matéria-Prima

* Fase 3: Produção

* Fase 4: Gerencial

* Avanço entre fases ocorre apenas após conclusão da fase anterior

💰 Gestão de Horas

* Plano Pro com horas limitadas para treinamentos e consultorias
* Horas não utilizadas podem ser aproveitadas posteriormente
* Dúvidas pontuais via WhatsApp não consomem horas

👤 Responsáveis

* Vinícius – Analista de Implantação
* Anderson – Analista de Implantação
* João Henrique Rodrigues – Responsável pelo projeto no cliente

🚀 Próximos Passos

* Criação do grupo no WhatsApp
* Cliente enviar planilhas já estruturadas para análise
* Cliente instalar TeamViewer nas máquinas
* Azoup analisar possibilidade de importação dos dados enviados
* Montagem e envio do cronograma da Fase 01 após definição da base de dados', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), 'f51a9f52-fbe5-4936-945a-8ee79d163730', NULL, NULL, '2026-04-06 17:14:44.210955+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('a7cbe4dc-c8e5-4c3b-8131-6b0f711ed5d6', '📌 NERO CONFECÇÕES – FORMULÁRIO DE BOAS-VINDAS

🧾 Dados Gerais

* Responsável pelo preenchimento: João Henrique Rodrigues
* Empresa: Nero Confecções
* Segmento: Uniformes
* Regime Tributário: Não informado
* Tempo de atuação: 1 ano

📦 Controles Atuais

* Controle de estoque de produtos acabados: Não informado
* Controle de estoque de matéria-prima: Não informado
* Controle de produção: Não possui sistema
* Forma atual de controle: Papéis impressos

📊 Produtos, Matéria-Prima e Produção

* Quantidade de produtos: Aproximadamente 50
* Tipos de matéria-prima: Aproximadamente 30
* Máquinas: 3 desktops e 2 notebooks

👥 Equipe e Acessos

* Total de usuários do sistema: 6 pessoas
* Estrutura da equipe:

  * João Henrique – Gerente
  * Rafael – Gerente
  * Liliane – Vendas
  * Cynthia – Gerente
  * Paula – Gerente
  * Fernanda – Gerente

📅 Organização da Implantação

* Prazo estimado para devolução da planilha: 3 dias
* Disponibilidade: Total (sem restrições de dias/horários)

🎯 Expectativas com o Projeto

* Resolver todas as dificuldades operacionais atuais
* Estruturar processos internos

🔄 Processo Atual

* Não possui processo definido atualmente

⚠ Observações

* Não possui controle estruturado de processos ou produção
* Não informou particularidades adicionais

🎓 Treinamentos e Responsáveis

* Responsável pelos treinamentos: João Henrique
* Responsável principal pelo projeto: João Henrique

🚀 Pontos de Atenção

* Cliente sem processos definidos → necessidade de maior condução consultiva
* Baixo nível de controle atual → foco inicial em estruturação básica (cadastros e fluxo)
* Alto potencial de evolução com implantação completa do sistema', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), 'f51a9f52-fbe5-4936-945a-8ee79d163730', NULL, NULL, '2026-04-06 17:15:39.473843+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('9d23f97c-4ec3-4656-ad98-36f4b60d0f3d', '📌 NERO CONFECÇÕES – PLANILHAS ENVIADAS / IMPORTAÇÃO DE DADOS | 📅 16/03 a 01/04/2026

🧾 Resumo
Cliente iniciou envio de base de dados para importação, porém em formatos diferentes do padrão. Foi orientado sobre necessidade de padronização em uma única planilha completa. Cliente ficou responsável por consolidar e finalizar o preenchimento para envio único.

⚠ Motivo/Contexto
Necessidade de estruturar base de produtos para importação inicial no sistema, garantindo consistência e viabilidade técnica.

📅 Solicitação/Ação do Cliente

* Envio inicial de base de dados em formato próprio (.zip) para validação
* Envio complementar de tabelas separadas (cores e composições)
* Tentativa de envio de dados de forma parcial (por partes)

✅ Alinhamento Realizado

* Base enviada inicialmente não estava no formato padrão de importação
* Orientado que arquivos em formatos diferentes ou separados não garantem viabilidade de importação
* Reforçado que o processo de importação é realizado uma única vez com a base completa
* Não é recomendado envio por partes (ex: produtos separados de cores/composição)
* Orientado utilizar a planilha padrão enviada pela Azoup ou adaptar tudo em um único modelo estruturado

📦 Situação da Base de Dados

* Cliente possui dados prévios (produtos, cores, composições), porém desestruturados
* Parte das informações foi enviada separadamente para análise
* Necessidade de consolidação em uma única planilha final

💰 Gestão de Horas

* Interações de validação e orientação realizadas via WhatsApp (não consumindo horas de treinamento)
* Importação será contabilizada dentro do processo de implantação após envio final

👤 Responsáveis

* Vinícius – Analista de Implantação
* Anderson – Analista de Implantação
* João Henrique – Responsável pelo envio e estruturação dos dados

🚀 Próximos Passos

* Cliente consolidar todos os dados em uma única planilha completa
* Preencher base completa de produtos (seguindo padrão orientado)
* Enviar planilha final para validação e importação
* Após envio, equipe terá até 3 dias úteis para realizar a importação dos dados', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), 'f51a9f52-fbe5-4936-945a-8ee79d163730', NULL, NULL, '2026-04-06 17:23:02.817401+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('b79c2a17-41a1-44a6-a1b3-64579b137261', '📌 BRAND CONFECÇÃO – PRIMEIRO CONTATO | 📅 11/03/2026

🧾 Resumo
Primeiro contato realizado com o cliente para boas-vindas, apresentação do responsável pela implantação e alinhamento inicial para agendamento da reunião de alinhamento.

📅 Ação Realizada

* Apresentação do analista responsável (Vinícius)
* Explicação sobre a Reunião de Alinhamento e próximos passos do projeto
* Sugestão de datas e horários para agendamento
* Envio do Formulário de Boas-Vindas

✅ Retorno do Cliente

* Cliente demonstrou boa receptividade
* Confirmou interesse no agendamento
* Informou preenchimento do formulário de boas-vindas

👤 Responsáveis

* Vinícius – Analista de Implantação
* Ademir – Responsável pelo projeto no cliente

🚀 Próximos Passos

* Confirmar data e horário da Reunião de Alinhamento
* Realizar reunião para apresentação completa do processo de implantação
* Iniciar estruturação do projeto conforme respostas do formulário', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), 'dccf443e-93c7-4008-bed6-959515e6114f', NULL, NULL, '2026-04-06 17:25:09.050236+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('b4c86bd1-1943-4e70-abea-c3a104707ca8', '📌 BRAND CONFECÇÃO – FORMULÁRIO DE BOAS-VINDAS

🧾 Dados Gerais

* Responsável pelo preenchimento: Ademir Tegani
* Empresa: Brand Confecção Ltda
* Segmento: Uniformes
* Regime Tributário: Não informado
* Tempo de atuação: 8 anos

📦 Controles Atuais

* Controle de estoque de produtos acabados: Não informado
* Controle de estoque de matéria-prima: Não informado
* Controle de produção: Utiliza Excel
* Forma atual de controle: Planilhas

📊 Produtos, Matéria-Prima e Produção

* Quantidade de produtos: Aproximadamente 7
* Tipos de matéria-prima: Aproximadamente 10
* Máquinas: 1 desktop e 5 notebooks

👥 Equipe e Acessos

* Total de usuários do sistema: 4 pessoas
* Estrutura da equipe:

  * Renan – Dono – Acesso Total
  * Ademir – Financeiro – Acesso Total
  * Rafael – Produção – Sem acesso ao financeiro
  * Caio – Representante – Acesso a vendas e estoque

📅 Organização da Implantação

* Prazo estimado para devolução da planilha: 3 dias
* Disponibilidade: Sexta-feira mais limitada, demais dias flexíveis

🎯 Expectativas com o Projeto

* Melhorar gestão de vendas, produção e estoque

🔄 Processo Atual

* Operação baseada em estoque
* Processo inicia na ordem de produção (OP)
* Separação de pedidos conforme demanda
* Produtos padronizados

⚠ Observações

* Não foram informadas particularidades adicionais
* Operação já possui certa organização baseada em estoque

🎓 Treinamentos e Responsáveis

* Responsável pelos treinamentos: Ademir
* Responsável principal pelo projeto: Ademir

🚀 Pontos de Atenção

* Estrutura enxuta (poucos produtos) → implantação tende a ser mais rápida
* Já possui controle via Excel → facilitará transição para o sistema
* Importante alinhar bem fluxo de produção baseado em estoque + OP', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), 'dccf443e-93c7-4008-bed6-959515e6114f', NULL, NULL, '2026-04-06 17:26:05.990094+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('393a4eea-6b1c-4d51-9202-bc17afacc13b', '📝 FORMULÁRIO DE BOAS-VINDAS – ANESA UNIFORMES

1️⃣ Dados Gerais
✍️ Nome: Vanessa
💼 Empresa: ANESA UNIFORMES E BORDADOS
🎯 Segmento: Uniformes e Bordados
💰 Regime Tributário: MEI
⏳ Tempo de atuação: 26 anos

2️⃣ Controles Atuais
📦 Estoque de produtos acabados: não consegue controlar como deveria
🧵 Estoque de matéria-prima: não realiza controle
⚙️ Controle de produção: tenta fazer pelo ClickUp

3️⃣ Produtos e Matéria-Prima
👕 Número aproximado de produtos: ~600 peças
🧷 Tipos de tecidos e aviamentos: não informado

4️⃣ Equipe e Acessos
👥 Número de usuários do sistema: 3

* Vanessa – Proprietária (Financeiro, Vendas, Produção)
* Daniel – Produção e Bordado
* Lucas – Controle de Estoque

5️⃣ Implantação e Reuniões
📊 Planilha de produtos: previsão de devolução em 7 dias
📅 Disponibilidade para reuniões: todos os dias, desde que agendado
💻 Responsáveis por treinamentos online:

* Vanessa – Financeiro, Vendas, Produção
* Daniel – Produção e Vendas
* Lucas – Estoque

6️⃣ Processos e Particularidades
🛠 Fluxo atual: produção e gestão segue modelo padrão de pequenas confecções
🪡 Detalhe específico: bordados para outras confecções, demanda atenção especial

7️⃣ Expectativas com a Implantação
⏱ Resolver problemas de produção e prazo de entrega
📈 Otimizar controle de estoque e planejamento', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '9a2aaacd-6f11-4931-b41d-b7c103006919', NULL, NULL, '2026-04-06 18:08:04.415058+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('306a3124-9d5a-404d-8cb7-7a46bd6caba8', '📌 BRAND CONFECÇÃO – REUNIÃO DE ALINHAMENTO | 📅 13/03/2026

🧾 Resumo

* Realizada reunião de alinhamento inicial do projeto de implantação
* Apresentado plano contratado (Basic – 30h)
* Definida comunicação via WhatsApp
* Alinhadas etapas da implantação e metodologia de treinamentos
* Definidas prioridades iniciais como importação de produtos e etiquetas

⚠ Motivo/Contexto

* Início do projeto
* Necessidade de organizar processo de implantação e alinhar expectativas
* Preparação para início da Fase 01 (Vendas)

📅 Solicitação/Ação do Cliente

* Confirmar plano contratado
* Iniciar uso do sistema para vendas e emissão de NF-e
* Configurar etiquetas de produtos com prioridade
* Enviar planilha de produtos para importação (84 itens com variações)
* Melhorar controle de estoque e produção
* Permitir acesso de representantes apenas para vendas/estoque

✅ Alinhamento Realizado

Plano e Horas

* Plano Basic com 30h de consultoria e treinamento
* Horas não utilizadas ficam armazenadas
* Possibilidade de contratação de horas adicionais

Comunicação e Suporte

* Comunicação via grupo de WhatsApp
* Envio de links, gravações e materiais pelo grupo
* Suporte técnico disponível após implantação

Instalação e Treinamentos

* Instalação via TeamViewer para validação das máquinas
* Treinamentos via Google Meet com gravação
* Cancelamentos devem ser informados com 24h de antecedência

Importação de Produtos

* Cliente possui cerca de 84 produtos com variações
* Cada variação deve ser uma linha na planilha
* Envio de exemplo inicial para validação recomendado
* Importação após recebimento completo da planilha

Etiquetas (Prioridade)

* Necessário sistema instalado e produtos cadastrados
* Cliente deve informar dimensões e formato das etiquetas
* Layout inicial com descrição e código de barras

Fases do Projeto

* Fase 01: Vendas (instalação, cadastros, vendas, NF-e)
* Fase 02: Produção
* Fase 03: Financeiro, estoque e gerencial
* Avanço somente após conclusão da fase anterior

Processos e Particularidades

* Produção baseada em Ordem de Produção para estoque
* Necessidade de controle de estoque em tempo real
* Representantes com acesso restrito
* Custo de produção variável por lote
* Controle de custos seguirá manual inicialmente

💰 Gestão de Horas

* Reunião contabilizada dentro do plano contratado
* Consumo estimado de 1h30

👤 Responsáveis

* Azoup: Vinícius / Anderson
* Cliente: Ademir / Rafael

🚀 Próximos Passos

* Cliente enviar exemplo inicial da planilha de produtos
* Cliente finalizar e enviar planilha completa
* Cliente instalar TeamViewer nas máquinas
* Azoup validar estrutura e iniciar importação
* Azoup enviar cronograma da Fase 01
* Definir layout e medidas das etiquetas', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), 'dccf443e-93c7-4008-bed6-959515e6114f', NULL, NULL, '2026-04-06 17:27:55.06059+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('6fac8b0a-4614-496d-bd2f-8fea41ad1627', '📌 BRAND CONFECÇÃO – PLANILHAS ENVIADAS | 📅 13/03 a 16/03/2026

🧾 Resumo

* Enviado link da pasta com gravações dos treinamentos
* Cliente iniciou tratativas para envio da planilha de produtos
* Alinhadas informações necessárias para etiquetas (layout e conteúdo)
* Cliente ficou de finalizar e enviar planilha de produtos

⚠ Motivo/Contexto

* Continuidade do processo após reunião de alinhamento
* Preparação para importação de produtos e configuração de etiquetas

📅 Solicitação/Ação do Cliente

* Solicitação de contato rápido via ligação
* Envio das medidas das etiquetas para configuração
* Definição das informações que devem constar na etiqueta
* Finalização da planilha de produtos para envio

✅ Alinhamento Realizado

Planilhas e Importação

* Cliente ainda em processo de preenchimento da planilha de produtos
* Importação será realizada após envio completo da planilha

Etiquetas

* Cliente enviou medidas da etiqueta (largura aproximada de 84mm)
* Definido que etiqueta terá:

  * Descrição do produto (nome)
  * Tamanho
  * Código de barras
* Informação de cor não será necessária na etiqueta

Comunicação

* Contato mantido via WhatsApp
* Link da pasta de gravações disponibilizado para consulta

💰 Gestão de Horas

* Interações rápidas via WhatsApp (sem consumo de horas)

👤 Responsáveis

* Azoup: Vinícius
* Cliente: Ademir / Rafael

🚀 Próximos Passos

* Cliente finalizar e enviar planilha de produtos
* Azoup realizar validação da planilha
* Azoup iniciar importação dos dados
* Configuração do layout de etiquetas conforme medidas e padrão definido', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), 'dccf443e-93c7-4008-bed6-959515e6114f', NULL, NULL, '2026-04-06 17:29:46.665497+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('227f167a-78e0-400a-8554-2f931117daf7', '📌 BRAND CONFECÇÃO – PLANILHA DEVOLVIDA | 📅 16/03/2026

🧾 Resumo

* Cliente enviou a planilha de produtos preenchida
* Informado que o preenchimento foi realizado conforme orientações
* Solicitação já encaminhada para equipe de desenvolvimento

⚠ Motivo/Contexto

* Etapa necessária para importação dos produtos no sistema
* Liberação para início da estruturação da base de dados

📅 Solicitação/Ação do Cliente

* Envio da planilha de produtos completa
* Confirmação de que seguiu o modelo orientado

✅ Alinhamento Realizado

* Planilha recebida com sucesso
* Estrutura considerada apta para envio ao desenvolvimento
* Abertura de solicitação para importação dos dados

💰 Gestão de Horas

* Atividade operacional (sem consumo de horas de treinamento)

👤 Responsáveis

* Azoup: Vinícius / Equipe de Desenvolvimento
* Cliente: Ademir

🚀 Próximos Passos

* Equipe de desenvolvimento realizar importação dos produtos
* Azoup validar dados importados
* Seguir com cronograma da Fase 01 (Vendas)', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), 'dccf443e-93c7-4008-bed6-959515e6114f', NULL, NULL, '2026-04-06 17:30:46.058659+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('5b39c0fb-3262-4c58-a7ef-70aa4f946fd8', '📌 BRAND CONFECÇÃO – CRONOGRAMA ENVIADO | 📅 16/03/2026

🧾 Resumo

* Enviado cronograma da Fase 01 (Vendas) após importação dos dados
* Datas organizadas para instalação, configurações, treinamentos e virada de sistema
* Cliente validou e aprovou o cronograma

⚠ Motivo/Contexto

* Continuidade do projeto após importação dos produtos
* Organização das agendas da Fase 01

📅 Solicitação/Ação do Cliente

* Validação das datas e horários propostos
* Confirmação para lançamento em agenda
* Compromisso de avisar reagendamentos com 24h de antecedência

✅ Alinhamento Realizado

Cronograma Fase 01 (Vendas)

* 17/03/2026 – 14h30 às 16h30 → Instalação do Sistema (Conexão Remota)

* 18/03/2026 – 14h30 às 16h30 → Configurações (Conexão Remota)

* 20/03/2026 – 09h00 às 12h00 → Treinamento de Cadastros: Vendas (Online)

* 24/03/2026 – 09h00 às 12h00 → Treinamento de Vendas (Online)

* 26/03/2026 – 09h00 às 12h00 → Treinamento de NF-e (Online)

* 30/03/2026 – 14h00 às 18h00 → Virada de Sistema: Vendas (Acompanhamento Online)

Etiquetas

* Equipe de desenvolvimento priorizando configuração dos layouts
* Expectativa de já auxiliar na emissão de etiquetas após instalação

💰 Gestão de Horas

* Horas serão contabilizadas conforme execução das agendas

👤 Responsáveis

* Azoup: Vinícius / Equipe Técnica
* Cliente: Ademir

🚀 Próximos Passos

* Lançamento do cronograma na agenda
* Início da instalação na data programada
* Sequência das configurações e treinamentos conforme cronograma
* Apoio na emissão inicial de etiquetas após instalação', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), 'dccf443e-93c7-4008-bed6-959515e6114f', NULL, NULL, '2026-04-06 17:33:32.36246+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('46f8edb7-43e6-4265-be69-596dbb56a8a1', '📊 PLANILHA ENVIADA – ANESA UNIFORMES

📅 06/03/2026
Vinícius enviou a planilha de produtos acabados para preenchimento e informou que qualquer dúvida poderia ser tirada com a equipe Azoup.

📅 10/03/2026
Vinícius perguntou se a equipe estava conseguindo preencher a planilha e solicitou que enviassem cerca de 5 produtos de exemplo para validação antes de completar todo o preenchimento.

📅 11/03/2026
Vinícius sugeriu agrupar os tamanhos e cores que pertencem ao mesmo produto com mesmo preço para facilitar o preenchimento.
Vanessa confirmou que estava tudo certo e que ia justamente perguntar sobre isso.

📅 13/03/2026
Vinícius fez um novo check-in perguntando como estavam as coisas e reforçando que poderiam tirar dúvidas à vontade.

📅 16/03/2026
Vinícius perguntou novamente se a planilha estava sendo preenchida e se havia dúvidas.
Vanessa respondeu que não conseguiu avançar na semana anterior. 🙏

📌 Observações

* A planilha é para importação de produtos acabados no sistema Azoup.
* Validação inicial com 5 produtos é necessária antes de preencher completamente.
* Agrupar cores e tamanhos com mesmo preço facilita o preenchimento.
* Vanessa teve dificuldade em avançar na semana passada, indicando possível atraso no envio.', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '9a2aaacd-6f11-4931-b41d-b7c103006919', NULL, NULL, '2026-04-06 18:10:47.335701+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('5137b2eb-2110-49e4-944a-2aab3c6c08f4', '📌 BRAND CONFECÇÃO – INSTALAÇÃO DO SISTEMA | 📅 17/03/2026

🧾 Resumo

* Realizada instalação do sistema nas máquinas da empresa
* Configuração das máquinas de emissão de NF-e e estação de etiquetas
* Instalação também realizada em máquina adicional da equipe
* Processo concluído com orientações técnicas sobre desempenho

⚠ Motivo/Contexto

* Início da Fase 01 (Vendas) conforme cronograma
* Preparação do ambiente para utilização do sistema e treinamentos

📅 Solicitação/Ação do Cliente

* Disponibilização dos acessos via TeamViewer
* Envio de e-mails para emissão de NF-e e contador
* Envio do certificado digital e senha
* Liberação das máquinas para instalação

✅ Alinhamento Realizado

Instalação

* Instalação realizada na máquina principal de emissão de NF-e
* Instalação realizada na máquina de etiquetas (Rafael)
* Instalação realizada na máquina adicional (Renan)
* Orientação para futuras instalações (ex: representantes)

Configurações iniciais

* Configurado e-mail de envio de NF-e
* Configurado e-mail do contador para XML
* Instalado certificado digital A1
* Validado acesso remoto via TeamViewer

Etiquetas

* Alinhado que não necessita configuração específica
* Funcionalidade já nativa no sistema

Observações técnicas

* Identificada possível lentidão em uma das máquinas
* Recomendado mínimo de 8GB de RAM
* Máquina já apresentava alto consumo antes do uso do sistema

💰 Gestão de Horas

* Início: 14h31
* Término: 15h53
* Tempo total: 1h22
* Tempo contabilizado: 1h30

👤 Responsáveis

* Azoup: Anderson
* Cliente: Ademir / Rafael / Renan

🚀 Próximos Passos

* Seguir para etapa de configurações
* Validar funcionamento nas máquinas instaladas
* Prosseguir com treinamentos conforme cronograma
* Avaliar melhoria de desempenho na máquina com lentidão', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), 'dccf443e-93c7-4008-bed6-959515e6114f', NULL, NULL, '2026-04-06 17:37:41.965896+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('f06a5842-1a25-4380-8643-178b36e2c6af', '📌 BRAND CONFECÇÃO – CONFIGURAÇÕES | 📅 18/03/2026

🧾 Resumo

* Realizada etapa de configurações iniciais do sistema
* Ajustes feitos parcialmente via acesso remoto e finalizados em nuvem
* Corrigido regime tributário da empresa
* Validado funcionamento da impressão de etiquetas

⚠ Motivo/Contexto

* Continuidade da Fase 01 após instalação do sistema
* Necessidade de ajustar parâmetros iniciais para uso correto do sistema

📅 Solicitação/Ação do Cliente

* Liberação de acesso à máquina para validação inicial
* Correção do regime tributário informado anteriormente
* Validação da impressão de etiquetas
* Envio de contato do contador para alinhamentos fiscais

✅ Alinhamento Realizado

Configurações gerais

* Acesso remoto realizado para validação inicial da máquina
* Demais configurações realizadas em nuvem para não impactar uso da máquina
* Ambiente validado como funcional

Fiscal

* Corrigido regime tributário para Lucro Presumido
* Identificada necessidade de alinhamento fiscal com contador
* Solicitado envio das regras fiscais
* Contato do contador (Adriano – Fiscotec) compartilhado
* Equipe Azoup realizou contato direto com contador

Etiquetas

* Ajustes realizados remotamente
* Inicialmente identificado problema na impressão
* Após validação, funcionamento normal confirmado pelo cliente

💰 Gestão de Horas

* Início: 14h42
* Término: 15h39
* Tempo total: 0h57
* Tempo contabilizado: 1h00

👤 Responsáveis

* Azoup: Anderson
* Cliente: Ademir / Rafael

🚀 Próximos Passos

* Aguardar retorno do contador com regras fiscais
* Validar emissões fiscais após configuração completa
* Seguir com treinamentos conforme cronograma
* Acompanhar uso inicial das etiquetas e ajustes se necessário', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), 'dccf443e-93c7-4008-bed6-959515e6114f', NULL, NULL, '2026-04-06 17:42:55.479808+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('2e4c87ad-639a-432f-86a7-9045f93c1e41', '📌 PRIMEIRO CONTATO – MALHA & CIA | 📅 11 a 24/03/2026

🧾 Resumo

* Primeiro contato com cliente realizado via WhatsApp
* Apresentação do analista de implantação Vinícius
* Formulário de Boas-Vindas enviado e preenchido pelo cliente
* Agendamento da reunião de alinhamento confirmada

⚠ Motivo/Contexto

* Introdução ao processo de implantação do sistema
* Necessidade de coletar informações via formulário para preparar reunião
* Ajuste de agenda da reunião conforme disponibilidade do cliente

📅 Solicitação/Ação do Cliente

* Confirmação de participação na reunião de alinhamento
* Preenchimento do Formulário de Boas-Vindas
* Solicitação de remarcação de reunião

✅ Alinhamento Realizado

* Apresentação inicial do analista e boas-vindas
* Reunião de alinhamento proposta para 13/03, depois remarcada para 16/03 e finalmente agendada para 24/03 às 11h
* Formulário de Boas-Vindas essencial para preparativos da reunião, preenchido e enviado pelo cliente

💰 Gestão de Horas

* Contato distribuído em diversas mensagens entre 11/03 e 24/03
* Tempo de acompanhamento e comunicação contabilizado como preparação inicial da implantação

👤 Responsáveis

* Azoup: Vinícius
* Cliente: Kessia

🚀 Próximos Passos

* Realizar reunião de alinhamento na data agendada
* Revisar informações do formulário para definir etapas de implantação
* Dar continuidade ao processo de implantação conforme cronograma do cliente', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), 'be964773-2599-4300-86c1-5d7dae304952', NULL, NULL, '2026-04-06 17:48:01.097902+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('45cc6c1f-c8ac-4a4b-8531-0ce7068f7c0c', '📌 FORMULÁRIO DE BOAS-VINDAS – MALHA & CIA

🧾 Resumo

* Primeiros dados coletados para iniciar a jornada do cliente Azoup
* Informações sobre empresa, equipe, produtos e processos
* Formulário preenchido e retornado pelo cliente

⚠ Motivo/Contexto

* Coletar informações essenciais para preparar reuniões e implantação
* Entender fluxo atual, controles e expectativas do cliente

📅 Solicitação/Ação do Cliente

* Preenchimento completo do Formulário de Boas-Vindas
* Detalhes sobre processos atuais, equipe e máquinas
* Informações sobre disponibilidade para reuniões

✅ Alinhamento Realizado

1. Dados Gerais

* Nome de quem preencheu: Maria Kessia Leônidas de Sá Vasconcelos Uchoa 👤
* Nome da empresa: Malhaecia fardamentos e camisetas 🏢
* Segmento: Uniformes 👕
* Regime Tributário: informado no formulário 💰
* Tempo de atuação: 31 anos ⏳

2. Controles Atuais

* Controle de estoque de produtos acabados: ✅ Sim
* Controle de estoque de matéria-prima: ✅ Sim
* Controle de produção: Mapa de produção preenchido após vendas; conferência manual em caderno e planilhas 📋✏️

3. Produtos, Matéria-Prima e Produção

* Produtos comercializados: por volta de 25 bases 🛍️
* Tipos de tecidos e aviamentos: por volta de 20 🧵
* Máquinas que usarão o sistema: 7 Desktops e 4 Notebooks 💻🖥️

4. Equipe e Acessos ao Sistema

* Pessoas que usarão o sistema: 9 👥
* Colaboradores e funções:
  1- Késsia - Fundadora / Diretoria administrativa
  2- José - Diretor
  3- Neide - Consultora de vendas
  4- Rafaela - Vendedora
  5- Júlia - Supervisora de produção
  6- Renato - Auxiliar de designer
  7- Kauê - Art finalista / Auxiliar de designer
  8- Girlanya - Assistente financeiro
  9- Augusto - Auxiliar de compras e estoque

5. Organização da Implantação

* Planilha de produtos acabados: prazo estimado de devolução 5 dias ⏱️
* Disponibilidade para reuniões online: flexível, idealmente sábado até meio-dia 🗓️

6. Expectativas com o Projeto

* Objetivos principais:
  1- Saber índices de produtividade, lucratividade e pontualidade 📊
  2- Reduzir custos com estoques e mão de obra ociosa 💸
  3- Inovação de processos 🔄
  4- Preparação para vendas online em todo Brasil 🌎
* Fluxo atual resumido: digitação de orçamentos / criação de layouts, aprovação, geração de pedido, ficha técnica, mapa de produção, impressão de mapas, conferência manual, embalagem e despacho. Sem controle real, gerando horas extras e retrabalhos 📑⚠️
* Particularidades: impontualidade nas entregas, inconsistência e irregularidade nos registros ⏳❌

7. Treinamentos e Responsáveis

* Responsáveis por setores nos treinamentos online:
  Kessia - Geral 👩‍💼
  Neide - Vendas 🛒
  Girlanya - Financeiro 💵
  Augusto - Cadastro de matéria-prima / Controle de estoque 📦
  Renato e Kauê - Cadastro de produtos / Ordem de produção 🖥️
* Pessoa-chave para acompanhamento do projeto: Kessia - Diretoria administrativa 🏢', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), 'be964773-2599-4300-86c1-5d7dae304952', NULL, NULL, '2026-04-06 17:54:04.443569+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('01124ec0-9ede-4cd9-ac1b-854deac67d8f', '📌 MALHA & CIA – REUNIÃO DE ALINHAMENTO | 📅 25/03/2026

🧾 Resumo

* Kickoff detalhou implantação do sistema ERP Azoup
* Metodologia de treinamento, 4 fases do projeto e próximos passos do cadastro inicial de produtos
* Plano Pro: 50 horas de consultoria para instalações e treinamentos

⚠ Motivo/Contexto

* Início do projeto ERP específico para fábricas de uniformes
* Preparar cadastro de produtos e configuração inicial do sistema
* Alinhar metodologia, fases e comunicação do projeto

📅 Solicitação/Ação do Cliente

* Preenchimento da planilha de produtos enviados pelo CS Azoup 📝
* Participação dos colaboradores principais nas reuniões e treinamentos 👥
* Validação de cronograma e datas para Fase 1

✅ Alinhamento Realizado

* Equipe Apresentada: Vinícius e Anderson – Analistas de Implantação Azoup 👨‍💻
* Comunicação e suporte: centralizados via WhatsApp 📱; grupo criado pós-reunião
* Duração da reunião: estimada 40-60 minutos ⏱️
* Objetivo: apresentar etapas de implantação, treinamentos, configurações e esclarecer dúvidas ❓
* Sistema Azoup confirmado como ERP nichado para fábricas de uniformes 🏭

📌 Fases e Metodologia do Projeto

1. Fase 1 – Vendas (20 dias úteis) 💰

* Cadastro inicial do produto final para otimizar uso do sistema e evitar problemas no estoque
* Instalação remota via TeamViewer para verificação técnica 💻
* Treinamentos: Cadastro, Vendas e Nota Fiscal
* Go Live: acompanhamento do uso do sistema e suporte

2. Fase 2 – Financeiro (5 dias úteis) 💵

* Contas a pagar e receber, boletos
* Envio de informações bancárias para configuração

3. Fase 3 – Produção (20 dias úteis) 🧵

* Cadastro de matéria-prima, faccionistas, local de produção
* Fichas técnicas de consumo e precificação
* Controle de produção e estoque da matéria-prima

4. Fase 4 – Relatórios e Finalização (5 dias úteis) 📊

* Fluxo de caixa, DRE e BI para decisões estratégicas
* Validação de todas as fases e migração para suporte técnico

📌 Cadastro e Configurações Iniciais

* Planilha de produtos enviada pelo CS Azoup 📝
* Preenchimento inicial de 3 a 5 produtos para validação da estrutura
* Informações obrigatórias: nome do modelo, unidade de venda, variações de cores e tamanhos
* Informações opcionais: códigos, valores de custo; valores de venda para varejo e atacado importantes 💰
* Após devolução da planilha, 3 dias para importação e configuração da base
* Cronograma da Fase 1 será enviado após validação dos dados

📌 Treinamentos e Logística

* Treinamentos via Google Meet, com compartilhamento de tela e gravações armazenadas no Google Drive 💻📹
* Controle de horas: avisar cancelamentos com 24h de antecedência
* Planilha de controle de horas compartilhada no grupo do WhatsApp 🗂️

📌 Detalhes Operacionais

* Produtos personalizados: sistema permite cadastro de produtos-base e observações para detalhes específicos ✂️
* Vinculação de imagens ao pedido, útil para produtos exclusivos ou recorrentes 🖼️
* Metodologia de implantação: começar pelas vendas evita inconsistências no estoque inicial 🔄

🚀 Próximos Passos

* CS Azoup: criar grupo de WhatsApp, enviar planilha de produtos, links do Google Drive e planilha de controle de horas 📱
* Cliente: Maria Kessia adicionará colaboradores-chave no grupo 👥
* Planilhas opcionais: fornecedores e clientes podem ser enviadas para preenchimento', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), 'be964773-2599-4300-86c1-5d7dae304952', NULL, NULL, '2026-04-06 17:56:07.381779+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('502626db-122e-4a21-af35-9e2f53dde273', '📌 MALHA & CIA – PLANILHAS ENVIADAS | 📅 25-30/03/2026

🧾 Resumo

* Envio das planilhas citadas na reunião de alinhamento
* Inclui planilhas de produtos, fornecedores e clientes (opcionais)
* Comunicação centralizada via WhatsApp para dúvidas e acompanhamento 📱

⚠ Motivo/Contexto

* Preparar cadastro inicial de produtos para início da Fase 1 do sistema Azoup
* Garantir que as informações estejam corretas e completas antes da importação

📅 Solicitação/Ação do Cliente

* Preencher planilha de produtos durante o final de semana 📝
* Validar informações para envio à equipe Azoup
* Tirar dúvidas diretamente com o CS via WhatsApp

✅ Alinhamento Realizado

* 25/03: Vinícius enviou as planilhas e se colocou à disposição para dúvidas 👨‍💻
* 27/03: Kessia confirmou que trabalharia na planilha de produtos durante o final de semana 🗂️
* 30/03: Vinícius reforçou disponibilidade para suporte e esclarecimentos

🚀 Próximos Passos

* Cliente: finalizar preenchimento da planilha de produtos
* CS Azoup: acompanhar preenchimento, validar estrutura e preparar cronograma da Fase 1
* Tirar dúvidas diretamente via WhatsApp durante o processo', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), 'be964773-2599-4300-86c1-5d7dae304952', NULL, NULL, '2026-04-06 17:57:00.73537+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('0b7271a6-9e1a-4332-b099-b5fc0cf75f4c', '🏢 ANESA UNIFORMES - REUNIÃO DE ALINHAMENTO | 📅 6 de março de 2026

Resumo
A reunião detalhou o processo de implantação do sistema Azoup com a equipe da Anesa Uniformes, conduzida por Vinícius, analista de implantação. Foram apresentados os treinamentos online, o uso controlado das 50 horas do plano "Pro" e o suporte técnico pós-implantação. O processo será dividido em quatro fases:
1️⃣ Fase 1 – Vendas
2️⃣ Fase 2 – Financeiro
3️⃣ Fase 3 – Produção
4️⃣ Fase 4 – Gerencial

Foi solicitado que a Anesa Uniformes preencha a planilha de produto acabado para importação em massa, validando alguns exemplos previamente. Confirmado que o Azoup suporta emissão de NFE, mas a NFSe continuará fora do sistema.

Detalhes

🔹 Alinhamento e Introdução
Vinícius iniciou explicando o processo de implantação e confirmou que todas as reuniões seriam gravadas. A equipe contratou o plano "Pro" com 50 horas de consultoria e treinamento.

🔹 Gerenciamento de Horas e Suporte
Treinamentos online via Google Meet. Alterações de datas devem ser avisadas com 24h de antecedência. Horas não utilizadas podem ser armazenadas; horas extras têm custo adicional. Suporte técnico disponível após implantação para dúvidas pontuais, como certificado digital ou emissão de notas.

🔹 Comunicação e Infraestrutura
Será criado um grupo de WhatsApp para centralizar comunicação, compartilhar links, gravações e tirar dúvidas. A primeira agenda será a instalação para verificar requisitos do sistema nos computadores.

🔹 Planilha de Produto Acabado
Planilha enviada para preenchimento, base essencial para o sistema. Informações solicitadas: nome do produto, NCM, variações de escola e tamanho. Nome da escola sugerido na descrição para facilitar vendas.

🔹 Variações de Preço e Preenchimento
Variações de valor ocorrem por modelo e faixa de tamanho. O sistema exige linhas separadas apenas quando há alteração de valor. Solicitação de preencher cinco produtos de exemplo para validação antes de completar a planilha.

🔹 Fluxo de Implantação – Fase 1 (Vendas)
Após envio da planilha, Azoup terá três dias úteis para importação. Expectativa de uso em até 20 dias úteis. Inclui instalação (2h), configuração de login e fiscal, treinamentos de Cadastro (4h), Vendas e Fiscal (emissão de cupom e nota).

🔹 Fluxo de Implantação – Fases 2 a 4
Fase 2 – Financeiro (5 dias úteis): controle financeiro, contas a pagar/receber, boletos. Segunda planilha de matéria-prima enviada.
Fase 3 – Produção (20 dias úteis): cadastro de terceirizados e matérias-primas, ficha técnica e status de produção.
Fase 4 – Gerencial (5 dias úteis): relatórios de fluxo de caixa, DRE e BI.

🔹 Cadastro de Uniformes Personalizados
Produtos com personalização (bordados, estampas) devem usar campo de Observação e preço ajustado na digitação do pedido. Planilha deve incluir todos os produtos para venda. Catálogo configurado em treinamento específico da Fase 1.

🔹 Serviços de Bordado
Controle interno feito via ordem de produção, NFSe não integrada ao Azoup. Confirmar com contador se nota é de serviço ou venda.

Próximos Passos

📌 CS Azoup criará grupo no WhatsApp e enviará planilha de produto acabado.
📌 Anesa Uniformes enviará alguns exemplos preenchidos para validação antes de completar a planilha.
📌 Anesa Uniformes confirmará com contador sobre NFSe e fornecerá exemplo, se possível.
📌 CS Azoup enviará segunda planilha de matéria-prima durante Fase 2 (Financeiro).', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '9a2aaacd-6f11-4931-b41d-b7c103006919', NULL, NULL, '2026-04-06 18:09:27.919969+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('d8945183-8af3-4e2f-8e6d-f26b3174a315', '📦 PLANILHA DEVOLVIDA – ANESA UNIFORMES

📅 Data do retorno
Vinícius confirmou o recebimento da planilha preenchida por Vanessa.

✅ Ações realizadas

* A planilha será encaminhada para a equipe de desenvolvimento.
* O cronograma da Fase 1 (Vendas) será enviado em breve com as datas sugeridas.

👍 Observação

* Retorno rápido e alinhamento para dar continuidade à implantação do sistema Azoup.', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '9a2aaacd-6f11-4931-b41d-b7c103006919', NULL, NULL, '2026-04-06 18:11:13.491632+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('d8d8c5d6-5aae-4aa5-ace0-4e7518343a9e', '📅 CRONOGRAMA ENVIADO – ANESA UNIFORMES

👋 Vinícius enviou o cronograma sugerido para validação de Vanessa, com datas e horários para instalação, configurações e treinamentos da Fase 01 (Vendas).

📌 Cronograma Fase 01 – Vendas

* 20/03/2026 – 14h30 às 16h30 – Instalação do Sistema [Conexão Remota]
* 24/03/2026 – 14h30 às 16h30 – Configurações [Conexão Remota]
* 26/03/2026 – 09h00 às 12h00 – Treinamento de Cadastros: Vendas [Reunião Online]
* 31/03/2026 – 09h00 às 12h00 – Treinamento de Vendas [Reunião Online]
* 02/04/2026 – 09h00 às 12h00 – Treinamento de NF-e [Reunião Online]
* 06/04/2026 – 14h30 às 17h30 – Virada de Sistema: Vendas [Acompanhamento Online]

✅ Validação e ajustes

* Vanessa confirmou a instalação de 20/03/2026.
* Vinícius sugeriu ajustar horários dos treinamentos para 16h00 às 17h30, se necessário.

📌 Observação

* Ficou acordado que qualquer dúvida seria esclarecida antes do lançamento oficial na agenda.', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '9a2aaacd-6f11-4931-b41d-b7c103006919', NULL, NULL, '2026-04-06 18:12:06.49728+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('765e3322-ead2-4db4-9f22-c71d1f86242d', '💻 INSTALAÇÃO DO SISTEMA – ANESA UNIFORMES | 📅 20/03/2026

👋 Vinícius conduziu a instalação do sistema nos computadores da Anesa Uniformes, com foco na configuração do sistema e emissão de NF-e.

🖥️ Máquinas e acesso remoto

* Computadores que vão emitir NF-e: apenas o computador principal
* Computadores que vão utilizar o sistema: computador principal e computador do atendimento
* Sistema operacional: Windows 10
* Acesso remoto preferencial: TeamViewer (licença disponível, sem limite de tempo)
* Anydesk pode ser usado, mas possui limitação sem licença
* IDs e senhas do TeamViewer fornecidos para iniciar a instalação

⚙️ Procedimento de instalação

* Conexão remota iniciada no computador principal → transferência de arquivos e início da instalação
* Conexão e instalação no computador do atendimento em seguida
* Testes de conexão e funcionamento realizados
* Problemas de conexão solucionados com reenvio de senha e verificação de internet

⏱️ Duração das etapas (arredondadas)

* Instalação inicial do sistema: 2h00
* Configuração do certificado NF-e: 1h30
* Testes de funcionamento e conexão remota: 1h30

📝 Observações

* A instalação foi concluída com sucesso em ambos os computadores
* Sistema pronto para uso e emissão de NF-e no computador principal
* A equipe pode solicitar suporte adicional caso necessário', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '9a2aaacd-6f11-4931-b41d-b7c103006919', NULL, NULL, '2026-04-06 18:14:54.423238+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('8b872bec-9dea-4949-b629-9b9e73b7fef1', '⚙️ CONFIGURAÇÕES – ANESA UNIFORMES | 📅 24/03/2026

👋 Vinícius iniciou as configurações do sistema, incluindo a definição das máquinas que emitiriam NF-e e a integração do certificado digital.

🖥️ Máquinas e acesso

* Computadores que vão emitir NF-e indicados pela equipe
* TeamViewer usado para acesso remoto
* Problemas de conexão resolvidos após ajustes de internet e liberação das máquinas

📧 Emails necessários para emissão de nota fiscal

* Empresa: [atelieanesa@hotmail.com](mailto:atelieanesa@hotmail.com)
* Contador: [clasolucoescontabeis@hotmail.com](mailto:clasolucoescontabeis@hotmail.com)

⚙️ Procedimentos realizados

* Conexão ao computador principal e verificação do acesso remoto
* Tentativa de conexão na segunda máquina com problemas de internet → resolvido
* Instalação e configuração do certificado digital NF-e
* Testes finais de comunicação e liberação do sistema

⏱️ Duração total (arredondada)

* Início: 14h34
* Término: 17h43
* Tempo total aproximado: 3h15 → arredondado para 3h30

📝 Observações

* A equipe da Anesa Uniformes forneceu os emails para envio de NF-e
* Conexão remota via TeamViewer funcionou sem limitações
* Configuração concluída com sucesso e sistema pronto para uso', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '9a2aaacd-6f11-4931-b41d-b7c103006919', NULL, NULL, '2026-04-06 18:16:33.484432+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('19e912de-83ff-470e-997d-3ba83be8420f', 'Treinamento de Cadastros: Vendas – ANESA UNIFORMES | 26/03/2026
📅 Data: 26/03/2026
💻 Formato: Online via TeamViewer
🎯 Objetivo: Capacitar equipe para cadastro de fornecedores, clientes e produtos, ajustes fiscais e precificação, preparando o sistema para vendas e emissão de NF-e.

📡 Ajuste de Conexão

* Inicialmente, instabilidade de áudio via Wi-Fi 😕
* Solução: cabeamento do computador → conexão melhorou significativamente ✅
* Observação: disco rígido estava sobrecarregado (100%) e múltiplas abas abertas prejudicavam performance 💾

🔑 Acesso ao Sistema

* Login temporário: ADM / ADM123
* Demonstração de navegação básica: cadastro, controle financeiro, pedidos
* Dica: minimizar notificações para melhor visualização 👀

📋 Cadastro de Fornecedores

* Definição: entidades que geram gastos (ex.: Azoup, energia, internet, funcionários) 💰
* Funcionalidades:

  * Consulta, inclusão e gravação de cadastros
  * Importação de CNPJs via Receita Federal 🇧🇷
  * Campos obrigatórios: nome; Inscrição Estadual e dados de PF preenchidos manualmente
* Regras importantes:

  * Registros vinculados a movimentações não devem ser excluídos, apenas inativados
  * Exclusão apenas para registros criados por engano ❌

👥 Cadastro de Clientes

* Definição: entidades que geram receita 💵
* Tipos de cadastro:

  * Completo: obrigatório para emissão de nota fiscal (nome, CPF/CNPJ, e-mail, endereço completo)
  * Básico: suficiente para venda simples, apenas nome ou razão social
* Importação de dados: funciona apenas para CNPJs, dados de PF devem ser preenchidos manualmente ✍️

📦 Cadastro de Produtos

* Campos obrigatórios: descrição, tipo (produto acabado/matéria-prima), seção
* Campos importantes: grupo e subgrupo para organizar insumos
* Grade de tamanhos: apenas uma por produto (numérico ou P-GG) 📏
* Cores: cadastro obrigatório, confirmar seleção com Enter 🎨
* Aspectos fiscais: Grupo Fiscal e NCM, validar com contador

💰 Precificação e Estoque

* Estoque mínimo/máximo: referência, não limite fixo
* Tabela de preços: organizar precificações diferentes (ex.: atacado/varejo)
* Aplicar preços a todas as cores/tamanhos ou individualmente
* Preço de facção e simbologias/imagens discutidos para uso futuro 🖼️

🖨️ Impressão e Etiquetas

* Impressão de etiquetas de lavagem e alvejamento
* Sistema suporta impressoras de etiquetas; verificar compatibilidade com impressora comum
* Enviar foto e medidas da etiqueta para configuração de layout 📐

🧾 NF-e e Cupons Fiscais

* Diferença entre nota fiscal e cupom fiscal
* Sistema pode enviar PDF por e-mail
* Consultar contador sobre necessidade de impressora para cupom fiscal 📝

💡 Prática e Próximas Etapas

* Cadastrar pelo menos 2-3 fornecedores para prática 👩‍💼
* Testar cadastro, edição e gravação de produtos no sistema 🛠️
* Enviar foto da etiqueta atual com medidas para configuração
* CS Azoup verificará importação de cores e NCM na planilha enviada 📊', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '9a2aaacd-6f11-4931-b41d-b7c103006919', NULL, NULL, '2026-04-06 18:19:28.946281+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('9091af79-ca42-4a65-8253-08b546269b77', '📌 Primeiro Contato – Luiza Lingerie | 📅 19/02/2026
* 👋 Apresentação Vinícius: se apresentou como Analista de Implantação Azoup
* 🤝 Luiza Lingerie: pediu nome e contato, enviou links de redes e site
* 💬 Conversa rápida: “Olá Vinícius / Brigado / E aí / Fala”
* 📅 Reunião de Alinhamento agendada: 23/02/2026, 10h45–12h15
* 📝 Formulário de Boas-Vindas: https://forms.gle/49qJYwqdjNoXX6Hh8

✅ Ações pendentes:
* Confirmar presença na reunião
* Receber informações de contato para registro', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '74fbba58-ac87-4114-a216-e80f08557428', NULL, NULL, '2026-04-06 18:26:26.860196+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('15ecbf90-2c7e-4ab2-943e-3d1dbda39f73', 'LUIZA LINGERIE – FORMULÁRIO DE BOAS-VINDAS

Responsável pelo preenchimento: Luiz Carlos
E-mail: luizalingerie1010@gmail.com

📌 Dados da Empresa

Empresa: Luiza Lingerie Ltda

Segmento: Roupa íntima e fitness

Regime Tributário: Simples Nacional

Tempo de mercado: 13 anos

📦 Estrutura Atual

Quantidade aproximada:

50 modelos de produtos

50 tipos de matéria-prima

10 usuários utilizarão o sistema

📊 Controles Atuais

Estoque Produto Acabado:

Controlado via sistema G-Tech

Estoque Matéria-Prima:

Não realiza controle atualmente

Controle de Produção:

Realizado via planilhas

👥 Estrutura da Equipe (para criação de acessos)

Financeiro:

Luiz

Cleuza

Vendas:

Fabiana

Keiti

Ana Júlia

Produção e Corte:

Flávia

Jaqueline

Etiqueta e Acabamento:

Izaura

Natália

Pessoa-chave do projeto: Luiz Carlos

🕒 Disponibilidade para Treinamentos

Preferência: Período da manhã

🔄 Fluxo Atual da Empresa

Vendas via WhatsApp e videoconferência

Produção controlada por planilhas

Faturamento via sistema

NF-e e cupom fiscal emitidos pelo sistema

Entrega via transportadora com etiqueta gerada no sistema

Utilizam CRM para pós-vendas

🎯 Expectativa com a Implantação

Melhorar e organizar o controle de produção

Estruturar processos internos de forma mais eficiente', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '74fbba58-ac87-4114-a216-e80f08557428', NULL, NULL, '2026-04-06 18:26:42.660379+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('f6a5c4bb-37f3-4e96-9922-5ec304fd5f67', '📌 PROJETO LUIZA LINGERIE

📅 Cronograma Oficial – FASE 01

AZOUP & LUIZA LINGERIE

06/03/2026 – 10h30 às 12h30 → Instalação do Sistema

09/03/2026 – 14h30 às 16h30 → Configurações Internas

11/03/2026 – 09h00 às 12h00 → Treinamento de Cadastros

13/03/2026 – 09h00 às 12h00 → Treinamento de Vendas

17/03/2026 – 09h00 às 12h00 → Treinamento de NF-e

19/03/2026 – 09h00 às 12h00 → Virada de Sistema – Vendas', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '74fbba58-ac87-4114-a216-e80f08557428', NULL, NULL, '2026-04-06 18:27:15.274241+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('2f49b0d8-c43a-47aa-8aca-5a90b40e4930', '17/03/2026, 9h ás 10h - Atividade focada na finalização da implantação, com ajustes no sistema e validações operacionais. Foi estruturada e iniciada a importação da base de clientes e fornecedores, além da definição da etiqueta de transporte (8x10 cm) contendo NF, Pedido de Venda e contato do destinatário.

Foram identificados e corrigidos erros no lançamento de contas a receber (necessidade de confirmar com Enter e ajuste de série de documento), além de orientação sobre exclusão de contas e análise de inconsistências na base.

Também foi validado o modelo de etiqueta de produtos (grade PMG) e demonstrado o processo de emissão. Como próximos passos, ficou definido a configuração da impressora via acesso remoto para testes, verificação de acessos de usuários, cadastro do centro de custo e apoio na emissão inicial de notas e cupons fiscais.', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '74fbba58-ac87-4114-a216-e80f08557428', NULL, NULL, '2026-04-06 18:28:18.387344+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('34920982-b677-4344-ac9d-fb8790b1f1d7', 'LUIZA LINGERIE – REUNIÃO DE ALINHAMENTO | 📅 20/02/2026

Participantes:

Luiz

Cleuza

CS Azoup (Vinícius)

Contexto Inicial

Reunião para alinhamento da implantação (sem instalação nesta data).

Cliente contratou Plano Pro – 50 horas.

Treinamentos serão realizados via Google Meet e gravados.

Cancelamentos devem ocorrer com 24h de antecedência.

Horas não utilizadas ao final ficam como saldo para uso posterior.

Caso ultrapasse as 50h, será cobrado valor adicional.

Após implantação, suporte técnico ficará disponível para demandas pontuais.

Comunicação

Será criado grupo no WhatsApp para centralizar comunicação.

Envio de planilhas, links e alinhamentos será feito por lá.

Luiz e Cleuza serão administradores do grupo.

Estrutura da Implantação

Projeto dividido em 4 fases:

Fase 1 – Vendas e Fiscal (expectativa: 20 dias úteis)

Início após devolução e importação da planilha de produtos.

Contempla:

Instalação do sistema

Configurações iniciais (certificado digital e regras fiscais)

Cadastro de clientes, fornecedores e produtos

PDV e pedidos

Emissão de nota fiscal e cupom

Obs: Prazo pode ser ajustado conforme evolução da equipe.

Fase 2 – Financeiro (expectativa: 5 dias úteis)

Contas a pagar

Contas a receber

Emissão e baixa de boletos

Sistema permitirá geração de boletos com remessa e baixa automática via retorno bancário.

Fase 3 – Produção (expectativa: 20 dias úteis)

Cadastro de faccionistas

Local de produção

Ficha técnica

Ficha de custo

Movimentação de fases

Controle de estoque de matéria-prima

Fase 4 – Relatórios Gerenciais

Fluxo de Caixa

DRE

BI (relatórios gráficos)

Apoio estratégico para tomada de decisão

Será realizada após sistema estar rodando plenamente nas fases anteriores.

Decisões e Orientações Importantes

Implantação iniciará com envio da planilha de produtos acabados.

Cliente possui aproximadamente 50 modelos.

Equipe terá até 3 dias úteis após devolução para estruturar/importar dados.

Priorizar preenchimento dos campos essenciais (NCM e descrição).

Preencher inicialmente 5 produtos para validação antes de concluir os demais.

Sistema trabalha com um único cadastro por produto com variações (cor e tamanho).

Código de barras pode ser gerado pelo próprio sistema.

Cliente irá extrair cadastros de clientes e fornecedores para análise de importação.

Importação de contas a pagar/receber será avaliada (não é padrão).

Necessário instalar TeamViewer nas máquinas para dia da instalação.

Próximos Passos

CS Azoup criará grupo no WhatsApp.

Envio da planilha modelo de produtos.

Cliente enviará:

Planilha de clientes

Planilha de fornecedores

Planilha de contas a pagar/receber (para análise)

Cliente preencherá 5 produtos e enviará para validação.

Instalação do TeamViewer nas máquinas.', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '74fbba58-ac87-4114-a216-e80f08557428', NULL, NULL, '2026-04-06 18:27:04.157047+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('b432ef6a-5a48-492a-a8d9-832a9bc21616', '09/03/2026 - Instalação do sistema realizado com sucesso em todas as máquinas.

10/03/2026 - Configuração para emissão de NFC-e e NF-e concluídas + Instalação de uma máquina faltante.', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '74fbba58-ac87-4114-a216-e80f08557428', NULL, NULL, '2026-04-06 18:27:22.661076+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('98870dcd-5143-4568-a4eb-93b1583e78f7', 'Treinamento 11/03/2026 - 9h ás 11h | Cadastros (ZPF Confecção)

Cadastro de fornecedores com busca automática via CNPJ (Receita Federal)

Cadastro de clientes – pessoa física e jurídica, com busca via CPF/CNPJ e CEP

Cadastro de produtos – campos obrigatórios: Tipo, Sessão, Unidade, Grade, Cores, NCM e Grupo Fiscal (a confirmar com contador)

Geração de códigos de barras por cor e tamanho

Configuração de tabelas de preço (atacado/varejo) e aplicação em massa

Vendas de Balcão (ZPF Vendas)

Abertura e fechamento de caixa diário

Pré-venda: inserção de produtos por código de barras, aplicação de descontos, finalização com múltiplas formas de pagamento

Emissão de cupom fiscal e nota fiscal eletrônica (NFe)

Cancelamento de pré-vendas

Carteira de Pedidos (ZPF Confecção)

Digitação de pedidos para clientes atacadistas

Seleção de tabela de preços, inclusão por grade de tamanhos, descontos

Fluxo de aprovação de pedidos → faturamento → contas a receber', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '74fbba58-ac87-4114-a216-e80f08557428', NULL, NULL, '2026-04-06 18:27:51.782769+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('e3a89579-e61e-40d8-b79c-54cc2ef6fd87', 'Treinamento 13/03/2026 - 9h ás 10h20

Resumo do Treinamento: A reunião focou na emissão de notas fiscais (digitação manual e faturamento de pedidos, com a nota teste 1104 gerada com sucesso) e no módulo financeiro completo, cobrindo o fluxo de contas a pagar e receber, previsões de contas fixas, efetivação, baixa manual e inclusão de taxas de boleto.

Azoup: Precisamos enviar a planilha padrão de importação de cadastros, rodar o script de códigos de barras de todos os produtos e corrigir o problema de permissão de senhas da Luiza. Na parte visual e de sistema, devemos ajustar o layout da etiqueta de produto (e enviar um print para aprovação), desenvolver a etiqueta de logística após o envio do modelo, adicionar linhas de separação na tela de pedidos e verificar o erro que impediu a geração da nota fiscal no pedido teste da Regina.

Ações da Cliente: A Luiza ficou responsável por preencher a planilha com as bases de clientes e fornecedores, enviar o PDF que servirá de modelo para a etiqueta de logística e listar os centros de custo para cadastrarmos.

Próximos Passos: Após essas validações de layout e o preenchimento dos dados, o avanço será focado na configuração da impressora e nos testes finais de bipagem para liberar o sistema para uso na próxima semana.', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '74fbba58-ac87-4114-a216-e80f08557428', NULL, NULL, '2026-04-06 18:28:04.137637+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('1bc296f1-fd07-46df-89a2-00f23627ed03', '25/03/2026 16h ás 16h30  - a Reunião foi solicitada pelo cliente para sanar dúvidas pontuais.

Dúvidas sobre Venda, Impressão de etiqueta de transporte e ler o Cód. Barras, todas foram sanadas.', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '74fbba58-ac87-4114-a216-e80f08557428', NULL, NULL, '2026-04-06 18:28:24.393386+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('a7a11bf6-5daa-422b-82bf-e8868aa9a8ff', '23/03/2026 - 14h15 ás 16h15
Acompanhamento: Virada de Sistema - Vendas

📌 O que foi abordado e testado:

Etiquetas de Envio: Alinhado que o campo "Total de Produtos" será removido e substituído pelo número da Nota Fiscal (NF).

Etiquetas de Estoque e Leitor: Impressão testada, porém com falhas (texto cortado e ausência de um zero à esquerda no código de barras). Isso impediu a leitura correta ("Produto não encontrado") na hora de bipar.

Fluxo de Pedidos: Digitação, aprovação e cancelamento de pedidos de venda testados com sucesso, incluindo o uso das tabelas de preço.

Módulo de Loja (Pré-venda) e Fiscal: Fluxo de pré-venda e pagamento via Pix validados. A emissão do Cupom Fiscal (NFC-e) gerou erro devido a uma pendência na configuração da numeração.', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '74fbba58-ac87-4114-a216-e80f08557428', NULL, NULL, '2026-04-06 18:28:31.005182+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('a89b086f-d8b3-42b3-b7cf-afd4689524d6', '📅 01/04/2026 — LUIZA LINGERIE | Contato Ativo (Pós-Implantação)

📌 Acompanhamento

Vinícius realizou contato com o cliente

Objetivo: validar uso do sistema no dia a dia

📌 Pontos verificados

Digitação de pedidos

Faturamento

Emissão de NF-e

📅 25/03/2026 — LUIZA LINGERIE | Suporte + Treinamento + Reunião

📌 Reunião — Retirada de Dúvidas

Validação:

Código de barras funcionando corretamente (bipagem OK)

Impressão de etiquetas realizada

Orientação:

Impressão de etiqueta de transporte via “Consulta de Pedidos” (modelo 2)

📌 Solicitações de melhoria

Inclusão no layout:

Campo de NFE

Número da nota fiscal

Total de itens

Valor total do pedido

📌 Financeiro

Problema identificado:

Pedido aprovado sem gerar financeiro

Correção:

Realizado faturamento

Exclusão de parcelas incorretas

Lançamento manual em contas a receber

Reforço:

Financeiro é gerado no faturamento

📌 Tabela de Preços

Confirmado:

Sistema permite preço de atacado e varejo no mesmo cadastro

Orientação:

Selecionar tipo de preço no momento da venda

📌 Suporte (mesmo dia)

Correções realizadas:

Etiqueta sem tamanho

Código de barras duplicado

Ajustes feitos via acesso

📌 Dúvidas tratadas

Produto não puxando valor:

Causa: tabela de preço não selecionada

Orientações:

Selecionar tabela de preço

Definir seção no item

📌 Apoio adicional

Cadastro de produto

Inclusão de cores

📅 24/03/2026 — LUIZA LINGERIE | Configuração de Etiqueta e Código de Barras

📌 Alinhamento

Cliente solicitou continuidade:

Configuração de etiquetas e código de barras

Reunião agendada e realizada no mesmo dia (16h)

📌 Execução

Acesso remoto via TeamViewer

Início da configuração de etiquetas

📌 Ajustes técnicos

Problema identificado:

Desalinhamento na impressão

Causa:

Medidas incorretas da etiqueta

📌 Medidas informadas

3,5 cm (largura)

4,0 cm (altura)

📌 Testes

Impressão realizada

Necessário validar leitura do código de barras (bipagem)

📌 Pendências

Validar especificações da bobina (embalagem)

Ajustar layout conforme padrão correto

📌 Continuidade

Cliente solicitou nova reunião para dúvidas

Reunião agendada:

25/03 às 14h15', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '74fbba58-ac87-4114-a216-e80f08557428', NULL, NULL, '2026-04-06 18:28:39.893438+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('066efe83-6132-40c5-b24b-4614a113b4a3', '📌 REBOOL CAMISARIA – CANCELAMENTO / REAGENDAMENTO DE REUNIÃO DE ALINHAMENTO | 📅 06/04/2026

🧾 Resumo

* Reunião de alinhamento agendada para 06/04 às 17h00 não foi realizada
* Cliente solicitou reagendamento devido a imprevisto pessoal
* Nova data definida e confirmada entre as partes

⚠ Motivo/Contexto

* Cliente informou ocorrência de incidente pessoal (falecimento de animal de estimação)
* Situação compreendida e reagendamento realizado sem impacto de horas

📅 Solicitação/Ação do Cliente

* Solicitação de reagendamento da reunião
* Confirmação de nova data sugerida

✅ Alinhamento Realizado

* Reunião cancelada no horário previsto (06/04 às 17h00)
* Reagendamento acordado para:

  * 08/04/2026 – 16h00 às 17h00
* Novo agendamento confirmado por ambas as partes

💰 Gestão de Horas

* Reunião cancelada com justificativa válida
* Não houve consumo de horas

👤 Responsáveis

* Azoup: Vinícius
* Cliente: Francisco

🚀 Próximos Passos

* Realização da reunião de alinhamento na nova data agendada
* Dar sequência no início do projeto após alinhamento', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), 'b1a3c726-0957-42ba-b1e9-d7c4f82b710e', NULL, NULL, '2026-04-07 20:31:53.778039+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('9e5e9214-fcfe-47b6-8ade-a1c4e8594bc1', '📌 MARANELLO UNIFORMES – REUNIÃO DE ALINHAMENTO | 📅 06/04/2026

🧾 Resumo

* Realizado alinhamento inicial do projeto com base no Plano Pro (50h)
* Definida metodologia de implantação em 4 fases
* Estruturado fluxo de comunicação, treinamentos e início do projeto

⚠ Motivo/Contexto

* Início oficial do projeto de implantação
* Necessidade de alinhamento geral sobre funcionamento, etapas e responsabilidades

📅 Solicitação/Ação do Cliente

* Compreensão do funcionamento do sistema e etapas do projeto
* Alinhamento sobre cadastro de produtos e precificação
* Definição de responsáveis por áreas (produção, fiscal, etc.)

✅ Alinhamento Realizado

Plano e horas

* Plano Pro contratado com 50 horas de consultoria e treinamento
* Horas não utilizadas ficam armazenadas para uso futuro
* Possibilidade de contratação adicional, se necessário

Comunicação

* Comunicação centralizada via grupo de WhatsApp
* Compartilhamento de links, gravações e materiais
* Após implantação, suporte técnico disponível para demandas pontuais

Instalação e treinamentos

* Instalação via TeamViewer em todas as máquinas
* Treinamentos via Google Meet com gravação
* Uso de acesso remoto para prática durante treinamentos
* Necessidade de aviso prévio de 24h para cancelamentos

Planilha e cadastro inicial

* Cadastro de produtos como ponto inicial do projeto
* Envio de planilha padrão para preenchimento
* Orientação de iniciar com 3 a 5 produtos para validação
* Prazo de até 3 dias úteis para importação após envio

Fases do projeto

Fase 01 – Vendas (~20 dias úteis)

* Instalação, configurações e cadastros
* Treinamentos de vendas e emissão de notas
* Finalização com virada de sistema (go live)

Fase 02 – Financeiro (~5 dias úteis)

* Contas a pagar e receber
* Configuração de boletos (se necessário)
* Preparação para próxima fase

Fase 03 – Produção (~20 dias úteis)

* Cadastro de matéria-prima e processos
* Ficha técnica e ficha de custo
* Ordem de produção e gestão de fases
* Precificação detalhada será tratada nesta fase

Fase 04 – Gerencial

* Relatórios, DRE, fluxo de caixa e BI
* Revisões finais e encerramento do projeto

Precificação

* Identificada como principal ponto de atenção do cliente
* Atualmente realizada de forma intuitiva
* Sistema permite múltiplas tabelas de preço
* Precificação detalhada depende da estrutura de produção (fase 3)

Observações importantes

* Sistema trabalha com variações (cor/tamanho) no mesmo produto
* Informações fiscais devem ser validadas com contador
* Estoque será confiável após uso contínuo do sistema
* Divisão de responsabilidades entre equipe (produção vs comercial)

💰 Gestão de Horas

* Reunião de alinhamento realizada (consumo padrão de horas)

👤 Responsáveis

* Azoup: Vinícius / Anderson
* Cliente: Bruno / Giovan / João Gomes

🚀 Próximos Passos

* Criar grupo de WhatsApp e incluir equipe
* Enviar planilha padrão de produtos
* Cliente iniciar preenchimento (3 a 5 itens inicialmente)
* Enviar contato da contabilidade
* Após envio da planilha, iniciar importação e cronograma da Fase 01', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '60476651-5c1f-4025-9539-16f9385fd826', NULL, NULL, '2026-04-07 20:34:05.100915+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('61c1fa2c-e211-45f8-92aa-679033e8f059', '📌 MARANELLO UNIFORMES – PLANILHAS ENVIADAS | 📅 07/04/2026

🧾 Resumo

* Envio das planilhas padrão para preenchimento e importação de dados
* Reenvio solicitado após entrada de novos participantes no grupo
* Planilhas compartilhadas novamente para toda a equipe

⚠ Motivo/Contexto

* Necessidade de garantir que todos os envolvidos tenham acesso às planilhas
* Inclusão de novos participantes no grupo após envio inicial

📅 Solicitação/Ação do Cliente

* Solicitação de reenvio das planilhas para os novos integrantes
* Confirmação de recebimento e encaminhamento interno

✅ Alinhamento Realizado

* Planilhas padrão enviadas inicialmente pela equipe Azoup
* Cliente solicitou reenvio para novos participantes
* Planilhas reenviadas e disponibilizadas no grupo
* Cliente confirmou encaminhamento para equipe interna

👤 Responsáveis

* Azoup: Vinícius
* Cliente: Bruno / Equipe Maranello

🚀 Próximos Passos

* Equipe iniciar preenchimento das planilhas
* Retornar com dados preenchidos para importação
* Dar sequência na Fase 01 após validação dos dados', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '60476651-5c1f-4025-9539-16f9385fd826', NULL, NULL, '2026-04-07 20:34:56.464912+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('5e4c8c95-8ff6-4538-bc37-1a26ab0d2af8', '📌 IVY WEAR – REUNIÃO DE ALINHAMENTO | 📅 06/04/2026

🧾 Resumo
Reunião inicial de alinhamento para apresentação da metodologia de implantação, definição da comunicação e organização das primeiras etapas. Projeto estruturado com foco inicial em vendas, incluindo instalação técnica, treinamentos via Meet e preparação para integração com e-commerce.

⚠ Motivo/Contexto
Início do projeto de implantação, com objetivo de alinhar expectativas, explicar funcionamento do processo, definir responsabilidades e estruturar cronograma inicial.

📅 Solicitação/Ação do Cliente

* Participação na reunião de alinhamento e validação do início do projeto
* Informou possuir cerca de 30 produtos
* Confirmou foco inicial apenas na loja de vestuário (sem café)
* Sinalizou necessidade de apoio com tecnologia
* Ficou responsável por avaliar contratação da Nuvem Shop
* Ficou responsável pela compra de equipamentos (impressoras e leitor)

✅ Alinhamento Realizado

• Plano e horas

* Projeto definido com pacote de 30 horas
* Horas não utilizadas poderão ser reaproveitadas posteriormente
* Suporte técnico será disponibilizado ao final da implantação

• Comunicação

* Comunicação centralizada via grupo de WhatsApp
* Grupo será criado pela Azoup
* Envio de links de reunião e gravações pelo grupo
* Cliente poderá incluir outros participantes

• Instalação

* Primeira etapa será técnica (sem reunião)
* Instalação e validação das máquinas via TeamViewer
* Validação de internet e desempenho
* Uso preferencial do TeamViewer (licença comercial)

• Treinamentos

* Realizados via Google Meet
* Com gravação para acesso posterior
* Acompanhamento prático direto na máquina da cliente
* Suporte ativo durante todo o processo

• Cronograma

* Será enviado para validação do cliente
* Estrutura inicial:

  * Instalação e configurações
  * Treinamentos
* Cancelamentos devem ser informados com antecedência para evitar consumo de horas

• Produtos e cadastros

* Cliente possui cerca de 30 produtos
* Definido cadastro manual durante treinamento (melhor aproveitamento)
* Produtos com variações (cor/tamanho)

• Integração e-commerce

* Integração com Nuvem Shop prevista
* Necessário contratar plano e liberar acesso gerencial
* Objetivo: unificar estoque entre loja física e online

• Estrutura do projeto

* Foco inicial na fase de vendas (cadastros, PDV, pedidos, notas)
* Sequência planejada:

  * Vendas
  * Financeiro
  * Estoque
* Estimativa de ~20 dias úteis para fase inicial (vendas)

• Infraestrutura e ambiente

* Sistema poderá operar em nuvem
* Para cenário atual (1 máquina), base poderá ser local
* Internet estável é essencial para performance

• Equipamentos

* Necessário adquirir:

  * Impressora de etiquetas (L42)
  * Impressora térmica (Elgin i9)
  * Leitor de código de barras
* Recomendado cuidado na compra (avaliar fornecedor e qualidade)

💰 Gestão de Horas

* Reunião de alinhamento (consumo padrão de horas)
* Projeto total contratado: 30 horas

👤 Responsáveis

* Azoup: Vinícius, Anderson
* Cliente: Evelyn Formigoni

🚀 Próximos Passos

* Criar grupo de WhatsApp para comunicação
* Enviar cronograma completo para validação
* Agendar instalação e configurações iniciais
* Iniciar treinamentos na sequência
* Cliente contratar Nuvem Shop e validar acesso
* Cliente realizar compra dos equipamentos necessários
* Cliente validar datas do cronograma enviado', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '04400921-5e52-4bad-bc05-7bef132b8894', NULL, NULL, '2026-04-07 20:39:20.119226+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('d436d9cb-ac0f-41c8-92a1-840a7be5fba2', '📅 AZOUP & IVY WEAR

Fase 01 - Vendas
1.1.Instalação do Sistema - 10/04/2026 - 10h45 às 12h15
1.2.Configurações - 13/04/2026 - 14h15 às 15h45
1.3.Cadastros - 15/04/2026 - 09h00 às 10h30
1.4.Vendas (PDV e Pedidos) - 22/04/2026 - 09h00 às 10h30
1.5.NFe - 24/04/2026 - 09h00 às 10h30
1.6.Virada de Sistema: Vendas - 27/04/2026 - 09h00 às 12h00', _map_user('1b3f0696-10f9-4f50-a276-fb0f308914e4'), '04400921-5e52-4bad-bc05-7bef132b8894', NULL, NULL, '2026-04-07 21:01:35.038742+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('dfdb1333-3aa0-4664-ac88-a0d373debeed', '📌 LVT SPORTS – PLANILHA DEVOLVIDA | 📅 06/04/2026

🧾 Resumo

* Cliente realizou devolução das planilhas de cadastros (produtos, clientes e fornecedores)
* Equipe Azoup recebeu e encaminhou para análise e importação
* Orientações foram reforçadas durante o processo para correto preenchimento

⚠ Motivo/Contexto

* Etapa inicial do projeto visando agilizar a operação do sistema
* Necessidade de estruturação mínima de dados para início dos cadastros e operações

📅 Solicitação/Ação do Cliente

* Dúvida sobre envio das planilhas após preenchimento
* Confirmação de que deveria devolver para importação
* Envio das planilhas preenchidas para a equipe Azoup

✅ Alinhamento Realizado

* Orientado que o objetivo das planilhas é antecipar cadastros e agilizar o uso do sistema
* Esclarecido que:

  * Clientes podem ser cadastrados de forma básica inicialmente
  * Dados completos são obrigatórios apenas para emissão de NF-e
  * Fornecedores podem ser cadastrados apenas com nome
* Confirmado que as planilhas devem ser devolvidas para importação
* Planilhas recebidas e encaminhadas para equipe de desenvolvimento

💰 Gestão de Horas

* Atividade operacional (sem consumo relevante de horas de consultoria)

👤 Responsáveis

* Azoup: Anderson / Vinícius
* Cliente: Thyago

🚀 Próximos Passos

* Análise das planilhas pela equipe de desenvolvimento
* Estruturação e importação dos dados no sistema
* Retorno ao cliente após conclusão da importação
* Continuidade da Fase 01 com base nos dados importados', _map_user('f455b795-4baf-41af-8d95-7aedf28c24dd'), '4e36cf11-9121-4441-adcb-73aa56992196', NULL, NULL, '2026-04-09 20:29:24.00417+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('b9e74a07-1b2a-4a4d-bc15-5bdec1e5a6de', '📅 AZOUP & LVT SPORTS

Fase 01 - Vendas
1.1.Instalação do Sistema - 10/04/2026 - 16h00 às 17h30
1.2.Configurações - 14/04/2026 - 14h15 às 15h45
1.3.Cadastros - 16/04/2026 - 14h15 às 15h45
1.4.Vendas - 22/04/2026 - 14h15 às 15h45
1.5.NF-e - 24/04/2026 - 14h15 às 15h45
1.6.Virada de Sistema: Vendas - 28/04/2026 - 09h00 às 12h00', _map_user('f455b795-4baf-41af-8d95-7aedf28c24dd'), '4e36cf11-9121-4441-adcb-73aa56992196', NULL, NULL, '2026-04-09 20:31:10.033499+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('71b3a736-a076-49c6-a54d-d06cf07f8d35', '📅 09/04/2026
🏢 CÚMPLICE DA MODA - INSTALAÇÃO DO SISTEMA

📌 Resumo

* Realizada instalação inicial do sistema em 3 máquinas via acesso remoto
* Coletadas informações essenciais: certificado digital, e-mails e CNPJ
* Instalação parcialmente concluída, restando 1 máquina devido instabilidade de internet

🧩 Motivo

* Início da etapa técnica do projeto, com objetivo de preparar o ambiente para uso do sistema (NF-e, acessos e estrutura inicial)

⚙️ Solicitação do Cliente

* Apoio na instalação do sistema nas máquinas da empresa
* Configuração inicial considerando certificado digital e dados fiscais

🤝 Alinhamento Realizado

* Cliente enviou dados do certificado digital (via link de instalação, necessário ajuste para envio do arquivo)
* Informados e-mails: faturamento e contabilidade
* CNPJ fornecido para parametrizações do sistema
* Acessos via TeamViewer enviados para 3 máquinas inicialmente
* Instalação realizada com sucesso nas 3 máquinas disponíveis
* Identificada 4ª máquina, porém não foi possível concluir no momento devido queda de internet
* Cliente reenviou acesso posteriormente e confirmou funcionamento

⏱️ Gestão de Horas

* Tempo total aproximado: 1h30

👥 Responsáveis

* Anderson (Azoup)
* Cristiane / equipe Cúmplice da Moda

🚀 Próximos Passos

* Finalizar instalação da máquina pendente (caso necessário validar novamente)
* Validar funcionamento geral do sistema nas máquinas instaladas
* Seguir para etapa de configurações e ajustes iniciais do sistema', _map_user('f455b795-4baf-41af-8d95-7aedf28c24dd'), '4b6d5e4a-a73d-4e8e-bb31-21bdf51779ee', NULL, NULL, '2026-04-09 20:54:48.653457+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('e23fb56b-7ff9-4247-807a-3e8e353ee1b8', '📅 07/04/2026
🏢 KALHANDRA UNIFORMES - CADASTROS: VENDAS

📌 Resumo

* Treinamento focado nos cadastros essenciais do sistema (clientes, fornecedores e produtos)
* Definição de boas práticas de uso (inativar x excluir, preenchimento correto e padronização)
* Realizada prática com a equipe e alinhada sessão extra específica para o time de vendas

🧩 Motivo

* Início da Fase 01 (Vendas), com foco na base estrutural do sistema através dos cadastros

📥 Solicitação do Cliente

* Entendimento completo dos cadastros
* Tempo adicional para equipe de vendas praticar principalmente cadastro de clientes antes de avançar

🤝 Alinhamento Realizado

* Apresentação geral do sistema e navegação básica (Incluir / Consulta)
* Explicado diferença entre excluir (somente testes/erros) e inativar (manter histórico)
* Cadastro de fornecedores: recomendado uso de CNPJ/CPF para evitar duplicidade
* Cadastro de clientes:

  * Básico permitido para pré-cadastro
  * Completo obrigatório para emissão de NF-e
  * Uso da função “Dados Receita Federal” para agilizar cadastros
  * Atenção à inscrição estadual (contribuinte x não contribuinte)
* Estrutura de produtos:

  * Criação de cores, grades (tamanhos), sessão e grupo
  * Geração de código de barras (EAN13) por variação
  * Cadastro único com variações (evitando múltiplos produtos duplicados)
* Definições fiscais: preenchimento de NCM e origem
* Estratégia de cadastro: uso da cópia de produtos para ganho de produtividade
* Prática realizada:

  * Cadastro de fornecedor
  * Cadastro de cliente (com Receita Federal)
  * Cadastro de produtos (manual e por cópia)
* Orientado sobre troca de senha dos usuários e validação de acessos
* Realizada segunda etapa prática com equipe adicional (foco total em cadastro de clientes)
* Alinhado que próxima etapa será treinamento de Vendas (Pedidos)

⏱️ Gestão de Horas

* Tempo aproximado da sessão: 2h30

👥 Responsáveis

* Vinícius (Azoup)
* Rayla Lee / Alexandra / Jaque / Silvana / equipe Kalhandra

🚀 Próximos Passos

* Equipe praticar cadastros de clientes e fornecedores
* Realizar cadastros reais no sistema (evitando duplicidade via consulta)
* Validar permissões de usuários conforme necessidade
* Realizar sessão extra rápida (15 min) focada em cadastro de clientes para equipe de vendas
* Avançar para treinamento de Vendas (Pedidos) na próxima agenda', _map_user('f455b795-4baf-41af-8d95-7aedf28c24dd'), '66792e18-6327-421f-a82e-ebb6803ca1b0', NULL, NULL, '2026-04-10 15:23:10.796366+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('43960faf-6e1a-480a-bb22-684a3bcf5d82', '📅 09 de abr. de 2026
🏷️ KALHANDRA UNIFORMES - VENDAS

📌 Resumo
Treinamento focado no processo completo de pedidos no sistema, abordando desde a digitação até faturamento, incluindo fluxo de aprovação, romaneio e decisões estratégicas sobre cadastro de produtos e controle de estoque.

📌 Motivo
Evolução da Fase 01 (Vendas), com foco na operação prática do comercial e estruturação do fluxo real da empresa dentro do sistema.

📌 Alinhamento Realizado
• Apresentado o fluxo completo de pedidos: digitação → (opcional) aprovação → romaneio → faturamento
• Validado que a operação inclui pronta entrega, encomendas e vendas online
• Definido que vendedoras não operam o caixa, apenas registram pedidos (financeiro separado)

• Demonstrada a digitação de pedidos:

* Seleção de cliente e vendedor (comissionamento)
* Inserção de produtos por código/descrição
* Uso do atalho F11 para grade (tamanhos)
* Uso de Ctrl + Delete para exclusão de itens

• Validado que:

* Valores podem ser alterados no pedido (negociação/orçamento)
* É possível adicionar observações por item e no pedido
* Sistema permite anexar imagens nos itens (layout/arte)

• Apresentadas funcionalidades complementares:

* Aplicação de descontos/acréscimos
* Definição de condições de pagamento (ex: 30/60)
* Definição de prazo de entrega (dias corridos ou data)
* Impressão e exportação de pedidos (PDF)

• Explicado processo de:

* Aprovação de pedidos (bloqueio de edição)
* Romaneio (conferência de peças, parcial ou total)
* Faturamento (geração financeiro + base NF-e)

• Discutido modelo de cadastro de produtos:

* Cadastro completo (cores + tamanhos) → controle automático de estoque
* Uso de observações → mais flexibilidade, porém sem controle automático

• Definido que:

* Observações padrão (prazo, condições, etc.) podem ser fixadas no layout
* Decisão sobre nível de detalhamento de cadastro ainda pode evoluir conforme uso

📌 Gestão de Horas
• Treinamento realizado conforme previsto em projeto (Fase 01 - Vendas)
• Sem intercorrências ou pausas relevantes

📌 Responsáveis
• Azoup: condução do treinamento e apoio nas configurações
• Cliente: validação do fluxo de vendas e prática operacional

📌 Próximos Passos
➡️ Realizar prática interna de digitação de pedidos (mín. 2 a 3 por usuário)
➡️ Cadastrar vendedores reais no sistema
➡️ Enviar logotipo para personalização de layout
➡️ Definir e enviar texto padrão para observações fixas no pedido
➡️ Validar acessos (logins) de todos os usuários
➡️ Ajustar/importar produtos considerando estratégia de cores e tamanhos
➡️ Incluir Rafaella no grupo para acesso a materiais e treinamentos
➡️ Próxima reunião: treinamento de Nota Fiscal (NF-e)', _map_user('f455b795-4baf-41af-8d95-7aedf28c24dd'), '66792e18-6327-421f-a82e-ebb6803ca1b0', NULL, NULL, '2026-04-10 15:24:10.999845+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('4194083c-5372-4bc5-87f7-94be62a7c768', '📅 10 de abr. de 2026
🏷️ IVY WEAR - INSTALAÇÃO DO SISTEMA

📌 Resumo
Início da instalação do sistema com coleta de informações técnicas, acesso remoto à máquina principal e orientação sobre certificado digital. Instalação parcialmente concluída, pendente envio do certificado para finalização.

📌 Motivo
Início da etapa técnica do projeto (Instalação e Configuração do sistema).

📌 Solicitação do Cliente
• Apoio na instalação do sistema
• Orientação sobre certificado digital
• Configuração inicial para emissão de NF-e

📌 Alinhamento Realizado
• Solicitadas informações iniciais para instalação:

* Certificado digital (arquivo + senha)
* E-mail para envio de NF-e
* E-mail do contador (XML)
* Identificação das máquinas emissoras

• Cliente informou:

* E-mail NF-e: [contato.ivywear@gmail.com](mailto:contato.ivywear@gmail.com)
* E-mail contador: [fiscal2.jdm@hotmail.com](mailto:fiscal2.jdm@hotmail.com)
* Máquina principal definida para emissão

• Acesso remoto realizado via TeamViewer na máquina principal
• Orientado que não é necessário login no TeamViewer (apenas ID e senha)
• Instalação iniciada e validações realizadas na máquina

• Certificado digital:

* Cliente recebeu instruções via link externo
* Orientado envio apenas do arquivo + senha (não via instalador)
* Documento ainda não disponível no momento

• Durante o processo:

* Cliente conseguiu utilizar normalmente a máquina (ex: WhatsApp Web)
* Sem impactos operacionais durante acesso remoto

• Devido à ausência do certificado:

* Instalação não foi concluída integralmente
* Alinhado continuidade na próxima agenda

📌 Gestão de Horas
• Tempo parcialmente consumido com acesso técnico e validações iniciais
• Finalização pendente (não concluído nesta sessão)

📌 Responsáveis
• Azoup: instalação, validações técnicas e orientações
• Cliente: envio do certificado digital e validação de acessos

📌 Próximos Passos
➡️ Cliente enviar certificado digital (.pfx) + senha
➡️ Retomar instalação e concluir configuração fiscal
➡️ Validar emissão de NF-e após configuração
➡️ Seguir para próximas etapas do projeto após conclusão técnica', _map_user('f455b795-4baf-41af-8d95-7aedf28c24dd'), '04400921-5e52-4bad-bc05-7bef132b8894', NULL, NULL, '2026-04-10 15:31:17.100552+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments
  (id, content, author_id, project_id, task_id, event_id, created_at)
VALUES
  ('4c258c6c-b85e-4a04-b833-8c950c38b913', '📅 09 e 10 de abr. de 2026
🏷️ LUIZA LINGERIE - SOLICITAÇÃO DE TREINAMENTO AVULSO

📌 Resumo
Cliente solicitou agendamento de reuniões adicionais para reforço em rotinas fiscais e operacionais, com foco em emissão de notas, cupom fiscal e entrada de notas recebidas.

📌 Motivo
Necessidade de aprofundamento em funcionalidades específicas após início da operação, mesmo com vendas já fluindo normalmente.

📌 Solicitação do Cliente
• Agendar reunião para abordar:

Emissão de Nota Fiscal (NF-e)
Emissão de Cupom Fiscal (NFC-e)
Entrada/baixa de notas recebidas

• Feedback positivo:

Vendas já operando bem no sistema

📌 Alinhamento Realizado
• Confirmado que será realizado agendamento de nova reunião para cobrir os pontos solicitados

• Compartilhados materiais de apoio antecipados:

Trilha de treinamento sobre NF-e
Gravação anterior de treinamento (Vendas + Pré-venda + Carteira de Pedidos)

• Orientado que o cliente pode antecipar dúvidas utilizando os conteúdos enviados antes da reunião

📌 Gestão de Horas
• Reunião ainda não realizada (não consumiu horas até o momento)
• Próxima agenda será considerada como consultoria/treinamento avulso

📌 Responsáveis
• Azoup: agendamento e condução do treinamento
• Cliente: revisão prévia dos materiais e participação na reunião

📌 Próximos Passos
➡️ Definir data para reunião de treinamento avulso
➡️ Cliente revisar conteúdos enviados previamente
➡️ Realizar treinamento focado em fiscal (NF-e / NFC-e / entrada de notas)
➡️ Validar operação completa após treinamento', _map_user('f455b795-4baf-41af-8d95-7aedf28c24dd'), '74fbba58-ac87-4114-a216-e80f08557428', NULL, NULL, '2026-04-10 17:54:46.189692+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Limpeza e verificação
-- ============================================================
DROP FUNCTION IF EXISTS _map_user(uuid);
DROP TABLE IF EXISTS _user_map;

-- Rode para verificar:
SELECT 'projects'        AS t, count(*) FROM public.projects
UNION ALL SELECT 'phases',         count(*) FROM public.phases
UNION ALL SELECT 'tasks',          count(*) FROM public.tasks
UNION ALL SELECT 'events',         count(*) FROM public.events
UNION ALL SELECT 'time_logs',      count(*) FROM public.time_logs
UNION ALL SELECT 'project_contacts', count(*) FROM public.project_contacts
UNION ALL SELECT 'labels',         count(*) FROM public.labels
UNION ALL SELECT 'comments',       count(*) FROM public.comments
UNION ALL SELECT 'analysts',       count(*) FROM public.analysts
UNION ALL SELECT 'plan_models',    count(*) FROM public.plan_models
UNION ALL SELECT 'plan_phases',    count(*) FROM public.plan_phases
UNION ALL SELECT 'plan_tasks',     count(*) FROM public.plan_tasks
ORDER BY t;