"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { atualizarPrecosBenchmark } from "./actions";

// Mesmo tamanho de lote da importação original (job-runner.ts) — chamada
// pequena o bastante pra nunca estourar o tempo de uma requisição.
const TAMANHO_LOTE = 3;

/**
 * Rebusca o preço de todos os produtos do job (sem tocar em nome, código,
 * marca ou especificações — preserva o que foi corrigido na tabela) em
 * lotes pequenos, mostrando progresso ao lado do botão até terminar.
 */
export function AtualizarPrecosButton({ produtoIds }: { produtoIds: string[] }) {
  const [rodando, setRodando] = useState(false);
  const [processados, setProcessados] = useState(0);
  const [resumo, setResumo] = useState<{ atualizados: number; falharam: number } | null>(null);
  const router = useRouter();

  async function atualizar() {
    setRodando(true);
    setResumo(null);
    setProcessados(0);

    let atualizados = 0;
    let falharam = 0;

    for (let i = 0; i < produtoIds.length; i += TAMANHO_LOTE) {
      const lote = produtoIds.slice(i, i + TAMANHO_LOTE);
      try {
        const resultados = await atualizarPrecosBenchmark(lote);
        for (const resultado of resultados) {
          if (resultado.ok) atualizados += 1;
          else falharam += 1;
        }
      } catch {
        // Falha de rede na chamada inteira (não por produto) — conta o lote todo como falha e segue.
        falharam += lote.length;
      }
      setProcessados((atual) => atual + lote.length);
    }

    setRodando(false);
    setResumo({ atualizados, falharam });
    router.refresh();
  }

  if (produtoIds.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={atualizar}
        disabled={rodando}
        className="h-8 rounded-md border border-[var(--border)] px-3 text-[12.5px] font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] disabled:opacity-50"
      >
        {rodando ? `🔄 Atualizando preços… ${processados}/${produtoIds.length}` : "🔄 Atualizar preços"}
      </button>
      {resumo && !rodando && (
        <span className="text-[12px] text-[var(--ink-muted)]">
          {resumo.atualizados} atualizado{resumo.atualizados === 1 ? "" : "s"}
          {resumo.falharam > 0 && `, ${resumo.falharam} falha${resumo.falharam === 1 ? "" : "s"}`}
        </span>
      )}
    </div>
  );
}
