"use client";

import { useState } from "react";

export function CopyButton({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      // Clipboard pode falhar por permissão do navegador — sem drama,
      // o texto continua selecionável manualmente na tela.
    }
  }

  return (
    <button
      type="button"
      onClick={copiar}
      className={`h-8 rounded-md border px-3 text-[12px] font-semibold transition-colors ${
        copiado
          ? "border-[var(--good-border)] bg-[var(--good-bg)] text-[var(--good)]"
          : "border-[var(--border)] text-[var(--ink-muted)] hover:text-[var(--ink)]"
      }`}
    >
      {copiado ? "Copiado ✓" : "Copiar lista"}
    </button>
  );
}
