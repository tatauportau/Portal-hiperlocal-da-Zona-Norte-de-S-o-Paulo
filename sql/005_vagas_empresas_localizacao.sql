-- Portau — Vagas de empresas: localizacao passa a suportar multiplos
-- distritos/bairros (em vez de um unico bairro em texto livre/autocomplete).
-- Rodar manualmente no SQL Editor do painel Supabase, depois do
-- 004_vagas_empresas.sql.
--
-- Motivo: o formulario "Anuncie sua vaga" agora usa o mesmo mapa D3 do
-- modal "Bairros da Zona Norte", permitindo a empresa marcar um ou mais
-- distritos inteiros e/ou bairros especificos dentro deles.
--
-- IMPORTANTE (retrabalho): a primeira versao desta migracao dropava a
-- coluna `bairro` antes de reaproveitar o valor dela, e assumia que a
-- tabela estava vazia. Nao estava — ja existia pelo menos 1 vaga real
-- cadastrada pelo formulario antigo (de um teste em producao), o que
-- violou a constraint de localizacao (nenhuma das novas colunas tinha
-- valor pra essa linha). Esta versao adiciona as colunas novas e faz o
-- backfill a partir de `bairro` ANTES de dropar a coluna antiga, gravando
-- o valor antigo em `localizacao_externa` (texto livre) — nao e' o ideal
-- (perde a granularidade de multi-selecao pra essa vaga especifica), mas
-- preserva a informacao em vez de descartar.
--
-- Formato das novas colunas:
--   distritos_completos: lista de distritos selecionados por inteiro
--     (ex.: '{SANTANA,TUCURUVI}') — no card, mostra so o nome do distrito.
--   bairros_por_distrito: objeto { "DISTRITO": ["Bairro X", "Bairro Y"] }
--     so para distritos com selecao PARCIAL — no card, mostra os bairros
--     especificos daquele distrito.
--   localizacao_externa: texto livre, alternativa mutuamente exclusiva ao
--     mapa, para empresa fora da Zona Norte (mesmo padrao do campo
--     "bairroOutro" do cadastro de leitor).

alter table public.vagas_empresas add column if not exists distritos_completos text[] not null default '{}';
alter table public.vagas_empresas add column if not exists bairros_por_distrito jsonb not null default '{}'::jsonb;
alter table public.vagas_empresas add column if not exists localizacao_externa text;

-- Backfill: preserva o bairro antigo (se existir e a linha ainda nao tiver
-- nada nas colunas novas) como localizacao_externa, antes de dropar a coluna.
update public.vagas_empresas
set localizacao_externa = bairro
where bairro is not null
  and char_length(bairro) > 0
  and coalesce(array_length(distritos_completos, 1), 0) = 0
  and bairros_por_distrito = '{}'::jsonb
  and localizacao_externa is null;

alter table public.vagas_empresas drop column if exists bairro;

alter table public.vagas_empresas drop constraint if exists vagas_empresas_localizacao_check;
alter table public.vagas_empresas add constraint vagas_empresas_localizacao_check
  check (
    coalesce(array_length(distritos_completos, 1), 0) > 0
    or bairros_por_distrito <> '{}'::jsonb
    or (localizacao_externa is not null and char_length(localizacao_externa) > 0)
  );
