-- Portau — Candidaturas de leitores a vagas patrocinadas (opt-in, compartilha
-- nome/bairro/celular com a empresa anunciante)
-- Rodar manualmente no SQL Editor do painel Supabase, depois do 011.
--
-- Modelo: nome/bairro/celular sao SNAPSHOTADOS no momento da candidatura (via
-- trigger, nunca confiando em valor vindo do client) — assim uma edicao
-- posterior no profile do candidato nao reescreve retroativamente o que a
-- empresa ja viu, e a empresa nunca precisa de select em profiles de
-- terceiros (o que exigiria uma policy adicional perigosa). Simetricamente,
-- os dados da vaga (titulo/empresa/status) NAO sao snapshotados aqui — o
-- leitor sempre ve o estado atual via join, o que exige uma 4a policy de
-- select em vagas_empresas (ver final do arquivo).

create table public.candidaturas_vagas (
  id uuid primary key default gen_random_uuid(),
  vaga_id uuid not null references public.vagas_empresas(id),
  candidato_user_id uuid not null default auth.uid() references auth.users(id),
  nome_candidato text not null,
  bairro_candidato text,
  celular_candidato text not null,
  criado_em timestamptz not null default now(),
  unique (vaga_id, candidato_user_id)
);

alter table public.candidaturas_vagas enable row level security;
create index candidaturas_vagas_candidato_idx on public.candidaturas_vagas (candidato_user_id);

-- Snapshot server-side de nome/bairro/celular, nunca confiando no client
-- (mesmo padrao de expira_em/empresa_id em vagas_empresas: trigger/default,
-- nao valor vindo do insert).
create or replace function public.preencher_candidatura_vaga()
returns trigger as $$
begin
  select nome, bairro, celular
    into new.nome_candidato, new.bairro_candidato, new.celular_candidato
  from public.profiles
  where id = auth.uid();
  return new;
end;
$$ language plpgsql;

create trigger trg_candidaturas_vagas_preencher
  before insert on public.candidaturas_vagas
  for each row execute function public.preencher_candidatura_vaga();

-- Insert: so' para si mesmo, e so' em vaga genuinamente ativa/nao-expirada.
-- Inclui ativa=true explicitamente — nao depender implicitamente da RLS de
-- vagas_empresas pra isso (mesma licao do bug do carregarVagasEmpresas
-- corrigido nesta sessao: nunca confiar em composicao implicita de
-- policies pra produzir o resultado esperado, dizer explicitamente).
create policy "candidaturas_vagas_insert_propria"
  on public.candidaturas_vagas for insert to authenticated
  with check (
    auth.uid() = candidato_user_id
    and exists (
      select 1 from public.vagas_empresas v
      where v.id = vaga_id and v.ativa = true and v.status = 'ativa' and v.expira_em > now()
    )
  );

-- Select: candidato ve as proprias candidaturas ("Minhas Candidaturas").
create policy "candidaturas_vagas_select_propria"
  on public.candidaturas_vagas for select to authenticated
  using (candidato_user_id = auth.uid());

-- Select: empresa ve quem se candidatou as PROPRIAS vagas.
create policy "candidaturas_vagas_select_empresa"
  on public.candidaturas_vagas for select to authenticated
  using (exists (
    select 1 from public.vagas_empresas v
    where v.id = vaga_id and v.empresa_id = public.minha_empresa_id()
  ));

-- Delete: retirar candidatura (withdrawal), sem restricao de status da
-- vaga — o candidato pode querer sair mesmo se a vaga ja expirou/foi
-- cancelada/preenchida.
create policy "candidaturas_vagas_delete_propria"
  on public.candidaturas_vagas for delete to authenticated
  using (candidato_user_id = auth.uid());

-- Sem policy de update: candidatura e' so' criar/ver/apagar, nunca editar
-- in place (retirar e recandidatar depois e' mais simples que editar um
-- snapshot).

revoke all on public.candidaturas_vagas from public;
grant select, insert, delete on public.candidaturas_vagas to authenticated;

-- 4a policy de select em vagas_empresas: candidato precisa ver a vaga
-- (titulo/empresa/status atuais) pra qual se candidatou, mesmo depois dela
-- sair do ar publicamente (expirada/cancelada/contratada) — sem isso, o
-- embed vagas_empresas(...) num select de candidaturas_vagas vem null pra
-- qualquer vaga que ja nao esteja mais nas outras policies de select
-- (publica-ativa ou propria-empresa).
create policy "vagas_empresas_select_candidato_proprio"
  on public.vagas_empresas for select to authenticated
  using (exists (
    select 1 from public.candidaturas_vagas c
    where c.vaga_id = id and c.candidato_user_id = auth.uid()
  ));
