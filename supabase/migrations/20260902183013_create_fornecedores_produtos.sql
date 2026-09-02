-- Fornecedores e produtos, base para a comparação de produtos entre
-- catálogos (reposição de estoque).
--
-- Decisões de modelagem:
-- * `produtos.especificacoes` é jsonb porque cada categoria de produto tem
--   um conjunto de atributos diferente (cabo tem conector/comprimento,
--   outra categoria pode ter outra coisa). Evita alterar o schema toda vez
--   que uma nova categoria de produto for cadastrada.
-- * `preco_unitario` é sempre o preço por peça (unidade), independente de o
--   fornecedor vender em caixa fechada ou por lote — normalizado na
--   inserção dos dados para permitir comparação direta entre fornecedores.
-- * `moq` (minimum order quantity) e `embalagem_unidades` ficam guardados
--   como contexto para quem for decidir a compra, mas não entram na conta
--   do preço comparado.

create table public.fornecedores (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  created_at timestamptz not null default now()
);

create table public.produtos (
  id uuid primary key default gen_random_uuid(),
  fornecedor_id uuid not null references public.fornecedores (id) on delete cascade,
  categoria text not null,
  codigo text,
  nome text not null,
  preco_unitario numeric(10, 2) not null check (preco_unitario >= 0),
  moq integer check (moq is null or moq > 0),
  embalagem_unidades integer check (embalagem_unidades is null or embalagem_unidades > 0),
  especificacoes jsonb not null default '{}'::jsonb,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (fornecedor_id, codigo)
);

create index produtos_categoria_idx on public.produtos (categoria);
create index produtos_especificacoes_idx on public.produtos using gin (especificacoes);

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger produtos_set_updated_at
  before update on public.produtos
  for each row
  execute function public.set_updated_at();
