-- Benchmark de preços: importa produtos de sites concorrentes (via link colado
-- pelo usuário) para comparar depois com o catálogo próprio.
--
-- benchmark_jobs     -> 1 linha por link colado (produto único ou categoria).
-- benchmark_produtos -> 1 linha por produto extraído durante o processamento
--                        de um job.

create table public.benchmark_jobs (
  id uuid primary key default gen_random_uuid(),
  url_origem text not null,
  site_origem text,
  tipo text check (tipo in ('produto', 'categoria')),
  status text not null default 'pendente'
    check (status in ('pendente', 'processando', 'concluido', 'erro')),
  total_encontrado integer not null default 0,
  total_importado integer not null default 0,
  mensagem_erro text,
  criado_por uuid not null references auth.users (id),
  criado_em timestamptz not null default now(),
  iniciado_em timestamptz,
  finalizado_em timestamptz
);

comment on table public.benchmark_jobs is
  'Um job por link colado pelo usuário para importar produtos de um site concorrente.';
comment on column public.benchmark_jobs.tipo is
  'Detectado automaticamente ao processar: "produto" (uma página) ou "categoria" (listagem paginada).';
comment on column public.benchmark_jobs.status is
  'pendente -> processando -> concluido | erro.';

create table public.benchmark_produtos (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.benchmark_jobs (id) on delete cascade,
  url_produto text not null,
  nome text,
  marca text,
  preco numeric(10, 2),
  imagem_url text,
  atributos jsonb not null default '{}'::jsonb,
  capturado_em timestamptz not null default now(),
  unique (job_id, url_produto)
);

comment on table public.benchmark_produtos is
  'Produtos extraídos de um benchmark_jobs. "atributos" guarda specs livres (marca, modelo, potência, etc.) que variam por categoria de produto.';

create index benchmark_produtos_job_id_idx on public.benchmark_produtos (job_id);
create index benchmark_jobs_criado_por_idx on public.benchmark_jobs (criado_por);

alter table public.benchmark_jobs enable row level security;
alter table public.benchmark_produtos enable row level security;

-- Ferramenta interna: qualquer usuário autenticado pode ver e criar jobs e
-- produtos (não há conceito de múltiplos tenants ainda). A escrita de
-- produtos e a atualização de status do job acontecem via service role no
-- processamento em background.
create policy "Usuários autenticados podem ver jobs"
  on public.benchmark_jobs for select
  to authenticated
  using (true);

create policy "Usuários autenticados podem criar jobs"
  on public.benchmark_jobs for insert
  to authenticated
  with check (criado_por = auth.uid());

create policy "Usuários autenticados podem ver produtos"
  on public.benchmark_produtos for select
  to authenticated
  using (true);
