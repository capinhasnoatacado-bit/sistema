-- Pedido montado no carrinho do comparador e finalizado pelo usuário.
--
-- Decisões de modelagem:
-- * O carrinho em si (produtos sendo escolhidos, antes de finalizar) vive
--   só no navegador (localStorage) — essas tabelas só recebem o pedido já
--   FINALIZADO. Evita registrar "carrinhos abandonados" no banco.
-- * `pedido_itens.preco_unitario_pedido` congela o preço do produto no
--   momento em que o pedido foi finalizado. Se o preço do produto mudar
--   depois (recadastro de catálogo), o histórico do pedido não muda.
-- * Sem RLS, mesma decisão já tomada pra fornecedores/produtos — projeto
--   ainda não tem Auth implementado.

create table public.pedidos (
  id uuid primary key default gen_random_uuid(),
  criado_em timestamptz not null default now(),
  observacoes text
);

create table public.pedido_itens (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos (id) on delete cascade,
  -- on delete restrict: não deixa apagar um produto que já entrou em algum
  -- pedido, pra não perder a integridade do histórico.
  produto_id uuid not null references public.produtos (id) on delete restrict,
  quantidade integer not null check (quantidade > 0),
  preco_unitario_pedido numeric(10, 2) not null check (preco_unitario_pedido >= 0),
  created_at timestamptz not null default now()
);

create index pedido_itens_pedido_id_idx on public.pedido_itens (pedido_id);
create index pedido_itens_produto_id_idx on public.pedido_itens (produto_id);
