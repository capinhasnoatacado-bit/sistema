import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { CLASSES_FONTES } from "@/lib/fonts";
import { TEMA_ESCURO } from "@/lib/theme";
import { ImportPanel } from "./ImportPanel";
import { JobProgress } from "./JobProgress";
import { DeleteJobButton } from "./DeleteJobButton";
import { ProdutosTable, type BenchmarkProdutoRow } from "./ProdutosTable";
import type { BenchmarkJob } from "@/lib/scraping/job-runner";

// job/produtos vêm de searchParams e do banco — não dá pra pré-renderizar.
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<BenchmarkJob["status"], string> = {
  pendente: "Analisando",
  processando: "Importando",
  concluido: "Concluído",
  erro: "Erro",
};

async function fetchJobsRecentes(supabase: SupabaseClient): Promise<BenchmarkJob[]> {
  const { data, error } = await supabase
    .from("benchmark_jobs")
    .select()
    .order("criado_em", { ascending: false })
    .limit(20);

  if (error) throw new Error(`Falha ao buscar os jobs de benchmark: ${error.message}`);
  return (data ?? []) as BenchmarkJob[];
}

async function fetchProdutosDoJob(supabase: SupabaseClient, jobId: string): Promise<BenchmarkProdutoRow[]> {
  const { data, error } = await supabase
    .from("benchmark_produtos")
    .select()
    .eq("job_id", jobId)
    .order("preco", { ascending: true, nullsFirst: false });

  if (error) throw new Error(`Falha ao buscar os produtos do job: ${error.message}`);
  return (data ?? []) as BenchmarkProdutoRow[];
}

/** Categorias já usadas em algum job — vira sugestão no combo de categoria dos formulários de importar/cadastrar. */
async function fetchCategoriasExistentes(supabase: SupabaseClient): Promise<string[]> {
  const { data, error } = await supabase.from("benchmark_jobs").select("categoria").not("categoria", "is", null);

  if (error) throw new Error(`Falha ao buscar as categorias: ${error.message}`);

  const unicas = new Set((data ?? []).map((row) => row.categoria as string));
  return [...unicas].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

type GrupoDeJobs = { categoria: string | null; jobs: BenchmarkJob[] };

/** Agrupa a lista (já ordenada por mais recente) por categoria — categorias em ordem alfabética, "Sem categoria" sempre por último. */
function agruparJobsPorCategoria(jobs: BenchmarkJob[]): GrupoDeJobs[] {
  const porCategoria = new Map<string | null, BenchmarkJob[]>();
  for (const job of jobs) {
    const lista = porCategoria.get(job.categoria) ?? [];
    lista.push(job);
    porCategoria.set(job.categoria, lista);
  }

  const comCategoria = [...porCategoria.entries()]
    .filter((entrada): entrada is [string, BenchmarkJob[]] => entrada[0] !== null)
    .sort(([a], [b]) => a.localeCompare(b, "pt-BR"))
    .map(([categoria, jobs]) => ({ categoria, jobs }));

  const semCategoria = porCategoria.get(null);

  return semCategoria ? [...comCategoria, { categoria: null, jobs: semCategoria }] : comCategoria;
}

export default async function BenchmarkPage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const jobs = await fetchJobsRecentes(supabase);
  const categorias = await fetchCategoriasExistentes(supabase);
  const jobIdSelecionado = params.job ?? jobs[0]?.id ?? null;
  const jobSelecionado = jobIdSelecionado ? (jobs.find((j) => j.id === jobIdSelecionado) ?? null) : null;

  const produtos =
    jobSelecionado && jobSelecionado.status === "concluido"
      ? await fetchProdutosDoJob(supabase, jobSelecionado.id)
      : [];

  const gruposDeJobs = agruparJobsPorCategoria(jobs);

  return (
    <div
      className={`${CLASSES_FONTES} min-h-screen w-full bg-[var(--background)]`}
      style={{ ...TEMA_ESCURO, fontFamily: "var(--font-body), ui-sans-serif, system-ui, sans-serif" }}
    >
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-6 sm:p-8">
        <header className="flex flex-col gap-1">
          <p className="font-[family-name:var(--font-data-mono)] text-[11px] font-medium tracking-[0.14em] text-[var(--accent)] uppercase">
            Capi Atacado · Benchmark de preços
          </p>
          <h1 className="text-balance font-[family-name:var(--font-display)] text-4xl leading-[1.02] font-bold tracking-tight text-[var(--ink)]">
            Benchmark de Preços
          </h1>
          <p className="max-w-[62ch] text-[15px] text-[var(--ink-muted)]">
            Cole o link de um produto ou de uma categoria inteira de um site concorrente. O sistema
            extrai nome, código, preço e especificações de cada produto pra você comparar com o seu
            catálogo.
          </p>
        </header>

        <ImportPanel categorias={categorias} />

        {jobSelecionado && (
          <div className="flex flex-col gap-4">
            <p className="truncate text-[12.5px] text-[var(--ink-muted)]" title={jobSelecionado.url_origem}>
              {jobSelecionado.site_origem ?? jobSelecionado.url_origem}
            </p>
            <JobProgress key={jobSelecionado.id} job={jobSelecionado} />

            {jobSelecionado.status === "concluido" && (
              <ProdutosTable produtos={produtos} jobTipo={jobSelecionado.tipo} jobCategoria={jobSelecionado.categoria} />
            )}
          </div>
        )}

        {jobs.length > 0 && (
          <div className="flex flex-col gap-4">
            <p className="font-[family-name:var(--font-data-mono)] text-[10.5px] font-medium tracking-[0.06em] text-[var(--ink-muted)] uppercase">
              Importações recentes
            </p>
            {gruposDeJobs.map((grupo) => (
              <div key={grupo.categoria ?? "__sem_categoria__"} className="flex flex-col gap-2">
                {gruposDeJobs.length > 1 && (
                  <p className="font-[family-name:var(--font-data-mono)] text-[10.5px] font-medium tracking-[0.08em] text-[var(--accent)] uppercase">
                    {grupo.categoria ?? "Sem categoria"}
                  </p>
                )}
                <ul className="flex flex-col gap-1.5">
                  {grupo.jobs.map((job) => (
                    <li
                      key={job.id}
                      className={`flex items-center gap-2 rounded-md border pr-2 text-[13px] ${
                        job.id === jobIdSelecionado
                          ? "border-[var(--accent)] bg-[var(--surface-alt)]"
                          : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-alt)]"
                      }`}
                    >
                      <a
                        href={`/benchmark?job=${job.id}`}
                        className="flex flex-1 items-center justify-between gap-3 py-2.5 pl-3.5"
                      >
                        <span className="truncate text-[var(--ink)]" title={job.url_origem}>
                          {job.site_origem ?? job.url_origem}
                        </span>
                        <span className="flex shrink-0 items-center gap-3 text-[var(--ink-muted)]">
                          {job.status === "concluido" && (
                            <span className="tabular-nums">{job.total_importado} produtos</span>
                          )}
                          <span
                            className={`font-[family-name:var(--font-data-mono)] text-[10.5px] tracking-[0.06em] uppercase ${
                              job.status === "erro"
                                ? "text-[var(--bad)]"
                                : job.status === "concluido"
                                  ? "text-[var(--good)]"
                                  : "text-[var(--accent)]"
                            }`}
                          >
                            {STATUS_LABEL[job.status]}
                          </span>
                        </span>
                      </a>
                      <DeleteJobButton jobId={job.id} selecionado={job.id === jobIdSelecionado} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
