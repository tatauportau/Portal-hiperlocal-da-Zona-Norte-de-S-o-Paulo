-- Portau — Permite validade de 1 dia nas vagas patrocinadas (alem de 7/14/21/30)
-- Rodar manualmente no SQL Editor do painel Supabase, depois do 010.
--
-- Motivo: util pra testar expiracao sem esperar uma semana — publica hoje
-- com validade de 1 dia, amanha ja' expira sozinha.

-- A constraint original (sql/008) foi criada inline num "add column ...
-- check (...)", cujo nome exato o Postgres gera automaticamente — em vez
-- de arriscar adivinhar errado (deixando a constraint antiga viva e
-- bloqueando o valor 1 silenciosamente), este bloco acha e remove
-- qualquer check constraint que mencione dias_validade, seja qual for
-- o nome, antes de recriar com o novo intervalo permitido.
do $$
declare
  r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'public.vagas_empresas'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%dias_validade%'
  loop
    execute format('alter table public.vagas_empresas drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.vagas_empresas add constraint vagas_empresas_dias_validade_check
  check (dias_validade in (1, 7, 14, 21, 30));
