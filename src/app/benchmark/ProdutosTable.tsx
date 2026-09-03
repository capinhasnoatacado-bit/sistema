"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { atualizarProdutoBenchmark, excluirProdutoBenchmark } from "./actions";

export type BenchmarkProdutoRow = {
  id: string;
  url_produto: string;
  nome: string | null;
  marca: string | null;
  codigo: string | null;
  preco: number | null;
  imagem_url: string | null;
  especificacoes: Record<string, string> | null;
};

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function formatEspecificacoes(spec: Record<string, string> | null): string {
  if (!spec) return "";
  return Object.entries(spec)
    .map(([label, value]) => `${label}: ${value}`)
    .join(" · ");
}

/** Mesmo formato "Rótulo: Valor" por linha usado no cadastro manual — pra editar sem precisar aprender outro formato. */
function especificacoesParaTexto(spec: Record<string, string> | null): string {
  if (!spec) return "";
  return Object.entries(spec)
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n");
}

/** Tabela de produtos importados, com edição inline por linha — corrige o que o scraping (ou o cadastro manual) trouxe errado. */
export function ProdutosTable({ produtos }: { produtos: BenchmarkProdutoRow[] }) {
  const [editandoId, setEditandoId] = useState<string | null>(null);

  return (
    <div className="max-h-[65vh] overflow-auto rounded-[10px] border border-[var(--border)] bg-[var(--surface)]">
      <table className="w-full min-w-[960px] border-collapse text-[13.5px]">
        <thead>
          <tr>
            <Th>Produto</Th>
            <Th>Código</Th>
            <Th>Marca</Th>
            <Th align="right">Preço</Th>
            <Th>Especificações</Th>
            <Th align="right"> </Th>
          </tr>
        </thead>
        <tbody>
          {produtos.map((produto) =>
            editandoId === produto.id ? (
              <LinhaEdicao key={produto.id} produto={produto} onCancelar={() => setEditandoId(null)} />
            ) : (
              <LinhaVisualizacao key={produto.id} produto={produto} onEditar={() => setEditandoId(produto.id)} />
            ),
          )}

          {produtos.length === 0 && (
            <tr>
              <td colSpan={6} className="p-10 text-center text-[var(--ink-muted)]">
                Nenhum produto foi importado nesse job.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function LinhaVisualizacao({ produto, onEditar }: { produto: BenchmarkProdutoRow; onEditar: () => void }) {
  const [excluindo, startTransition] = useTransition();
  const router = useRouter();

  function excluir() {
    if (!confirm(`Excluir "${produto.nome ?? "esse produto"}" da lista?`)) return;
    startTransition(async () => {
      await excluirProdutoBenchmark(produto.id);
      router.refresh();
    });
  }

  return (
    <tr className="border-b border-[var(--border)]/60 last:border-0 hover:bg-[var(--surface-alt)]">
      <Td>
        <a
          href={produto.url_produto}
          target="_blank"
          rel="noreferrer noopener"
          className="text-[var(--ink)] underline decoration-[var(--border)] underline-offset-2 hover:text-[var(--accent)]"
        >
          {produto.nome ?? "(sem nome)"}
        </a>
      </Td>
      <Td className="font-[family-name:var(--font-data-mono)] text-xs text-[var(--ink-muted)]">
        {produto.codigo ?? "—"}
      </Td>
      <Td>{produto.marca ?? "—"}</Td>
      <Td align="right" className="font-[family-name:var(--font-data-mono)]">
        {produto.preco !== null ? currency.format(produto.preco) : "—"}
      </Td>
      <Td className="max-w-[320px] truncate text-[var(--ink-muted)]" title={formatEspecificacoes(produto.especificacoes)}>
        {formatEspecificacoes(produto.especificacoes) || "—"}
      </Td>
      <Td align="right">
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={onEditar}
            aria-label="Editar produto"
            title="Editar produto"
            className="rounded-md p-1.5 text-[var(--ink-muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--accent)]"
          >
            ✏️
          </button>
          <button
            type="button"
            onClick={excluir}
            disabled={excluindo}
            aria-label="Excluir produto"
            title="Excluir produto"
            className="rounded-md p-1.5 text-[var(--ink-muted)] hover:bg-[var(--bad-bg)] hover:text-[var(--bad)] disabled:opacity-50"
          >
            🗑️
          </button>
        </div>
      </Td>
    </tr>
  );
}

const CAMPO_CLASS =
  "h-8 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 font-[family-name:var(--font-body)] text-[13px] text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]";

function LinhaEdicao({ produto, onCancelar }: { produto: BenchmarkProdutoRow; onCancelar: () => void }) {
  const [nome, setNome] = useState(produto.nome ?? "");
  const [codigo, setCodigo] = useState(produto.codigo ?? "");
  const [marca, setMarca] = useState(produto.marca ?? "");
  const [preco, setPreco] = useState(produto.preco !== null ? String(produto.preco).replace(".", ",") : "");
  const [especTexto, setEspecTexto] = useState(especificacoesParaTexto(produto.especificacoes));
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function salvar() {
    setErro(null);
    startTransition(async () => {
      try {
        await atualizarProdutoBenchmark({
          produtoId: produto.id,
          nome,
          codigo,
          marca,
          preco,
          especificacoesTexto: especTexto,
        });
        router.refresh();
        onCancelar(); // fecha o modo de edição — os dados novos vêm do refresh
      } catch (err) {
        setErro(err instanceof Error ? err.message : "Falha ao salvar.");
      }
    });
  }

  return (
    <tr className="border-b border-[var(--border)]/60 bg-[var(--surface-alt)] align-top last:border-0">
      <td className="px-3.5 py-2.5">
        <input value={nome} onChange={(e) => setNome(e.target.value)} className={CAMPO_CLASS} />
      </td>
      <td className="px-3.5 py-2.5">
        <input value={codigo} onChange={(e) => setCodigo(e.target.value)} className={CAMPO_CLASS} />
      </td>
      <td className="px-3.5 py-2.5">
        <input value={marca} onChange={(e) => setMarca(e.target.value)} className={CAMPO_CLASS} />
      </td>
      <td className="px-3.5 py-2.5">
        <input
          value={preco}
          onChange={(e) => setPreco(e.target.value)}
          placeholder="9,90"
          className={`${CAMPO_CLASS} text-right tabular-nums`}
        />
      </td>
      <td className="px-3.5 py-2.5">
        <textarea
          rows={2}
          value={especTexto}
          onChange={(e) => setEspecTexto(e.target.value)}
          placeholder={"Rótulo: Valor"}
          className={`${CAMPO_CLASS} h-auto resize-y py-1.5`}
        />
      </td>
      <td className="px-3.5 py-2.5">
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={salvar}
            disabled={pending}
            className="rounded-md bg-[var(--accent)] px-2 py-1 text-[11px] font-semibold whitespace-nowrap text-[var(--accent-ink)] disabled:opacity-60"
          >
            {pending ? "Salvando…" : "Salvar"}
          </button>
          <button
            type="button"
            onClick={onCancelar}
            disabled={pending}
            className="rounded-md border border-[var(--border)] px-2 py-1 text-[11px] whitespace-nowrap text-[var(--ink-muted)]"
          >
            Cancelar
          </button>
        </div>
        {erro && <p className="mt-1 max-w-[140px] text-[10.5px] text-[var(--bad)]">{erro}</p>}
      </td>
    </tr>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th
      className={`sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface-alt)] px-3.5 py-2.5 font-[family-name:var(--font-data-mono)] text-[10.5px] font-medium tracking-[0.06em] whitespace-nowrap text-[var(--ink-muted)] uppercase ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
  className,
  title,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
  title?: string;
}) {
  return (
    <td
      title={title}
      className={`px-3.5 py-2.5 text-[var(--ink)] ${align === "right" ? "text-right tabular-nums" : "text-left"} ${className ?? ""}`}
    >
      {children}
    </td>
  );
}
