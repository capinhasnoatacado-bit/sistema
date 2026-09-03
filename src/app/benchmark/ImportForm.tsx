"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { iniciarBenchmark } from "./actions";

/** Campo de link + botão — cria o job e leva pra tela de progresso dele. */
export function ImportForm() {
  const [url, setUrl] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function importar() {
    setErro(null);
    startTransition(async () => {
      try {
        const { jobId } = await iniciarBenchmark(url);
        setUrl("");
        router.push(`/benchmark?job=${jobId}`);
      } catch (err) {
        setErro(err instanceof Error ? err.message : "Falha ao iniciar a importação.");
      }
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        importar();
      }}
      className="flex flex-col gap-3 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-4"
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-1 min-w-[280px] flex-col gap-1.5 font-[family-name:var(--font-data-mono)] text-[10.5px] font-medium tracking-[0.06em] text-[var(--ink-muted)] uppercase">
          Link do produto ou categoria do concorrente
          <input
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.exemplo.com.br/categoria/acessorios"
            className="h-9 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 font-[family-name:var(--font-body)] text-[13.5px] font-normal tracking-normal text-[var(--ink)] normal-case focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
          />
        </label>

        <button
          type="submit"
          disabled={pending}
          className="h-9 shrink-0 rounded-md bg-[var(--accent)] px-4 text-[13px] font-semibold text-[var(--accent-ink)] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          {pending ? "Importando…" : "Importar"}
        </button>
      </div>

      <p className="text-[12px] text-[var(--ink-muted)]">
        Cole o link de UM produto ou de uma categoria/listagem inteira — o sistema detecta sozinho e,
        se for categoria, segue a paginação buscando todos os produtos.
      </p>

      {erro && (
        <p className="rounded-md border border-[var(--bad-border)] bg-[var(--bad-bg)] px-3 py-2 text-[13px] text-[var(--bad)]">
          {erro}
        </p>
      )}
    </form>
  );
}
