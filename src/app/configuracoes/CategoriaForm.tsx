"use client";

import { useState, useTransition } from "react";

const INPUT_CLASS =
  "h-9 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 font-[family-name:var(--font-body)] text-[13.5px] font-normal tracking-normal text-[var(--ink)] normal-case focus-visible:outline-2 focus-visible:outline-[var(--accent)]";

export type CategoriaFormValues = { nome: string; campos: string[] };

/** Formulário de criar/editar categoria — nome + lista de campos que viram coluna dedicada na tabela de produtos importados. Reaproveitado nos 2 modos pelo `CategoriasList`. */
export function CategoriaForm({
  valoresIniciais,
  onSalvar,
  onCancelar,
  textoBotaoSalvar,
}: {
  valoresIniciais: CategoriaFormValues;
  onSalvar: (valores: CategoriaFormValues) => Promise<void>;
  onCancelar: () => void;
  textoBotaoSalvar: string;
}) {
  const [nome, setNome] = useState(valoresIniciais.nome);
  const [campos, setCampos] = useState<string[]>(valoresIniciais.campos.length > 0 ? valoresIniciais.campos : [""]);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function atualizarCampo(indice: number, valor: string) {
    setCampos((atual) => atual.map((campo, i) => (i === indice ? valor : campo)));
  }

  function adicionarCampo() {
    setCampos((atual) => [...atual, ""]);
  }

  function removerCampo(indice: number) {
    setCampos((atual) => atual.filter((_, i) => i !== indice));
  }

  function salvar() {
    setErro(null);
    startTransition(async () => {
      try {
        await onSalvar({ nome, campos });
      } catch (err) {
        setErro(err instanceof Error ? err.message : "Falha ao salvar.");
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
      <label className="flex flex-col gap-1.5 font-[family-name:var(--font-data-mono)] text-[10.5px] font-medium tracking-[0.06em] text-[var(--ink-muted)] uppercase">
        Nome da categoria
        <input
          required
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Cabo"
          className={INPUT_CLASS}
        />
      </label>

      <div className="flex flex-col gap-1.5">
        <p className="font-[family-name:var(--font-data-mono)] text-[10.5px] font-medium tracking-[0.06em] text-[var(--ink-muted)] uppercase">
          Campos (viram coluna na tabela de produtos)
        </p>
        <div className="flex flex-col gap-2">
          {campos.map((campo, indice) => (
            <div key={indice} className="flex items-center gap-2">
              <input
                value={campo}
                onChange={(e) => atualizarCampo(indice, e.target.value)}
                placeholder="Cor"
                className={INPUT_CLASS}
              />
              <button
                type="button"
                onClick={() => removerCampo(indice)}
                aria-label="Remover campo"
                title="Remover campo"
                className="shrink-0 rounded-md p-1.5 text-[var(--ink-muted)] hover:bg-[var(--bad-bg)] hover:text-[var(--bad)]"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={adicionarCampo}
          className="self-start rounded-md border border-[var(--border)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--ink-muted)] hover:text-[var(--ink)]"
        >
          + Adicionar campo
        </button>
        <p className="text-[11.5px] text-[var(--ink-muted)]">
          Sem nenhum campo, a tabela mostra a coluna genérica &ldquo;Especificações&rdquo; (como antes) pra essa categoria.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="h-9 rounded-md bg-[var(--accent)] px-4 text-[13px] font-semibold text-[var(--accent-ink)] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          {pending ? "Salvando…" : textoBotaoSalvar}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          disabled={pending}
          className="h-9 rounded-md border border-[var(--border)] px-4 text-[13px] font-medium text-[var(--ink-muted)] disabled:opacity-60"
        >
          Cancelar
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
