-- Adiciona coluna 'type' à tabela portfolio_investments se não existir
alter table public.portfolio_investments
add column if not exists type text not null default 'cash';

-- Atualiza os registos cujo nome é 'aforro' para terem o tipo correto
update public.portfolio_investments
set type = 'aforro'
where lower(trim(name)) = 'aforro'
  and type = 'cash';
