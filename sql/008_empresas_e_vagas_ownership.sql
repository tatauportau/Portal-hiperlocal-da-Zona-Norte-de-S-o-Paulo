-- Portau — Contas de empresa (CNPJ) + ciclo de vida das vagas patrocinadas
-- Rodar manualmente no SQL Editor do painel Supabase, depois do 007.
--
-- Isso muda o modelo de publicacao de vagas de "totalmente anonimo" pra
-- "exige conta de empresa" — deixa de haver insert publico sem login a
-- partir daqui. Empresa cadastra CNPJ + Nome da empresa no mesmo
-- login/cadastro que os leitores ja usam (sql/001-003); o CNPJ e' quem
-- relaciona varios usuarios (colegas de trabalho) a' mesma empresa.
--
-- 0) Limpa vagas de teste sem dono ----------------------------------------
-- Havia 4 linhas em vagas_empresas de quando o formulario ainda era
-- anonimo (testes feitos durante o desenvolvimento desta e das features
-- anteriores) — confirmado com o Carlos que sao descartaveis. Sem isso, os
-- "not null" de criado_por_user_id/empresa_id/dias_validade abaixo falham
-- pra essas linhas (nao tem como atribuir dono retroativamente a uma vaga
-- que nunca teve conta associada).
delete from public.vagas_empresas;

-- 1) Empresas -------------------------------------------------------------
create table if not exists public.empresas (
  id uuid primary key default gen_random_uuid(),
  cnpj text not null unique,
  nome_empresa text not null check (char_length(nome_empresa) between 2 and 120),
  created_at timestamptz not null default now(),
  constraint empresas_cnpj_formato check (cnpj ~ '^[0-9]{14}$')
);

alter table public.empresas enable row level security;

-- Sem policy de insert/update/delete: a linha so' e' criada/lida pelo
-- trigger security definer abaixo (dono da tabela ignora RLS), igual ao
-- padrao ja usado em profiles/handle_new_user desde o 001.

-- 2) profiles ganha o vinculo com empresa (precisa vir ANTES da policy de
-- empresas abaixo, que consulta profiles.empresa_id) ----------------------
alter table public.profiles add column if not exists empresa_id uuid references public.empresas(id);
create index if not exists profiles_empresa_id_idx on public.profiles (empresa_id) where empresa_id is not null;

-- IMPORTANTE: empresa_id NAO entra no grant update de profiles (fica de
-- fora, igual subscription_tier em 001) — usuario autenticado nao pode se
-- auto-promover a conta de empresa depois do cadastro, só o trigger grava.

create or replace function public.minha_empresa_id()
returns uuid language sql stable security invoker as $$
  select empresa_id from public.profiles where id = auth.uid()
$$;

drop policy if exists "usuario le a propria empresa" on public.empresas;
create policy "usuario le a propria empresa"
  on public.empresas for select to authenticated
  using (id = public.minha_empresa_id());

-- 3) handle_new_user passa a resolver empresa via CNPJ --------------------
-- Find-or-create ATOMICO dentro do proprio trigger. Nunca confiar em
-- empresa_id vindo do client (raw_user_meta_data e' controlado por quem
-- chama signUp() — so' cnpj/nome_empresa em texto puro trafegam por ali,
-- a resolucao pra empresa_id acontece so' aqui, server-side).
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_cnpj text;
  v_nome_empresa text;
  v_empresa_id uuid;
begin
  v_cnpj := regexp_replace(coalesce(new.raw_user_meta_data->>'cnpj', ''), '\D', '', 'g');
  v_nome_empresa := new.raw_user_meta_data->>'nome_empresa';

  if v_cnpj <> '' then
    if char_length(v_cnpj) <> 14 then
      raise exception 'CNPJ invalido';
    end if;
    insert into public.empresas (cnpj, nome_empresa)
    values (v_cnpj, coalesce(nullif(trim(v_nome_empresa), ''), 'Empresa'))
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

-- UX opcional (mesmo padrao de celular_ja_cadastrado, sql/002): avisar no
-- formulario que o CNPJ ja existe e a conta vai entrar como membro daquela
-- empresa, antes de submeter o cadastro.
create or replace function public.empresa_por_cnpj(numero text)
returns table(existe boolean, nome_empresa text) as $$
  select true, e.nome_empresa from public.empresas e
  where e.cnpj = regexp_replace(numero, '\D', '', 'g')
$$ language sql security definer stable;

grant execute on function public.empresa_por_cnpj(text) to anon, authenticated;

-- 4) vagas_empresas: dono, validade escolhida, ciclo de vida --------------
-- expira_em NAO pode ser GENERATED: timestamptz + interval nao e'
-- imutavel pro Postgres (depende do TimeZone da sessao), entao uma coluna
-- gerada com essa expressao da' erro 42P17. Em vez disso, um trigger
-- BEFORE INSERT calcula e grava expira_em — mesma garantia (nunca grava
-- sozinho vindo do client, sempre derivado de criado_em + dias_validade),
-- so' que via trigger em vez de coluna gerada.
alter table public.vagas_empresas
  add column if not exists criado_por_user_id uuid not null default auth.uid() references auth.users(id),
  add column if not exists empresa_id uuid not null default public.minha_empresa_id() references public.empresas(id),
  add column if not exists dias_validade int not null check (dias_validade in (7,14,21,30)),
  add column if not exists expira_em timestamptz,
  add column if not exists status text not null default 'ativa' check (status in ('ativa','cancelada','contratada')),
  add column if not exists motivo_cancelamento text,
  add column if not exists contratado_descricao text,
  add column if not exists contratado_nota int;

