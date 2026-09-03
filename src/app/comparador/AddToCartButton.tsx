"use client";

import { useState } from "react";
import { adicionarAoCarrinho } from "@/lib/cart";

export function AddToCartButton({
  produtoId,
  codigo,
  nome,
  fornecedor,
  precoUnitario,
  moq,
}: {
  produtoId: string;
  codigo: string | null;
  nome: string;
  fornecedor: string;
  precoUnitario: number;
  moq: number | null;
}) {
  const [quantidade, setQuantidade] = useState(moq ?? 1);
  const [confirmado, setConfirmado] = useState(false);

  function adicionar() {
    if (quantidade <= 0) return;
    adicionarAoCarrinho({ produtoId, codigo, nome, fornecedor, precoUnitario, moq }, quantidade);
    setConfirmado(true);
    setTimeout(() => setConfirmado(false), 1200);
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <input
        type="number"
        min={1}
        value={quantidade}
        onChange={(e) => setQuantidade(Math.max(1, Number(e.target.value) || 1))}
        aria-label={`Quantidade de ${nome}`}
        className="h-8 w-16 rounded-md border border-[var(--border)] bg-[var(--background)] px-1.5 text-right text-[13px] tabular-nums text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
      />
      <button
        type="button"
        onClick={adicionar}
        className={`h-8 shrink-0 rounded-md px-2.5 text-[12px] font-semibold whitespace-nowrap transition-colors ${
          confirmado
            ? "bg-[var(--good)] text-[var(--accent-ink)]"
            : "bg-[var(--accent)] text-[var(--accent-ink)] hover:opacity-90"
        }`}
      >
        {confirmado ? "Adicionado ✓" : "+ Carrinho"}
      </button>
    </div>
  );
}
