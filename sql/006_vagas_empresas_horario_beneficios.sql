-- Portau — Vagas de empresas: adiciona horario e beneficios como campos
-- proprios (antes ficavam misturados dentro de `descricao` em texto livre).
-- Rodar manualmente no SQL Editor do painel Supabase, depois do
-- 005_vagas_empresas_localizacao.sql.
--
-- `titulo_vaga` continua sendo a mesma coluna de texto de sempre — o
-- formulario passou a oferecer uma lista de cargos comuns + opcao "Outro",
-- mas o valor final (escolhido da lista ou digitado em "Outro") e' gravado
-- normalmente ali, sem mudanca de schema.
--
-- Ambos os campos novos sao opcionais (nem toda vaga tem horario/beneficio
-- bem definido, e exigir isso criaria atrito desnecessario no cadastro).
--   horario: texto livre (ex.: "Seg-Sex, 8h as 17h").
--   beneficios: lista de beneficios marcados na checklist do formulario
--     (ex.: '{Vale-transporte,Vale-refeição}').
--   beneficios_outro: texto livre para um beneficio fora da lista, quando a
--     opcao "Outro" e' marcada.

alter table public.vagas_empresas add column if not exists horario text;
alter table public.vagas_empresas add column if not exists beneficios text[] not null default '{}';
alter table public.vagas_empresas add column if not exists beneficios_outro text;

alter table public.vagas_empresas drop constraint if exists vagas_empresas_horario_check;
alter table public.vagas_empresas add constraint vagas_empresas_horario_check
  check (horario is null or char_length(horario) <= 200);

alter table public.vagas_empresas drop constraint if exists vagas_empresas_beneficios_outro_check;
alter table public.vagas_empresas add constraint vagas_empresas_beneficios_outro_check
  check (beneficios_outro is null or char_length(beneficios_outro) <= 200);
