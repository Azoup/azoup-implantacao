-- VynTask — Fundir os dois registros "Vinicius" / "Vinícius" em um só analista
-- Mantém: 33f2f784-ec03-4a82-b2df-2c848736158c ("Vinicius")
-- Remove: 66827fda-8720-455b-8771-16ac80f22de4 ("Vinícius" duplicado)
-- Perfil de login: f2f37d7b-e3ee-408b-b5d0-66e1a4ccc799 (vinicius.azoup@gmail.com)
--
-- Pré-requisito: coluna analysts.profile_id existe (script 010_analysts_profile_link.sql).

begin;

-- 1) Apontar todas as referências do duplicado para o analista que fica
update public.projects
set analyst_id = '33f2f784-ec03-4a82-b2df-2c848736158c'
where analyst_id = '66827fda-8720-455b-8771-16ac80f22de4';

update public.tasks
set assigned_to = '33f2f784-ec03-4a82-b2df-2c848736158c'
where assigned_to = '66827fda-8720-455b-8771-16ac80f22de4';

update public.events
set analyst_id = '33f2f784-ec03-4a82-b2df-2c848736158c'
where analyst_id = '66827fda-8720-455b-8771-16ac80f22de4';

update public.time_sessions
set analyst_id = '33f2f784-ec03-4a82-b2df-2c848736158c'
where analyst_id = '66827fda-8720-455b-8771-16ac80f22de4';

-- 2) Nome único + vínculo ao perfil (ajuste o nome se quiser outro texto)
update public.analysts
set
  name = 'Vinícius',
  profile_id = coalesce(profile_id, 'f2f37d7b-e3ee-408b-b5d0-66e1a4ccc799')
where id = '33f2f784-ec03-4a82-b2df-2c848736158c';

-- 3) Remover o registro duplicado (já não há FK apontando para ele)
delete from public.analysts
where id = '66827fda-8720-455b-8771-16ac80f22de4';

commit;

-- Conferência
select id, name, profile_id from public.analysts order by name;
