"use client";

import Link from "next/link";
import { useCarrinho } from "@/lib/cart";

/** Indicador do carrinho — total de peças (soma das quantidades), não
 * quantidade de linhas diferentes. Usado no topo de /comparador e /carrinho. */
export function CartBadge() {
  const itens = useCarrinho();
  const totalPecas = itens.reduce((soma, item) => soma + item.quantidade, 0);

  return (
    <Link
      href="/carrinho"
      className="flex h-9 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3.5 text-[13px] font-medium text-[var(--ink)] hover:border-[var(--accent)]"
    >
      🛒 Carrinho
      {totalPecas > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1.5 text-[11px] font-bold tabular-nums text-[var(--accent-ink)]">
          {totalPecas}
        </span>
      )}
    </Link>
  );
}
