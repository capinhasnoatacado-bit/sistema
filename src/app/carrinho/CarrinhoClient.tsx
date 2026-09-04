"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  atualizarQuantidade,
  limparCarrinho,
  removerDoCarrinho,
  useCarrinho,
  type ItemCarrinho,
} from "@/lib/cart";
import { TAG_FORNECEDOR, TAG_FORNECEDOR_PADRAO } from "@/lib/theme";
import { finalizarPedido } from "./actions";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function agruparPorFornecedor(itens: ItemCarrinho[]) {
  const grupos = new Map<string, ItemCarrinho[]>();
  for (const item of itens) {
    const lista = grupos.get(item.fornecedor) ?? [];
    lista.push(item);
    grupos.set(item.fornecedor, lista);
  }
  return [...grupos.entries()].sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));
}

export function CarrinhoClient() {
  const itens = useCarrinho();
  const grupos = agruparPorFornecedor(itens);
  const totalGeral = itens.reduce((soma, i) => soma + i.quantidade * i.precoUnitario, 0);

  const router = useRouter();
  const [finalizando, iniciarFinalizacao] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function limpar() {
    if (!confirm("Esvaziar o carrinho inteiro? Não dá pra desfazer.")) return;
    limparCarrinho();
    setErro(null);
  }

  function finalizar() {
    setErro(null);
    iniciarFinalizacao(async () => {
      try {
        const { pedidoId } = await finalizarPedido(itens);
        limparCarrinho();
        router.push(`/pedidos/${pedidoId}`);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao finalizar o pedido.");
      }
    });
  }

  if (itens.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-12 text-center">
        <p className="text-[var(--ink-muted)]">Seu carrinho está vazio.</p>
        <a
          href="/comparador"
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-[13px] font-semibold text-[var(--accent-ink)]"
        >
          Ir pro comparador
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {grupos.map(([fornecedor, itensDoFornecedor]) => {
        const subtotal = itensDoFornecedor.reduce((s, i) => s + i.quantidade * i.precoUnitario, 0);

        return (
          <section
            key={fornecedor}
            className="overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--surface)]"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-alt)] px-4 py-2.5">
              <span
                className={`inline-flex h-[22px] items-center rounded-full border px-2.5 text-[11.5px] font-semibold ${
                  TAG_FORNECEDOR[fornecedor] ?? TAG_FORNECEDOR_PADRAO
                }`}
              >
                {fornecedor}
              </span>
              <span className="font-[family-name:var(--font-data-mono)] text-[12.5px] text-[var(--ink-muted)]">
                Subtotal: <strong className="text-[var(--ink)]">{currency.format(subtotal)}</strong>
              </span>
            </div>

            <ul className="divide-y divide-[var(--border)]">
              {itensDoFornecedor.map((item) => {
                const abaixoDoMoq = item.moq !== null && item.quantidade < item.moq;

                return (
                  <li key={item.produtoId} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] text-[var(--ink)]">{item.nome}</p>
                      <p className="font-[family-name:var(--font-data-mono)] text-[11.5px] text-[var(--ink-muted)]">
                        {item.codigo ?? "—"} · {currency.format(item.precoUnitario)}/peça
                        {abaixoDoMoq && (
                          <span className="ml-2 text-[var(--accent)]">
                            abaixo do MOQ ({item.moq})
                          </span>
                        )}
                      </p>
                    </div>

                    <input
                      type="number"
                      min={1}
                      value={item.quantidade}
                      onChange={(e) =>
                        atualizarQuantidade(item.produtoId, Math.max(1, Number(e.target.value) || 1))
                      }
                      aria-label={`Quantidade de ${item.nome}`}
                      className="h-8 w-16 shrink-0 rounded-md border border-[var(--border)] bg-[var(--background)] px-1.5 text-right text-[13px] tabular-nums text-[var(--ink)]"
                    />

                    <span className="w-20 shrink-0 text-right font-[family-name:var(--font-data-mono)] text-[13px] tabular-nums text-[var(--ink)]">
                      {currency.format(item.quantidade * item.precoUnitario)}
                    </span>

                    <button
                      type="button"
                      onClick={() => removerDoCarrinho(item.produtoId)}
                      aria-label={`Remover ${item.nome}`}
                      className="shrink-0 text-[var(--ink-muted)] hover:text-[var(--accent)]"
                    >
                      ✕
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-4">
        <div>
          <p className="font-[family-name:var(--font-data-mono)] text-[10.5px] tracking-[0.08em] text-[var(--ink-muted)] uppercase">
            Total geral
          </p>
          <p className="font-[family-name:var(--font-display)] text-[28px] font-bold tabular-nums text-[var(--ink)]">
            {currency.format(totalGeral)}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {erro && <p className="text-[13px] text-red-400">{erro}</p>}
          <button
            type="button"
            onClick={limpar}
            className="flex h-10 items-center rounded-md border border-[var(--border)] px-4 text-[13px] font-medium text-[var(--ink-muted)] hover:text-[var(--ink)]"
          >
            Limpar carrinho
          </button>
          <a
            href="/comparador"
            className="flex h-10 items-center rounded-md border border-[var(--border)] px-4 text-[13px] font-medium text-[var(--ink-muted)] hover:text-[var(--ink)]"
          >
            Continuar comprando
          </a>
          <button
            type="button"
            onClick={finalizar}
            disabled={finalizando}
            className="h-10 rounded-md bg-[var(--accent)] px-5 text-[13.5px] font-semibold text-[var(--accent-ink)] disabled:opacity-60"
          >
            {finalizando ? "Finalizando..." : "Finalizar pedido"}
          </button>
        </div>
      </div>
    </div>
  );
}
