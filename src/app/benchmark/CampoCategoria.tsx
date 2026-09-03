"use client";

export type CategoriaOpcao = { id: string; nome: string };

/**
 * Select obrigatório de categoria — categorias vêm de `/configuracoes`
 * (não dá mais pra digitar uma nova aqui: categoria virou entidade de
 * verdade, com os campos que definem as colunas da tabela). Sem nenhuma
 * categoria cadastrada ainda, mostra um aviso com link pra criar uma.
 */
export function CampoCategoria({
  value,
  onChange,
  categorias,
  className,
}: {
  value: string;
  onChange: (valor: string) => void;
  categorias: CategoriaOpcao[];
  className?: string;
}) {
  if (categorias.length === 0) {
    return (
      <p className="text-[12px] text-[var(--bad)]">
        Nenhuma categoria cadastrada —{" "}
        <a href="/configuracoes" className="underline decoration-[var(--bad-border)] underline-offset-2">
          crie uma em Configurações
        </a>
        .
      </p>
    );
  }

  return (
    <select required value={value} onChange={(e) => onChange(e.target.value)} className={className}>
      <option value="" disabled>
        Selecione…
      </option>
      {categorias.map((categoria) => (
        <option key={categoria.id} value={categoria.id}>
          {categoria.nome}
        </option>
      ))}
    </select>
  );
}
