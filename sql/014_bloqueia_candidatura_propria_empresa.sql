-- Portau — Bloqueia usuario de empresa se candidatar a vaga da propria empresa
-- Rodar manualmente no SQL Editor do painel Supabase, depois do 013.
--
-- Usa security definer (mesmo padrao de candidatei_me_a_vaga/
-- sou_empresa_da_vaga do sql/013) para consultar vagas_empresas/profiles
-- por baixo da RLS delas, evitando reintroduzir qualquer risco de
-- recursao entre candidaturas_vagas e vagas_empresas.

create or replace function public.mesma_empresa_da_vaga(p_vaga_id uuid)
returns boolean
language sql stable security definer
as $$
  select exists (
    select 1 from public.vagas_empresas v
    join public.profiles p on p.id = auth.uid()
    where v.id = p_vaga_id and p.empresa_id is not null and v.empresa_id = p.empresa_id
  );
$$;

grant execute on function public.mesma_empresa_da_vaga(uuid) to authenticated;

drop policy if exists "candidaturas_vagas_insert_propria" on public.candidaturas_vagas;
create policy "candidaturas_vagas_insert_propria"
  on public.candidaturas_vagas for insert to authenticated
  with check (
    auth.uid() = candidato_user_id
    and exists (
      select 1 from public.vagas_empresas v
      where v.id = vaga_id and v.ativa = true and v.status = 'ativa' and v.expira_em > now()
    )
    and not public.mesma_empresa_da_vaga(vaga_id)
  );
