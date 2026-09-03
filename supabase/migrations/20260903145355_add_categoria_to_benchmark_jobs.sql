-- Categoria do job de benchmark (ex: "cabo") — mesma ideia de
-- `produtos.categoria`: texto livre, sem enum fixo, pra não precisar de
-- migration toda vez que uma categoria nova aparecer. Usada pra agrupar a
-- lista de importações e pra decidir quais colunas de especificações
-- aparecem em destaque na tabela de produtos (ver mapeamento em
-- src/lib/scraping/category-columns.ts). Jobs existentes ficam com
-- categoria null ("Sem categoria") — não dá pra inferir isso de dados que
-- já existem.
alter table public.benchmark_jobs add column categoria text;

create index benchmark_jobs_categoria_idx on public.benchmark_jobs (categoria);
