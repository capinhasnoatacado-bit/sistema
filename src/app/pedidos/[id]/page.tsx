import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CLASSES_FONTES } from "@/lib/fonts";
import { TEMA_ESCURO, TAG_FORNECEDOR, TAG_FORNECEDOR_PADRAO } from "@/lib/theme";
import { CopyButton } from "./CopyButton";

export const dynamic = "force-dynamic";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dataHora = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

type ItemPedidoRow = {
  id: string;
  quantidade: number;
  preco_unitario_pedido: number;
  produtos: {
    codigo: string | null;
    nome: string;
    fornecedores: { nome: string } | null;
  } | null;
};

async function fetchPedido(id: string) {
  const supabase = await createClient();

  const { data: pedido, error: erroPedido } = await supabase
    .from("pedidos")
    .select("id, criado_em")
    .eq("id", id)
    .single();

  if (erroPedido || !pedido) return null;

  const { data: itens, error: erroItens } = await supabase
    .from("pedido_itens")
    .select("id, quantidade, preco_unitario_pedido, produtos(codigo, nome, fornecedores(nome))")
    .eq("pedido_id", id);

  if (erroItens) {
    throw new Error(`Falha ao buscar os itens do pedido: ${erroItens.message}`);
  }

  return { pedido, itens: (itens ?? []) as unknown as ItemPedidoRow[] };
}

function agruparPorFornecedor(itens: ItemPedidoRow[]) {
  const grupos = new Map<string, ItemPedidoRow[]>();
  for (const item of itens) {
    const fornecedor = item.produtos?.fornecedores?.nome ?? "Sem fornecedor";
    const lista = grupos.get(fornecedor) ?? [];
    lista.push(item);
    grupos.set(fornecedor, lista);
  }
  return [...grupos.entries()].sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));
}

function listaEmTexto(fornecedor: string, itens: ItemPedidoRow[], criadoEm: string) {
  const linhas = [
    `Pedido ${fornecedor} — ${dataHora.format(new Date(criadoEm))}`,
    "",
    ...itens.map((item) => {
      const qtd = item.quantidade;
      const preco = currency.format(item.preco_unitario_pedido);
      const subtotal = currency.format(item.quantidade * item.preco_unitario_pedido);
      return `${item.produtos?.codigo ?? "—"} · ${item.produtos?.nome ?? "—"} · ${qtd} un · ${preco}/un · ${subtotal}`;
    }),
    "",
    `Total ${fornecedor}: ${currency.format(
      itens.reduce((s, i) => s + i.quantidade * i.preco_unitario_pedido, 0),
    )}`,
  ];
  return linhas.join("\n");
}

