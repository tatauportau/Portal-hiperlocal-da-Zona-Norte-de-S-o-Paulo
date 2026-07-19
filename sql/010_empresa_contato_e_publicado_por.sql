-- Portau — Contato da empresa (e-mail/celular) + responsável pelo anúncio
-- Rodar manualmente no SQL Editor do painel Supabase, depois do 009.
--
-- Motivo: o formulario "Anuncie sua vaga" pedia pra retypar nome da
-- empresa, e-mail e celular toda vez, sendo que boa parte disso ja' esta'
-- no cadastro (da empresa ou do usuario). Agora:
--   - empresas ganha email_empresa/celular_empresa (opcionais, preenchidos
--     uma vez no cadastro/vinculo da empresa — nunca sobrescritos por quem
--     entra depois via CNPJ existente, mesmo padrao ja usado pra
--     nome_empresa: o "on conflict" so' faz um update no-op de cnpj).
--   - vagas_empresas ganha publicado_por (texto livre, nome de quem
--     assina o anuncio — uma pessoa da equipe ou o nome da empresa de
--     forma generica).

alter table public.empresas add column if not exists email_empresa text;
alter table public.empresas add column if not exists celular_empresa text;

alter table public.vagas_empresas add column if not exists publicado_por text;

-- handle_new_user: passa a aceitar email_empresa/celular_empresa no
-- cadastro (metadata crua, mesma logica do cnpj/nome_empresa desde o 008).
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_cnpj text;
  v_nome_empresa text;
  v_email_empresa text;
  v_celular_empresa text;
  v_empresa_id uuid;
begin
  v_cnpj := regexp_replace(coalesce(new.raw_user_meta_data->>'cnpj', ''), '\D', '', 'g');
  v_nome_empresa := new.raw_user_meta_data->>'nome_empresa';
  v_email_empresa := nullif(trim(new.raw_user_meta_data->>'email_empresa'), '');
  v_celular_empresa := regexp_replace(coalesce(new.raw_user_meta_data->>'celular_empresa', ''), '\D', '', 'g');
  if v_celular_empresa = '' then v_celular_empresa := null; end if;

  if v_cnpj <> '' then
    if char_length(v_cnpj) <> 14 then
      raise exception 'CNPJ invalido';
    end if;
    insert into public.empresas (cnpj, nome_empresa, email_empresa, celular_empresa)
    values (v_cnpj, coalesce(nullif(trim(v_nome_empresa), ''), 'Empresa'), v_email_empresa, v_celular_empresa)
    on conflict (cnpj) do update set cnpj = excluded.cnpj
    returning id into v_empresa_id;
  end if;

  insert into public.profiles (id, nome, bairro, distrito, celular, email, empresa_id)
  values (
    new.id,
    new.raw_user_meta_data->>'nome',
    new.raw_user_meta_data->>'bairro',
    new.raw_user_meta_data->>'distrito',
    new.raw_user_meta_data->>'celular',
    new.email,
    v_empresa_id
  );
  return new;
end;
$$ language plpgsql security definer;

-- vincular_minha_empresa: ganha os mesmos dois parametros opcionais. Drop +
-- create (em vez de so' "or replace") pra evitar qualquer ambiguidade de
-- overload ao mudar a assinatura da funcao.
drop function if exists public.vincular_minha_empresa(text, text);

create function public.vincular_minha_empresa(
  p_cnpj text,
  p_nome_empresa text,
  p_email_empresa text default null,
  p_celular_empresa text default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_cnpj text;
  v_celular_empresa text;
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

  v_celular_empresa := regexp_replace(coalesce(p_celular_empresa, ''), '\D', '', 'g');
  if v_celular_empresa = '' then v_celular_empresa := null; end if;

  insert into public.empresas (cnpj, nome_empresa, email_empresa, celular_empresa)
  values (v_cnpj, coalesce(nullif(trim(p_nome_empresa), ''), 'Empresa'), nullif(trim(p_email_empresa), ''), v_celular_empresa)
  on conflict (cnpj) do update set cnpj = excluded.cnpj
  returning id into v_empresa_id;

  update public.profiles set empresa_id = v_empresa_id where id = auth.uid();

  return v_empresa_id;
end;
$$;

grant execute on function public.vincular_minha_empresa(text, text, text, text) to authenticated;

-- Trava de colunas de vagas_empresas: adiciona publicado_por a' lista
-- (as demais colunas ja eram gravaveis desde o 008).
revoke update on public.vagas_empresas from authenticated;
grant update (
  nome_empresa, email_contato, whatsapp_contato, titulo_vaga, horario, salario,
  beneficios, beneficios_outro, descricao, distritos_completos, bairros_por_distrito,
  localizacao_externa, tipo_contrato, link_candidatura,
  status, motivo_cancelamento, contratado_descricao, contratado_nota,
  publicado_por
) on public.vagas_empresas to authenticated;
