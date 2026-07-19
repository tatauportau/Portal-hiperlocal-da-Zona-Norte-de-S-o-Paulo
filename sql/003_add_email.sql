-- Portau — Copia o e-mail para a tabela profiles
-- Rodar manualmente no SQL Editor do painel Supabase, depois do 002_add_celular.sql.
--
-- O e-mail de login fica em auth.users (tabela interna do Supabase, que o
-- site nao consegue consultar diretamente por seguranca). Copiamos para
-- profiles.email para o app poder exibir/usar sem precisar de acesso
-- administrativo. Esta copia e' feita uma vez no cadastro; se o usuario
-- trocar de e-mail depois pelo fluxo do Supabase Auth, essa coluna nao
-- atualiza sozinha (fica para uma melhoria futura, se for preciso).

alter table public.profiles add column email text;

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nome, bairro, distrito, celular, email)
  values (
    new.id,
    new.raw_user_meta_data->>'nome',
    new.raw_user_meta_data->>'bairro',
    new.raw_user_meta_data->>'distrito',
    new.raw_user_meta_data->>'celular',
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

-- Preenche o e-mail dos perfis ja criados antes desta migracao (ex.: as
-- contas de teste que ja existem).
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is null;
