-- Implantação Azoup — Liga analista (catálogo) ao perfil de login (Supabase Auth / public.profiles)
-- Assim o RLS pode permitir edição do projeto quando projects.analyst_id aponta para um
-- analista cujo profile_id = auth.uid().
--
-- Passos após rodar este script (NÃO cole texto literal tipo <uuid-...> — isso NÃO é UUID válido):
--
-- 1) Liste perfis e analistas e copie os valores da coluna id (formato 8-4-4-4-12 hex):
--    select id, email, name from public.profiles order by email;
--    select id, name from public.analysts order by name;
--
-- 2) Atualize UMA linha por vez, substituindo pelos ids reais, exemplo de forma válida:
--    update public.analysts
--    set profile_id = 'f2f37d7b-e3ee-408b-b5d0-66e1a4ccc799'
--    where id = '33f2f784-ec03-4a82-b2df-2c848736158c';
--    (os dois valores acima são só ilustração — use os que saíram nos SELECTs.)
--
-- 3) Atribua projects.analyst_id ao analista na UI ou via SQL.

alter table public.analysts
  add column if not exists profile_id uuid null references public.profiles (id) on delete set null;

create index if not exists analysts_profile_id_idx on public.analysts (profile_id);

comment on column public.analysts.profile_id is 'Opcional: mesmo id que public.profiles.id — usado em can_edit_project (RLS).';

create or replace function public.can_edit_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and (
        p.created_by = auth.uid()
        or p.owner_id = auth.uid()
        or public.is_admin()
        or (
          p.analyst_id is not null
          and exists (
            select 1
            from public.analysts a
            where a.id = p.analyst_id
              and a.profile_id is not null
              and a.profile_id = auth.uid()
          )
        )
      )
  );
$function$;
