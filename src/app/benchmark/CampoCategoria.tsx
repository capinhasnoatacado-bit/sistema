"use client";

const DATALIST_ID = "benchmark-categorias-existentes";

/**
 * Combo "escolha ou digite" pra categoria — mesma ideia do `categoria` de
 * texto livre da tabela `produtos` real (sem lista fixa/enum): sugere as
 * categorias já usadas antes via `<datalist>`, mas aceita digitar uma nova.
 * Opcional — item sem categoria cai no grupo "Sem categoria" na listagem.
 */
export function CampoCategoria({
  value,
  onChange,
  categorias,
  className,
}: {
  value: string;
  onChange: (valor: string) => void;
  categorias: string[];
  className?: string;
}) {
  return (
    <>
      <input
        list={DATALIST_ID}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="cabo"
        className={className}
      />
      <datalist id={DATALIST_ID}>
        {categorias.map((categoria) => (
          <option key={categoria} value={categoria} />
        ))}
      </datalist>
    </>
  );
}