export default async function PedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resultado = await fetchPedido(id);

  if (!resultado) notFound();

  const { pedido, itens } = resultado;
  const grupos = agruparPorFornecedor(itens);
  const totalGeral = itens.reduce((s, i) => s + i.quantidade * i.preco_unitario_pedido, 0);
  const totalPecas = itens.reduce((s, i) => s + i.quantidade, 0);

  return (
    <div
      className={`${CLASSES_FONTES} min-h-screen w-full bg-[var(--background)]`}
      style={{ ...TEMA_ESCURO, fontFamily: "var(--font-body), ui-sans-serif, system-ui, sans-serif" }}
    >
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6 sm:p-8">
        <header className="flex flex-col gap-1">
          <p className="font-[family-name:var(--font-data-mono)] text-[11px] font-medium tracking-[0.14em] text-[var(--accent)] uppercase">
            Capi Atacado · Reposição de estoque
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl leading-[1.02] font-bold tracking-tight text-[var(--ink)]">
            Pedido finalizado ✓
          </h1>
          <p className="text-[15px] text-[var(--ink-muted)]">
            {dataHora.format(new Date(pedido.criado_em))} · {totalPecas} peças ·{" "}
            {currency.format(totalGeral)} no total. Cada seção abaixo é o que pedir de cada
            fornecedor.
          </p>
        </header>

        <div className="flex flex-col gap-6">
          {grupos.map(([fornecedor, itensDoFornecedor]) => {
            const subtotal = itensDoFornecedor.reduce(
              (s, i) => s + i.quantidade * i.preco_unitario_pedido,
              0,
            );

            return (
              <section
                key={fornecedor}
                className="overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--surface)]"
              >
                <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface-alt)] px-4 py-2.5">
                  <span
                    className={`inline-flex h-[22px] items-center rounded-full border px-2.5 text-[11.5px] font-semibold ${
                      TAG_FORNECEDOR[fornecedor] ?? TAG_FORNECEDOR_PADRAO
                    }`}
                  >
                    {fornecedor}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="font-[family-name:var(--font-data-mono)] text-[12.5px] text-[var(--ink-muted)]">
                      Subtotal: <strong className="text-[var(--ink)]">{currency.format(subtotal)}</strong>
                    </span>
                    <CopyButton texto={listaEmTexto(fornecedor, itensDoFornecedor, pedido.criado_em)} />
                  </div>
                </div>

                <table className="w-full border-collapse text-[13.5px]">
                  <thead>
                    <tr className="text-left">
                      <th className="px-4 py-2 font-[family-name:var(--font-data-mono)] text-[10.5px] tracking-[0.06em] text-[var(--ink-muted)] uppercase">
                        Código
                      </th>
                      <th className="px-4 py-2 font-[family-name:var(--font-data-mono)] text-[10.5px] tracking-[0.06em] text-[var(--ink-muted)] uppercase">
                        Produto
                      </th>
                      <th className="px-4 py-2 text-right font-[family-name:var(--font-data-mono)] text-[10.5px] tracking-[0.06em] text-[var(--ink-muted)] uppercase">
                        Qtd
                      </th>
                      <th className="px-4 py-2 text-right font-[family-name:var(--font-data-mono)] text-[10.5px] tracking-[0.06em] text-[var(--ink-muted)] uppercase">
                        Preço/un
                      </th>
                      <th className="px-4 py-2 text-right font-[family-name:var(--font-data-mono)] text-[10.5px] tracking-[0.06em] text-[var(--ink-muted)] uppercase">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {itensDoFornecedor.map((item) => (
                      <tr key={item.id} className="border-t border-[var(--border)]">
                        <td className="px-4 py-2 font-[family-name:var(--font-data-mono)] text-xs text-[var(--ink-muted)]">
                          {item.produtos?.codigo ?? "—"}
                        </td>
                        <td className="px-4 py-2 text-[var(--ink)]">{item.produtos?.nome ?? "—"}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-[var(--ink)]">
                          {item.quantidade}
                        </td>
                        <td className="px-4 py-2 text-right font-[family-name:var(--font-data-mono)] tabular-nums text-[var(--ink)]">
                          {currency.format(item.preco_unitario_pedido)}
                        </td>
                        <td className="px-4 py-2 text-right font-[family-name:var(--font-data-mono)] tabular-nums text-[var(--ink)]">
                          {currency.format(item.quantidade * item.preco_unitario_pedido)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            );
          })}
        </div>

        <div className="flex items-center justify-between rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-4">
          <div>
            <p className="font-[family-name:var(--font-data-mono)] text-[10.5px] tracking-[0.08em] text-[var(--ink-muted)] uppercase">
              Total geral
            </p>
            <p className="font-[family-name:var(--font-display)] text-[28px] font-bold tabular-nums text-[var(--ink)]">
              {currency.format(totalGeral)}
            </p>
          </div>
          <a
            href="/comparador"
            className="flex h-10 items-center rounded-md bg-[var(--accent)] px-5 text-[13.5px] font-semibold text-[var(--accent-ink)]"
          >
            Voltar pro comparador
          </a>
        </div>
      </main>
    </div>
  );
}
