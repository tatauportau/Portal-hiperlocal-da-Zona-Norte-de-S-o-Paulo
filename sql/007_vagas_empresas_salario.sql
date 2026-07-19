-- Portau — Vagas de empresas: adiciona campo salario (opcional, texto livre)
-- Rodar manualmente no SQL Editor do painel Supabase, depois do
-- 006_vagas_empresas_horario_beneficios.sql.
--
-- Alfanumerico de proposito — permite tanto valores (ex.: "R$ 1.800") quanto
-- texto livre como "A combinar", sem exigir formato numerico fixo.

alter table public.vagas_empresas add column if not exists salario text;

alter table public.vagas_empresas drop constraint if exists vagas_empresas_salario_check;
alter table public.vagas_empresas add constraint vagas_empresas_salario_check
  check (salario is null or char_length(salario) <= 60);
