-- Benchmark de preços: importa produtos de sites concorrentes (via link
-- colado pelo usuário) para comparar com o catálogo próprio (fornecedores/
-- produtos) mais adiante.
--
-- benchmark_jobs     -> 1 linha por link colado (produto único ou categoria).
-- benchmark_produtos -> 1 linha por produto extraído durante o processamento
--                        de um job.
--
-- Decisões de modelagem:
-- * `codigo` é campo de primeira classe (não só dentro de `especificacoes`)
--   porque é ele que permite cruzar um produto do concorrente com um
--   produto próprio em `produtos.codigo` (ex: JSON-LD sku/mpn "CB148-3").
-- * `especificacoes` é jsonb pelo mesmo motivo já usado em `produtos`: cada
--   categoria de produto tem specs diferentes (cabo tem conector/
--   comprimento, outra categoria pode ter outra coisa).
-- * Sem RLS, mesma decisão já tomada pra fornecedores/produtos/pedidos —
--   projeto ainda não tem Auth implementado.
-- * `urls_pendentes` guarda a fila de links de produto ainda não
--   processados. O processamento roda em lotes pequenos (uma chamada por
--   lote, não uma função de longa duração) pra caber no tempo de uma
--   requisição serverless — cada chamada tira um punhado de URLs da fila,
--   processa, e regrava o restante. É o que permite retomar de onde parou
--   mesmo que o navegador feche no meio do processamento.

create table public.benchmark_jobs (
  id uuid primary key default gen_random_uuid(),
  url_origem text not null,
  site_origem text,
  tipo text check (tipo in ('produto', 'categoria', 'manual')),
  status text not null default 'pendente'
    check (status in ('pendente', 'processando', 'concluido', 'erro')),
  total_encontrado integer not null default 0,
  total_importado integer not null default 0,
  total_com_erro integer not null default 0,
  urls_pendentes text[] not null default '{}'::text[],
  mensagem_erro text,
  criado_em timestamptz not null default now(),
  iniciado_em timestamptz,
  finalizado_em timestamptz
);

comment on table public.benchmark_jobs is
  'Um job por link colado pelo usuário para importar produtos de um site concorrente.';
comment on column public.benchmark_jobs.tipo is
  'Detectado automaticamente ao processar: "produto" (uma página) ou "categoria" (listagem paginada). "manual" é cadastro manual (site exige login, scraping não roda).';
comment on column public.benchmark_jobs.status is
  'pendente -> processando -> concluido | erro.';
comment on column public.benchmark_jobs.urls_pendentes is
  'Fila de links de produto ainda não processados nesse job — esvazia conforme os lotes são processados.';
comment on column public.benchmark_jobs.total_com_erro is
  'Quantos produtos da fila falharam na extração (não derruba o job inteiro, só é contabilizado).';

create table public.benchmark_produtos (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.benchmark_jobs (id) on delete cascade,
  url_produto text not null,
  nome text,
  marca text,
  codigo text,
  preco numeric(10, 2),
  imagem_url text,
  especificacoes jsonb not null default '{}'::jsonb,
  capturado_em timestamptz not null default now(),
  unique (job_id, url_produto)
);

comment on table public.benchmark_produtos is
  'Produtos extraídos de um benchmark_jobs, pra comparar com o catálogo próprio.';
comment on column public.benchmark_produtos.codigo is
  'SKU/modelo do produto no site do concorrente (quando exposto), pra cruzar com produtos.codigo.';
comment on column public.benchmark_produtos.especificacoes is
  'Specs livres (potência, comprimento, conectores, etc.) que variam por categoria de produto.';

create index benchmark_produtos_job_id_idx on public.benchmark_produtos (job_id);
create index benchmark_produtos_codigo_idx on public.benchmark_produtos (codigo);
