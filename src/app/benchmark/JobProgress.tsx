"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { avancarBenchmarkJob } from "./actions";
import type { BenchmarkJob } from "@/lib/scraping/job-runner";

const INTERVALO_MS = 1200;

/**
 * Acompanha o job enquanto ele roda: chama `avancarBenchmarkJob` a cada
 * INTERVALO_MS (o job-runner processa um passo por chamada — ver etapa 4)
 * até o status virar "concluido" ou "erro". Quando termina, pede um refresh
 * da página pra o Server Component buscar a tabela de produtos no banco —
 * o estado "de verdade" do job sempre vive lá, não aqui.
 *
 * O chamador precisa passar `key={job.id}` — assim, ao trocar de job (ex:
 * clicando noutro item do histórico), o React remonta o componente em vez
 * de reaproveitar a instância, e o estado inicial já nasce correto.
 */
export function JobProgress({ job: jobInicial }: { job: BenchmarkJob }) {
  const [job, setJob] = useState(jobInicial);
  const router = useRouter();
  const emAndamento = job.status === "pendente" || job.status === "processando";

  useEffect(() => {
    if (!emAndamento) return;
    let cancelado = false;

    const id = setInterval(async () => {
      try {
        const atualizado = await avancarBenchmarkJob(job.id);
        if (cancelado) return;
        setJob(atualizado);
        if (atualizado.status === "concluido" || atualizado.status === "erro") {
          router.refresh();
        }
      } catch {
        // Falha pontual de rede no polling — tenta de novo no próximo tick.
      }
    }, INTERVALO_MS);

    return () => {
      cancelado = true;
      clearInterval(id);
    };
  }, [job.id, emAndamento, router]);

  if (job.status === "erro") {
    return (
      <div className="rounded-[10px] border border-[var(--bad-border)] bg-[var(--bad-bg)] p-4 text-[13.5px] text-[var(--bad)]">
        <strong>Não deu pra importar esse link.</strong> {job.mensagem_erro ?? "Erro desconhecido."}
      </div>
    );
  }

  if (job.status === "concluido") {
    return (
      <div className="rounded-[10px] border border-[var(--good-border)] bg-[var(--good-bg)] p-4 text-[13.5px] text-[var(--good)]">
        ✅ Concluído — <strong className="tabular-nums">{job.total_importado}</strong> produto
        {job.total_importado === 1 ? "" : "s"} importado{job.total_importado === 1 ? "" : "s"} de{" "}
        <strong className="tabular-nums">{job.total_encontrado}</strong> encontrado
        {job.total_encontrado === 1 ? "" : "s"}
        {job.total_com_erro > 0 ? (
          <>
            {" "}
            ({job.total_com_erro} falha{job.total_com_erro === 1 ? "" : "s"} na extração).
          </>
        ) : (
          "."
        )}
      </div>
    );
  }

  // pendente ou processando
  const processados = job.total_importado + job.total_com_erro;
  const progresso = job.total_encontrado > 0 ? Math.round((processados / job.total_encontrado) * 100) : 0;

  return (
    <div className="flex flex-col gap-3 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13.5px] text-[var(--ink)]">
          {job.status === "pendente"
            ? "Analisando o link…"
            : `Importando produtos… ${processados}/${job.total_encontrado}`}
        </p>
        <span className="animate-pulse font-[family-name:var(--font-data-mono)] text-[11px] tracking-[0.08em] text-[var(--accent)] uppercase">
          {job.status === "pendente" ? "descobrindo" : "processando"}
        </span>
      </div>

      {job.status === "processando" && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-alt)]">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-[width]"
            style={{ width: `${progresso}%` }}
          />
        </div>
      )}
    </div>
  );
}
