"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { excluirBenchmarkJob } from "./actions";

/** Ícone de lixeira ao lado de cada item do histórico — exclui aquela importação (com confirmação, não dá pra desfazer). */
export function DeleteJobButton({ jobId, selecionado }: { jobId: string; selecionado: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function excluir() {
    if (!confirm("Excluir essa importação e os produtos dela? Não dá pra desfazer.")) return;

    startTransition(async () => {
      await excluirBenchmarkJob(jobId);
      // Se era o job aberto na tela, tira o `?job=` da URL — ele não existe mais.
      if (selecionado) router.push("/benchmark");
      else router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={excluir}
      disabled={pending}
      aria-label="Excluir importação"
      title="Excluir importação"
      className="shrink-0 rounded-md p-1.5 text-[var(--ink-muted)] hover:bg-[var(--bad-bg)] hover:text-[var(--bad)] disabled:opacity-50"
    >
      🗑️
    </button>
  );
}
