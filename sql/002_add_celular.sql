-- Portau — Adiciona campo de celular ao cadastro (uso futuro: serviços via WhatsApp)
-- Rodar manualmente no SQL Editor do painel Supabase, depois do 001_auth_profiles.sql.

alter table public.profiles add column celular text;

-- Guardamos só os dígitos (ex.: 11987654321), sem formatação — pronto para
-- prefixar o código do país (55) quando integrar com a API do WhatsApp.
-- Índice único parcial: permite qualquer quantidade de contas sem celular
-- (celular = null), mas impede duas contas com o mesmo número.
create unique index profiles_celular_unico on public.profiles (celular) where celular is not null;

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nome, bairro, distrito, celular)
  values (
    new.id,
    new.raw_user_meta_data->>'nome',
    new.raw_user_meta_data->>'bairro',
    new.raw_user_meta_data->>'distrito',
    new.raw_user_meta_data->>'celular'
  );
  return new;
end;
$$ language plpgsql security definer;

grant update (nome, bairro, distrito, celular) on public.profiles to authenticated;

-- Permite checar (sem expor nenhum dado) se um celular já está cadastrado,
-- usado no formulário de cadastro antes de criar a conta.
create function public.celular_ja_cadastrado(numero text)
returns boolean as $$
  select exists(select 1 from public.profiles where celular = numero);
$$ language sql security definer stable;

grant execute on function public.celular_ja_cadastrado(text) to anon, authenticated;
