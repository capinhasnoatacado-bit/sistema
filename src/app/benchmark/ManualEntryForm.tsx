"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cadastrarProdutoManual } from "./actions";

const VAZIO = { urlProduto: "", nome: "", marca: "", codigo: "", preco: "", especificacoesTexto: "" };

const INPUT_CLASS =
  "h-9 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 font-[family-name:var(--font-body)] text-[13.5px] font-normal tracking-normal text-[var(--ink)] normal-case focus-visible:outline-2 focus-visible:outline-[var(--accent)]";

/**
 * Cadastro manual — pra quando o site exige login e o scraping automático
 * (ver job-runner.ts) não consegue entrar. O usuário lê o produto num
 * print mandado pro Claude na conversa e digita os dados aqui; o produto
 * entra na mesma tabela dos importados por link, num job tipo "manual".
 */
export function ManualEntryForm() {
  const [form, setForm] = useState(VAZIO);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function set<K extends keyof typeof form>(campo: K, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function salvar() {
    setErro(null);
    startTransition(async () => {
      try {
        const { jobId } = await cadastrarProdutoManual(form);
        setForm(VAZIO);
        router.push(`/benchmark?job=${jobId}`);
      } catch (err) {
        setErro(err instanceof Error ? err.message : "Falha ao cadastrar o produto.");
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
        Cole o print do produto na conversa com o Claude — ele te passa nome, código, marca, preço e
        especificações certos pra você preencher aqui.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Campo label="Link do produto (referência)" className="sm:col-span-2">
          <input
            type="url"
            required
            value={form.urlProduto}
            onChange={(e) => set("urlProduto", e.target.value)}
            placeholder="https://exemplo.com.br/produto-que-pede-login"
            className={INPUT_CLASS}
          />
        </Campo>

        <Campo label="Nome" className="sm:col-span-2">
          <input required value={form.nome} onChange={(e) => set("nome", e.target.value)} className={INPUT_CLASS} />
        </Campo>

        <Campo label="Marca">
          <input value={form.marca} onChange={(e) => set("marca", e.target.value)} className={INPUT_CLASS} />
        </Campo>

        <Campo label="Código">
          <input value={form.codigo} onChange={(e) => set("codigo", e.target.value)} className={INPUT_CLASS} />
        </Campo>

        <Campo label="Preço">
          <input
            value={form.preco}
            onChange={(e) => set("preco", e.target.value)}
            placeholder="9,90"
            className={INPUT_CLASS}
          />
        </Campo>
      </div>

      <Campo label='Especificações (uma por linha, "Rótulo: Valor")'>
        <textarea
          rows={3}
          value={form.especificacoesTexto}
          onChange={(e) => set("especificacoesTexto", e.target.value)}
          placeholder={"Potência máxima: 25W\nComprimento: 1 metro"}
          className={`${INPUT_CLASS} h-auto resize-y py-2 font-[family-name:var(--font-body)]`}
        />
      </Campo>

      <div>
        <button
          type="submit"
          disabled={pending}
          className="h-9 rounded-md bg-[var(--accent)] px-4 text-[13px] font-semibold text-[var(--accent-ink)] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          {pending ? "Salvando…" : "Cadastrar produto"}
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

function Campo({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label
      className={`flex flex-col gap-1.5 font-[family-name:var(--font-data-mono)] text-[10.5px] font-medium tracking-[0.06em] text-[var(--ink-muted)] uppercase ${className ?? ""}`}
    >
      {label}
      {children}
    </label>
  );
}
