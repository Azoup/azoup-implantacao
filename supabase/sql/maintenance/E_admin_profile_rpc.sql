-- Implantação Azoup — RPCs administrativas para gestão de perfis
-- Objetivo: evitar falhas de ajuste de permissões/status por diferenças de RLS/trigger
-- no cliente. As funções exigem admin ativo (public.is_admin()).

create or replace function public.admin_set_profile_permissions(
  p_target_user_id uuid,
  p_permissions text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Apenas admin pode alterar permissões.';
  end if;

  update public.profiles
  set permissions = p_permissions
  where id = p_target_user_id;

  if not found then
    raise exception 'Perfil alvo não encontrado.';
  end if;
end;
$$;

revoke all on function public.admin_set_profile_permissions(uuid, text[]) from public;
grant execute on function public.admin_set_profile_permissions(uuid, text[]) to authenticated;

create or replace function public.admin_set_profile_status(
  p_target_user_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Apenas admin pode alterar status.';
  end if;

  if p_status not in ('active', 'inactive', 'pending') then
    raise exception 'Status inválido: %', p_status;
  end if;

  update public.profiles
  set status = p_status
  where id = p_target_user_id;

  if not found then
    raise exception 'Perfil alvo não encontrado.';
  end if;
end;
$$;

revoke all on function public.admin_set_profile_status(uuid, text) from public;
grant execute on function public.admin_set_profile_status(uuid, text) to authenticated;
