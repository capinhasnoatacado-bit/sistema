"use client";

import { useState } from "react";
import { ImportForm } from "./ImportForm";
import { ManualEntryForm } from "./ManualEntryForm";
import { ManualBulkForm } from "./ManualBulkForm";

const ABA_CLASS_ATIVA = "border-[var(--accent)] bg-[var(--surface-alt)] text-[var(--ink)]";
const ABA_CLASS_INATIVA = "border-[var(--border)] bg-[var(--surface)] text-[var(--ink-muted)] hover:text-[var(--ink)]";

type Aba = "link" | "manual" | "lote";

const FORM_POR_ABA: Record<Aba, React.ComponentType> = {
  link: ImportForm,
  manual: ManualEntryForm,
  lote: ManualBulkForm,
};

/** Alterna entre importar por link (automático), cadastrar 1 produto manualmente (site com login) ou vários de uma vez (listagem sem scraping). */
export function ImportPanel() {
  const [aba, setAba] = useState<Aba>("link");
  const FormularioAtivo = FORM_POR_ABA[aba];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setAba("link")}
          className={`h-8 rounded-md border px-3 text-[12.5px] font-medium ${aba === "link" ? ABA_CLASS_ATIVA : ABA_CLASS_INATIVA}`}
        >
          Colar link
        </button>
        <button
          type="button"
          onClick={() => setAba("manual")}
          className={`h-8 rounded-md border px-3 text-[12.5px] font-medium ${aba === "manual" ? ABA_CLASS_ATIVA : ABA_CLASS_INATIVA}`}
        >
          Cadastro manual (site com login)
        </button>
        <button
          type="button"
          onClick={() => setAba("lote")}
          className={`h-8 rounded-md border px-3 text-[12.5px] font-medium ${aba === "lote" ? ABA_CLASS_ATIVA : ABA_CLASS_INATIVA}`}
        >
          Cadastro em lote (listagem sem scraping)
        </button>
      </div>

      <FormularioAtivo />
    </div>
  );
}
