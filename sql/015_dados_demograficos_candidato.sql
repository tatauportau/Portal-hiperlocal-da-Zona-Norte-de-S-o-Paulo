-- Portau — Sexo, data de nascimento e estado civil no cadastro do leitor
-- Rodar manualmente no SQL Editor do painel Supabase, depois do 014.
--
-- Motivo: dados importantes pra estatisticas futuras do Portau, e
-- essenciais na candidatura a vaga (junto com nome/bairro/celular ja
-- existentes) — a empresa ve sexo, data de nascimento (+ idade calculada
-- no client) e estado civil de quem se candidata.
--
-- Obrigatorios no formulario de cadastro (client-side, via `required` nos
-- campos), mas NAO viram "not null" no banco — mesmo padrao ja usado pra
-- nome/bairro/celular desde o sql/001, pra nao quebrar contas ja
-- existentes (que ficam com esses campos nulos ate' o dia em que houver
-- uma tela de editar cadastro).

alter table public.profiles add column if not exists sexo text;
alter table public.profiles add column if not exists data_nascimento date;
alter table public.profiles add column if not exists estado_civil text;

alter table public.profiles drop constraint if exists profiles_sexo_check;
alter table public.profiles add constraint profiles_sexo_check
  check (sexo is null or sexo in ('Masculino', 'Feminino', 'Prefiro não informar'));

alter table public.profiles drop constraint if exists profiles_estado_civil_check;
alter table public.profiles add constraint profiles_estado_civil_check
  check (estado_civil is null or estado_civil in ('Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União estável'));

-- profiles ja tinha update travado a colunas especificas desde o sql/002 —
-- reemite incluindo os 3 campos novos (nenhuma tela de editar cadastro
-- existe ainda, mas mantem consistente com os demais campos editaveis).
revoke update on public.profiles from authenticated;
grant update (nome, bairro, distrito, celular, sexo, data_nascimento, estado_civil) on public.profiles to authenticated;

-- handle_new_user passa a gravar os 3 campos novos, vindos do cadastro
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

  insert into public.profiles (id, nome, bairro, distrito, celular, email, empresa_id, sexo, data_nascimento, estado_civil)
  values (
    new.id,
    new.raw_user_meta_data->>'nome',
    new.raw_user_meta_data->>'bairro',
    new.raw_user_meta_data->>'distrito',
    new.raw_user_meta_data->>'celular',
    new.email,
    v_empresa_id,
    new.raw_user_meta_data->>'sexo',
    nullif(new.raw_user_meta_data->>'data_nascimento', '')::date,
    new.raw_user_meta_data->>'estado_civil'
  );
  return new;
end;
$$ language plpgsql security definer;

-- candidaturas_vagas ganha o snapshot dos 3 campos novos, mesmo mecanismo
-- ja usado pra nome/bairro/celular (trigger before insert, nunca confia
-- em valor vindo do client).
alter table public.candidaturas_vagas add column if not exists sexo_candidato text;
alter table public.candidaturas_vagas add column if not exists data_nascimento_candidato date;
alter table public.candidaturas_vagas add column if not exists estado_civil_candidato text;

create or replace function public.preencher_candidatura_vaga()
returns trigger as $$
begin
  select nome, bairro, celular, sexo, data_nascimento, estado_civil
    into new.nome_candidato, new.bairro_candidato, new.celular_candidato,
         new.sexo_candidato, new.data_nascimento_candidato, new.estado_civil_candidato
  from public.profiles
  where id = auth.uid();
  return new;
end;
$$ language plpgsql;
