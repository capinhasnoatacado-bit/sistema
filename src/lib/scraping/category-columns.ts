export type ColunaCategoria = {
  /** Mesma chave usada em `produtos.especificacoes` na tabela real (ver seed.sql) — testada primeiro, com prioridade sobre os aliases. */
  chave: string;
  rotulo: string;
  /**
   * Pedaços de texto (já normalizados — ver `normalizarChave`) usados pra
   * achar essa coluna dentro de `especificacoes` mesmo quando a chave não é
   * a canônica. Necessário porque o scraping e o cadastro manual salvam o
   * rótulo como o site/usuário escreveu ("Cor", "Comprimento do cabo"...),
   * não a chave da tabela real — sem isso a coluna ficaria sempre vazia
   * pra qualquer produto importado (só bateria pro que foi digitado exatamente igual).
   */
  aliases: string[];
};

/**
 * Colunas de destaque por categoria, lidas de dentro de `especificacoes`
 * (jsonb) — mesmos campos já usados na tabela real de produtos (ver
 * `supabase/migrations/20260902183013_create_fornecedores_produtos.sql` e
 * `supabase/seed.sql`), pra comparar concorrente x catálogo campo a campo.
 * Categoria sem entrada aqui cai no fallback: mostra a coluna genérica
 * "Especificações" (texto livre "Rótulo: Valor") — como já era antes dessa
 * categorização existir.
 */
export const COLUNAS_POR_CATEGORIA: Record<string, ColunaCategoria[]> = {
  cabo: [
    { chave: "cor", rotulo: "Cor", aliases: ["cor"] },
    { chave: "comprimento_m", rotulo: "Comprimento (m)", aliases: ["comprimento", "tamanho"] },
    { chave: "amperagem", rotulo: "Amperagem", aliases: ["amperagem", "amper", "corrente", "potencia"] },
    { chave: "conector_origem", rotulo: "Conector origem", aliases: ["conectororigem", "entrada"] },
    { chave: "conector_destino", rotulo: "Conector destino", aliases: ["conectordestino", "saida", "conector"] },
    { chave: "material", rotulo: "Material", aliases: ["material"] },
  ],
};

// Range de marcas diacríticas combinantes (Unicode U+0300–U+036F) — remove acento depois do normalize("NFD").
const MARCAS_DIACRITICAS = /[̀-ͯ]/g;

function normalizarChave(chave: string): string {
  return chave
    .normalize("NFD")
    .replace(MARCAS_DIACRITICAS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/** `null` quando a categoria não tem colunas dedicadas — quem chamar cai no fallback (coluna genérica). */
export function colunasParaCategoria(categoria: string | null): ColunaCategoria[] | null {
  if (!categoria) return null;
  return COLUNAS_POR_CATEGORIA[categoria.trim().toLowerCase()] ?? null;
}

/**
 * Pra cada coluna, acha o valor em `especificacoes`: primeiro tenta a chave
 * canônica exata, depois procura (por ordem de coluna, sem repetir a mesma
 * entrada em 2 colunas) uma entrada cujo rótulo bata com algum alias.
 * `null` quando nenhuma entrada corresponde a essa coluna.
 */
export function valoresDasColunas(
  especificacoes: Record<string, string> | null,
  colunas: ColunaCategoria[],
): (string | null)[] {
  if (!especificacoes) return colunas.map(() => null);

  const usadas = new Set<string>();
  const entradas = Object.entries(especificacoes);

  return colunas.map((coluna) => {
    if (!usadas.has(coluna.chave) && especificacoes[coluna.chave] !== undefined) {
      usadas.add(coluna.chave);
      return especificacoes[coluna.chave];
    }

    for (const alias of coluna.aliases) {
      const encontrada = entradas.find(([label]) => !usadas.has(label) && normalizarChave(label).includes(alias));
      if (encontrada) {
        usadas.add(encontrada[0]);
        return encontrada[1];
      }
    }

    return null;
  });
}
