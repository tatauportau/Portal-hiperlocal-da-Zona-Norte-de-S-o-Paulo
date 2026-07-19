-- Portau — Corrige recursao infinita de RLS entre vagas_empresas e candidaturas_vagas
-- Rodar manualmente no SQL Editor do painel Supabase, depois do 012.
--
-- BUG (encontrado 19/07/2026, relatado pelo Carlos: vagas patrocinadas
-- pararam de aparecer pra QUALQUER usuario logado, mesmo uma vaga nova
-- recem-criada): a migracao 012 adicionou uma policy de select em
-- vagas_empresas que consulta candidaturas_vagas (pro candidato ver a
-- vaga mesmo depois de expirada/cancelada). candidaturas_vagas, por sua
-- vez, ja tinha uma policy que consulta vagas_empresas (pra empresa ver
-- quem se candidatou). Como a RLS de uma tabela reavalia a RLS de
-- qualquer tabela referenciada numa subquery, isso criou um ciclo:
-- avaliar RLS de vagas_empresas aciona RLS de candidaturas_vagas, que
-- aciona RLS de vagas_empresas de novo, indefinidamente — o Postgres
-- detecta e aborta com "infinite recursion detected in policy for
-- relation...".
--
-- Isso quebrava TODA consulta autenticada a vagas_empresas (nao so' as
-- que dependiam da policy nova), porque o Postgres precisa avaliar todas
-- as policies permissivas pra fazer o OR entre elas, mesmo as que acabam
-- nao valendo pra linha em questao — inclusive o painel "Minhas Vagas" da
-- empresa. So' nao afetava visitantes anonimos porque policies "to
-- authenticated" nem sao avaliadas pro papel anon (por isso os testes
-- feitos so' com a anon key nao reproduziam o problema).
--
-- Fix: os dois pontos de referencia cruzada passam a usar funcoes
-- security definer, que consultam a tabela referenciada por baixo da RLS
-- dela (dono da tabela ignora a propria RLS — mesmo mecanismo ja usado
-- em handle_new_user()/minha_empresa_id()) — isso quebra o ciclo, porque
-- a funcao nao dispara reavaliacao de policy na tabela que ela consulta
-- por dentro.

create or replace function public.candidatei_me_a_vaga(p_vaga_id uuid)
returns boolean
language sql stable security definer
as $$
  select exists (
    select 1 from public.candidaturas_vagas c
    where c.vaga_id = p_vaga_id and c.candidato_user_id = auth.uid()
  );
$$;

create or replace function public.sou_empresa_da_vaga(p_vaga_id uuid)
returns boolean
language sql stable security definer
as $$
  select exists (
    select 1 from public.vagas_empresas v
    where v.id = p_vaga_id and v.empresa_id = public.minha_empresa_id()
  );
$$;

drop policy if exists "vagas_empresas_select_candidato_proprio" on public.vagas_empresas;
create policy "vagas_empresas_select_candidato_proprio"
  on public.vagas_empresas for select to authenticated
  using (public.candidatei_me_a_vaga(id));

drop policy if exists "candidaturas_vagas_select_empresa" on public.candidaturas_vagas;
create policy "candidaturas_vagas_select_empresa"
  on public.candidaturas_vagas for select to authenticated
  using (public.sou_empresa_da_vaga(vaga_id));
