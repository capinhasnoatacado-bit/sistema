"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { criarCategoria, atualizarCategoria, excluirCategoria, type BenchmarkCategoria } from "./actions";
import { CategoriaForm, type CategoriaFormValues } from "./CategoriaForm";

/** Lista as categorias existentes, com "Nova categoria" no topo e editar/excluir por item. */
export function CategoriasList({ categorias }: { categorias: BenchmarkCategoria[] }) {
  const [criando, setCriando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const router = useRouter();

  async function salvarNova(valores: CategoriaFormValues) {
    await criarCategoria(valores);
    setCriando(false);
    router.refresh();
  }

  async function salvarEdicao(categoriaId: string, valores: CategoriaFormValues) {
    await atualizarCategoria(categoriaId, valores);
    setEditandoId(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {criando ? (
        <CategoriaForm
          valoresIniciais={{ nome: "", campos: [""] }}
          onSalvar={salvarNova}
          onCancelar={() => setCriando(false)}
          textoBotaoSalvar="Criar categoria"
        />
      ) : (
        <button
          type="button"
          onClick={() => setCriando(true)}
          className="h-9 self-start rounded-md bg-[var(--accent)] px-4 text-[13px] font-semibold text-[var(--accent-ink)]"
        >
          + Nova categoria
        </button>
      )}

      <ul className="flex flex-col gap-2">
        {categorias.map((categoria) =>
          editandoId === categoria.id ? (
            <li key={categoria.id}>
              <CategoriaForm
                valoresIniciais={{ nome: categoria.nome, campos: categoria.campos }}
                onSalvar={(valores) => salvarEdicao(categoria.id, valores)}
                onCancelar={() => setEditandoId(null)}
                textoBotaoSalvar="Salvar"
              />
            </li>
          ) : (
            <CategoriaItem key={categoria.id} categoria={categoria} onEditar={() => setEditandoId(categoria.id)} />
          ),
        )}

        {categorias.length === 0 && (
          <p className="text-[13.5px] text-[var(--ink-muted)]">Nenhuma categoria cadastrada ainda.</p>
        )}
      </ul>
    </div>
  );
}

function CategoriaItem({ categoria, onEditar }: { categoria: BenchmarkCategoria; onEditar: () => void }) {
  const [excluindo, startTransition] = useTransition();
  const router = useRouter();

  function excluir() {
    if (!confirm(`Excluir a categoria "${categoria.nome}"? As importações que usam ela ficam sem categoria.`)) return;
    startTransition(async () => {
      await excluirCategoria(categoria.id);
      router.refresh();
    });
  }

  return (
    <li className="flex items-center justify-between gap-3 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[14px] font-medium text-[var(--ink)]">{categoria.nome}</span>
        <span className="truncate text-[12px] text-[var(--ink-muted)]">
          {categoria.campos.length > 0
            ? categoria.campos.join(" · ")
            : "Sem campos — usa a coluna genérica de especificações"}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onEditar}
          aria-label="Editar categoria"
          title="Editar categoria"
          className="rounded-md p-1.5 text-[var(--ink-muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--accent)]"
        >
          ✏️
        </button>
        <button
          type="button"
          onClick={excluir}
          disabled={excluindo}
          aria-label="Excluir categoria"
          title="Excluir categoria"
          className="rounded-md p-1.5 text-[var(--ink-muted)] hover:bg-[var(--bad-bg)] hover:text-[var(--bad)] disabled:opacity-50"
        >
          🗑️
        </button>
      </div>
    </li>
  );
}
