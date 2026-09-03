"use client";

import { useState } from "react";
import { ImportForm } from "./ImportForm";
import { ManualEntryForm } from "./ManualEntryForm";

const ABA_CLASS_ATIVA = "border-[var(--accent)] bg-[var(--surface-alt)] text-[var(--ink)]";
const ABA_CLASS_INATIVA = "border-[var(--border)] bg-[var(--surface)] text-[var(--ink-muted)] hover:text-[var(--ink)]";

/** Alterna entre importar por link (automático) e cadastrar manualmente (sites com login). */
export function ImportPanel() {
  const [aba, setAba] = useState<"link" | "manual">("link");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
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
      </div>

      {aba === "link" ? <ImportForm /> : <ManualEntryForm />}
    </div>
  );
}
