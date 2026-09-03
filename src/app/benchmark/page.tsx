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

export default async function BenchmarkPage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const jobs = await fetchJobsRecentes(supabase);
  const jobIdSelecionado = params.job ?? jobs[0]?.id ?? null;
  const jobSelecionado = jobIdSelecionado ? (jobs.find((j) => j.id === jobIdSelecionado) ?? null) : null;

  const produtos =
    jobSelecionado && jobSelecionado.status === "concluido"
      ? await fetchProdutosDoJob(supabase, jobSelecionado.id)
      : [];

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

        <ImportPanel />

        {jobSelecionado && (
          <div className="flex flex-col gap-4">
            <p className="truncate text-[12.5px] text-[var(--ink-muted)]" title={jobSelecionado.url_origem}>
              {jobSelecionado.site_origem ?? jobSelecionado.url_origem}
            </p>
            <JobProgress key={jobSelecionado.id} job={jobSelecionado} />

            {jobSelecionado.status === "concluido" && (
              <ProdutosTable produtos={produtos} />
            )}
          </div>
        )}

        {jobs.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="font-[family-name:var(--font-data-mono)] text-[10.5px] font-medium tracking-[0.06em] text-[var(--ink-muted)] uppercase">
              Importações recentes
            </p>
            <ul className="flex flex-col gap-1.5">
              {jobs.map((job) => (
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
        )}
      </main>
    </div>
  );
}