create or replace function public.calcular_expira_em_vaga()
returns trigger as $$
begin
  new.expira_em := new.criado_em + (new.dias_validade * interval '1 day');
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_vagas_empresas_expira_em on public.vagas_empresas;
create trigger trg_vagas_empresas_expira_em
  before insert on public.vagas_empresas
  for each row execute function public.calcular_expira_em_vaga();

alter table public.vagas_empresas
  add constraint vagas_empresas_motivo_cancelamento_check
    check (status <> 'cancelada' or (motivo_cancelamento is not null and char_length(motivo_cancelamento) between 3 and 500)),
  add constraint vagas_empresas_contratado_nota_check
    check (contratado_nota is null or contratado_nota between 1 and 5),
  add constraint vagas_empresas_contratado_check
    check (status <> 'contratada' or (contratado_nota is not null and contratado_descricao is not null and char_length(contratado_descricao) between 10 and 1000));

create index if not exists vagas_empresas_empresa_id_idx on public.vagas_empresas (empresa_id);

-- 5) RLS: substitui insert publico/select antigos por versoes com dono ----
drop policy if exists "vagas_empresas_insert_publico" on public.vagas_empresas;
drop policy if exists "vagas_empresas_select_ativas" on public.vagas_empresas;
drop policy if exists "vagas_empresas_insert_empresa_logada" on public.vagas_empresas;
drop policy if exists "vagas_empresas_select_publico_ativas" on public.vagas_empresas;
drop policy if exists "vagas_empresas_select_propria_empresa" on public.vagas_empresas;
drop policy if exists "vagas_empresas_update_proprio_usuario" on public.vagas_empresas;

create policy "vagas_empresas_insert_empresa_logada"
  on public.vagas_empresas for insert to authenticated
  with check (
    auth.uid() = criado_por_user_id
    and empresa_id = public.minha_empresa_id()
    and status = 'ativa'
  );

-- Leitura publica: so' vagas ativas, com status ativa e ainda dentro da
-- validade escolhida no cadastro.
create policy "vagas_empresas_select_publico_ativas"
  on public.vagas_empresas for select
  using (ativa = true and status = 'ativa' and expira_em > now());

-- Leitura da propria empresa: mostra TODAS as vagas da empresa (mesmo
-- expiradas/canceladas/contratadas), pra alimentar o painel "Minhas Vagas".
create policy "vagas_empresas_select_propria_empresa"
  on public.vagas_empresas for select to authenticated
  using (empresa_id = public.minha_empresa_id());

-- Update: so' quem criou aquela vaga especifica pode editar/cancelar/
-- marcar como contratada (pedido explicito do Carlos), e so' enquanto
-- ainda esta ativa e dentro da validade — depois disso, so' cadastrando
-- uma vaga nova.
create policy "vagas_empresas_update_proprio_usuario"
  on public.vagas_empresas for update to authenticated
  using (criado_por_user_id = auth.uid() and status = 'ativa' and expira_em > now())
  with check (empresa_id = public.minha_empresa_id());

-- 6) Trava de colunas (padrao identico ao subscription_tier de 001) -------
-- RLS restringe QUAIS linhas; sem isso, RLS nao restringe QUAIS colunas —
-- um usuario autenticado poderia gravar ativa/empresa_id/criado_por_user_id
-- direto via update() se a coluna nao estiver bloqueada aqui.
revoke update on public.vagas_empresas from authenticated;
grant update (
  nome_empresa, email_contato, whatsapp_contato, titulo_vaga, horario, salario,
  beneficios, beneficios_outro, descricao, distritos_completos, bairros_por_distrito,
  localizacao_externa, tipo_contrato, link_candidatura,
  status, motivo_cancelamento, contratado_descricao, contratado_nota
) on public.vagas_empresas to authenticated;
-- Fora do grant (proposital): id, criado_em, criado_por_user_id, empresa_id,
-- ativa (continua so' o botao-de-panico de spam do Carlos via
-- service_role/Table Editor), dias_validade (expira_em e' GENERATED, nao
-- grava mesmo com grant nessa coluna).
