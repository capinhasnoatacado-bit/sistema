"use server";

import { createClient } from "@/lib/supabase/server";
import { criarBenchmarkJob, processarProximoLote, type BenchmarkJob } from "@/lib/scraping/job-runner";

// Nota pra quando a tela (`page.tsx`) for criada: como o processamento roda
// em lotes (ver job-runner.ts), cada chamada aqui é curta — mas se algum
// lote demorar mais que o limite padrão de função serverless da Vercel,
// declare `export const maxDuration = ...` na própria page.tsx que chama
// essas actions (Server Actions herdam o maxDuration da rota que as invoca).

/** Cria o job pro link colado pelo usuário e devolve o id pra tela começar a fazer polling. */
export async function iniciarBenchmark(urlOrigem: string): Promise<{ jobId: string }> {
  const url = urlOrigem.trim();
  if (!url) {
    throw new Error("Cole o link de um produto ou categoria.");
  }
  try {
    new URL(url);
  } catch {
    throw new Error("Esse link não parece válido.");
  }

  const supabase = await createClient();
  const job = await criarBenchmarkJob(supabase, url);
  return { jobId: job.id };
}

/** Avança o job em um passo (descoberta ou um lote de extração) — a tela chama isso repetidamente até o job terminar. */
export async function avancarBenchmarkJob(jobId: string): Promise<BenchmarkJob> {
  const supabase = await createClient();
  return processarProximoLote(supabase, jobId);
}

/** Exclui o job e, por cascade (FK em benchmark_produtos), os produtos importados nele junto. */
export async function excluirBenchmarkJob(jobId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("benchmark_jobs").delete().eq("id", jobId);
  if (error) {
    throw new Error(`Falha ao excluir a importação: ${error.message}`);
  }
}
