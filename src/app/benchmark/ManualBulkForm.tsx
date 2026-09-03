"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cadastrarProdutosManualEmLote } from "./actions";
import { CampoCategoria, type CategoriaOpcao } from "./CampoCategoria";

const INPUT_CLASS =
  "h-9 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 font-[family-name:var(--font-body)] text-[13.5px] font-normal tracking-normal text-[var(--ink)] normal-case focus-visible:outline-2 focus-visible:outline-[var(--accent)]";

const EXEMPLO = `Cabo Cartelado Fast V8 (Desmontado) | | | 2,00
Cabo Reforçado C/ Metal Ios Pei-S14-2 | Pei-S14-2 | Peining | 3,18
Cabo De Dados Tpc 1M Pei-S13-2 | Pei-S13-2 | Peining | 3,80 | Conector=USB-C`;

/**
 * Cadastro manual em lote — pra quando não dá pra fazer scraping E o
 * concorrente tem uma listagem inteira (não só 1 produto). Uma linha por
 * produto, formato "Nome | Código | Marca | Preço | Especificações"
 * (só o nome é obrigatório; especificações é "Rótulo=Valor; Rótulo=Valor").
 */
export function ManualBulkForm({ categorias }: { categorias: CategoriaOpcao[] }) {
  const [urlOrigem, setUrlOrigem] = useState("");
  const [linhas, setLinhas] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function salvar() {
    setErro(null);
    startTransition(async () => {
      try {
        const resultado = await cadastrarProdutosManualEmLote({ urlOrigem, linhas, categoriaId });
        setUrlOrigem("");
        setLinhas("");
        setCategoriaId("");
        router.push(`/benchmark?job=${resultado.jobId}`);
      } catch (err) {
        setErro(err instanceof Error ? err.message : "Falha ao cadastrar os produtos.");
      }
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        salvar();
      }}
      className="flex flex-col gap-3 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-4"
    >
      <p className="text-[12px] text-[var(--ink-muted)]">
        Pra listagens inteiras que o scraping não consegue processar: cole os prints na conversa com o
        Claude, ele te devolve as linhas prontas nesse formato pra você colar aqui.
      </p>

      <div className="flex flex-wrap gap-3">
        <label className="flex flex-1 min-w-[280px] flex-col gap-1.5 font-[family-name:var(--font-data-mono)] text-[10.5px] font-medium tracking-[0.06em] text-[var(--ink-muted)] uppercase">
          Link da listagem (referência)
          <input
            type="url"
            required
            value={urlOrigem}
            onChange={(e) => setUrlOrigem(e.target.value)}
            placeholder="https://exemplo.com.br/categoria/cabos"
            className={INPUT_CLASS}
          />
        </label>

        <label className="flex w-[160px] flex-col gap-1.5 font-[family-name:var(--font-data-mono)] text-[10.5px] font-medium tracking-[0.06em] text-[var(--ink-muted)] uppercase">
          Categoria
          <CampoCategoria value={categoriaId} onChange={setCategoriaId} categorias={categorias} className={INPUT_CLASS} />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 font-[family-name:var(--font-data-mono)] text-[10.5px] font-medium tracking-[0.06em] text-[var(--ink-muted)] uppercase">
        Produtos — 1 por linha: {"Nome | Código | Marca | Preço | Especificações"}
        <textarea
          required
          rows={10}
          value={linhas}
          onChange={(e) => setLinhas(e.target.value)}
          placeholder={EXEMPLO}
          className={`${INPUT_CLASS} h-auto resize-y py-2 font-[family-name:var(--font-data-mono)] text-[12.5px] normal-case`}
        />
      </label>
      <p className="text-[11.5px] text-[var(--ink-muted)]">
        Só o nome é obrigatório — deixe os outros campos em branco entre as barras (ex:{" "}
        <code className="font-[family-name:var(--font-data-mono)]">Nome | | | 2,00</code>) quando não
        souber. Especificações: <code className="font-[family-name:var(--font-data-mono)]">Rótulo=Valor; Rótulo=Valor</code>.
      </p>

      <div>
        <button
          type="submit"
          disabled={pending}
          className="h-9 rounded-md bg-[var(--accent)] px-4 text-[13px] font-semibold text-[var(--accent-ink)] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          {pending ? "Cadastrando…" : "Cadastrar produtos"}
        </button>
      </div>

      {erro && (
        <p className="rounded-md border border-[var(--bad-border)] bg-[var(--bad-bg)] px-3 py-2 text-[13px] text-[var(--bad)]">
          {erro}
        </p>
      )}
    </form>
  );
}
