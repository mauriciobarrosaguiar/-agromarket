-- AgroGestão v1 - endurecimento de segurança
-- Execute após supabase/agrogestao.sql quando estiver instalando manualmente.

create or replace function public.agro_atualizar_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.agro_registrar_movimentacao(uuid, text, numeric, text) from public;
revoke all on function public.agro_registrar_movimentacao(uuid, text, numeric, text) from anon;
grant execute on function public.agro_registrar_movimentacao(uuid, text, numeric, text) to authenticated;

revoke all on function public.agro_registrar_venda(uuid, uuid, numeric, numeric, numeric, numeric, text, text, numeric, date, text) from public;
revoke all on function public.agro_registrar_venda(uuid, uuid, numeric, numeric, numeric, numeric, text, text, numeric, date, text) from anon;
grant execute on function public.agro_registrar_venda(uuid, uuid, numeric, numeric, numeric, numeric, text, text, numeric, date, text) to authenticated;
