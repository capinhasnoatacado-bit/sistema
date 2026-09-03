-- Categoria de benchmark vira entidade de verdade (antes era texto livre em
-- benchmark_jobs.categoria) — cada categoria define os campos que aparecem
-- como coluna dedicada na tabela de produtos importados (ver
-- src/lib/scraping/category-columns.ts), configuráveis pelo usuário na tela
-- /configuracoes em vez de fixos no código.
create table public.benchmark_categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  -- Nomes de campo (ex: ["Cor", "Comprimento (m)", "Amperagem"]), na ordem
  -- que aparecem como coluna na tabela de produtos.
  campos jsonb not null default '[]'::jsonb,
  criado_em timestamptz not null default now()
);

alter table public.benchmark_jobs
  add column categoria_id uuid references public.benchmark_categorias (id) on delete set null;

-- Coluna antiga (texto livre) — sem dado pra migrar: a tabela benchmark_jobs
-- já foi zerada localmente antes dessa migration (sem seed pra ela).
alter table public.benchmark_jobs drop column categoria;

create index benchmark_jobs_categoria_id_idx on public.benchmark_jobs (categoria_id);

-- Categoria "Cabo" com os campos que já estavam fixos no código antes dessa
-- migration, pra não começar vazio (piloto do sistema é cabo).
insert into public.benchmark_categorias (nome, campos)
values (
  'Cabo',
  '["Cor", "Comprimento (m)", "Amperagem", "Conector origem", "Conector destino", "Material"]'::jsonb
)
on conflict (nome) do nothing;
