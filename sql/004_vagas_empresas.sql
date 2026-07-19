-- Portau — Tabela de vagas publicadas por empresas parceiras
-- Rodar manualmente no SQL Editor do painel Supabase.
--
-- Cadastro publico (sem exigir login) e SEM aprovacao manual antes de
-- publicar — decisao consciente para testar o modelo antes de burocratizar.
-- A moderacao acontece depois: para tirar uma vaga do ar (spam, conteudo
-- indevido, etc.), basta rodar `update public.vagas_empresas set ativa =
-- false where id = '...'` no SQL Editor (ou editar a linha direto pelo
-- Table Editor). Nao ha policy de UPDATE/DELETE publica, entao so quem tem
-- acesso ao painel Supabase (service_role) consegue alterar depois de
-- criada.
--
-- Periodo de testes: publicacao gratuita ate 19/08/2026 (ver constante
-- VAGAS_GRATIS_ATE no index.html). Depois disso, cobranca fica para
-- decisao futura — este schema nao trata pagamento nem plano.

create table if not exists public.vagas_empresas (
  id uuid primary key default gen_random_uuid(),
  criado_em timestamptz not null default now(),
  nome_empresa text not null check (char_length(nome_empresa) between 2 and 120),
  email_contato text not null check (char_length(email_contato) between 5 and 160),
  whatsapp_contato text,
  titulo_vaga text not null check (char_length(titulo_vaga) between 3 and 120),
  descricao text not null check (char_length(descricao) between 10 and 600),
  bairro text not null,
  tipo_contrato text not null,
  link_candidatura text,
  ativa boolean not null default true
);

alter table public.vagas_empresas enable row level security;

-- Qualquer pessoa pode cadastrar uma vaga (formulario publico, sem cadastro/login)
create policy "vagas_empresas_insert_publico"
  on public.vagas_empresas for insert
  with check (true);

-- Leitura publica apenas das vagas ativas
create policy "vagas_empresas_select_ativas"
  on public.vagas_empresas for select
  using (ativa = true);
