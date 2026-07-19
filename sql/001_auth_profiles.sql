-- Portau — Cadastro de usuário com login
-- Rodar manualmente no SQL Editor do painel Supabase (Project → SQL Editor).
-- Requer o schema auth.users padrão do Supabase Auth (já vem pronto).

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  bairro text,
  distrito text,
  subscription_tier text not null default 'free' check (subscription_tier in ('free','assinante')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "usuario le o proprio perfil"
  on public.profiles for select using (auth.uid() = id);

create policy "usuario atualiza o proprio perfil"
  on public.profiles for update using (auth.uid() = id);

-- trava subscription_tier: usuário autenticado não pode se auto-promover a assinante.
-- promoção só poderá ser feita depois via service_role key num contexto servidor
-- (ex.: webhook de pagamento), nunca pelo próprio usuário.
revoke update on public.profiles from authenticated;
grant update (nome, bairro, distrito) on public.profiles to authenticated;

-- cria o profile automaticamente quando alguém se cadastra
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nome, bairro, distrito)
  values (
    new.id,
    new.raw_user_meta_data->>'nome',
    new.raw_user_meta_data->>'bairro',
    new.raw_user_meta_data->>'distrito'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
