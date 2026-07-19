-- Portau — RPC para vincular empresa (CNPJ) a uma conta ja' cadastrada
-- Rodar manualmente no SQL Editor do painel Supabase, depois do 008.
--
-- Motivo: o sql/008 so' resolve empresa_id no CADASTRO (handle_new_user).
-- Quem ja' tinha conta de leitor antes dessa feature existir (ou so'
-- esqueceu de marcar "Sou uma empresa" no cadastro) nao tinha como virar
-- conta de empresa depois — empresa_id fica de fora do grant update de
-- profiles de proposito (ninguem se auto-promove direto via update()).
-- Esta RPC e' a unica porta pra isso, com as mesmas garantias do trigger:
-- so' opera sobre a PROPRIA conta (auth.uid()), nunca sobre outra, e so'
-- funciona uma vez (nao deixa trocar de empresa depois de vinculada).

create or replace function public.vincular_minha_empresa(p_cnpj text, p_nome_empresa text)
returns uuid
language plpgsql
security definer
as $$
declare
  v_cnpj text;
  v_empresa_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  if exists (select 1 from public.profiles where id = auth.uid() and empresa_id is not null) then
    raise exception 'Esta conta já está vinculada a uma empresa';
  end if;

  v_cnpj := regexp_replace(coalesce(p_cnpj, ''), '\D', '', 'g');
  if char_length(v_cnpj) <> 14 then
    raise exception 'CNPJ inválido';
  end if;

  insert into public.empresas (cnpj, nome_empresa)
  values (v_cnpj, coalesce(nullif(trim(p_nome_empresa), ''), 'Empresa'))
  on conflict (cnpj) do update set cnpj = excluded.cnpj
  returning id into v_empresa_id;

  update public.profiles set empresa_id = v_empresa_id where id = auth.uid();

  return v_empresa_id;
end;
$$;

grant execute on function public.vincular_minha_empresa(text, text) to authenticated;
