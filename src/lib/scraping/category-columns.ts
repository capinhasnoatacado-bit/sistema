export type ColunaCategoria = {
  /** O nome do campo como cadastrado em `/configuracoes` (`benchmark_categorias.campos`) — usado como rótulo da coluna e como chave de busca exata. */
  chave: string;
  rotulo: string;
  /**
   * Pedaço de texto (já normalizado — ver `normalizarChave`) usado pra achar
   * essa coluna dentro de `especificacoes` mesmo quando o rótulo salvo não é
   * idêntico ao nome do campo. Necessário porque o scraping e o cadastro
   * manual salvam o rótulo como o site/usuário escreveu ("Cor do cabo" pra
   * um campo chamado "Cor"), não necessariamente igual ao nome do campo —
   * sem isso a coluna ficaria vazia pra qualquer rótulo que não bata 100%.
   */
  aliases: string[];
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

/**
 * Deriva o alias de busca a partir do nome do campo, ignorando qualquer
 * parte entre parênteses (ex: "Comprimento (m)" → alias "comprimento") —
 * sem isso um campo com unidade no nome nunca bateria com um rótulo
 * scrapeado mais simples ("Comprimento", sem "(m)"). `null` quando não
 * sobra nada útil pra comparar (nome só com símbolos/parênteses).
 */
function aliasDoRotulo(rotulo: string): string | null {
  const semParenteses = rotulo.replace(/\([^)]*\)/g, " ");
  const normalizado = normalizarChave(semParenteses);
  return normalizado || null;
}

/**
 * Monta as colunas de destaque a partir dos campos configurados pro usuário
 * em `/configuracoes` (`benchmark_categorias.campos`) — substitui a coluna
 * genérica "Especificações" por 1 coluna dedicada por campo. Categoria sem
 * campos cadastrados (array vazio) devolve `[]`; quem chamar trata isso como
 * "sem colunas dedicadas" e cai no fallback genérico.
 */
export function colunasDeCampos(campos: string[]): ColunaCategoria[] {
  return campos.map((rotulo) => {
    const alias = aliasDoRotulo(rotulo);
    return { chave: rotulo, rotulo, aliases: alias ? [alias] : [] };
  });
}

export type DivisaoEspecificacoes = {
  /** valor por coluna, na mesma ordem de `colunas` — `null` quando não achou nenhuma entrada correspondente. */
  porColuna: (string | null)[];
  /** entradas de `especificacoes` que não bateram com nenhuma coluna — preservadas à parte pra não perder dado ao editar (ver ProdutosTable). */
  resto: Record<string, string>;
};

/**
 * Pra cada coluna, acha o valor em `especificacoes`: primeiro tenta a chave
 * exata (rótulo salvo idêntico ao nome do campo), depois procura (por ordem
 * de coluna, sem repetir a mesma entrada em 2 colunas) uma entrada cujo
 * rótulo bata com o alias. O que sobra (não bateu com nenhuma coluna) volta
 * em `resto`, sem se perder.
 */
export function dividirEspecificacoes(
  especificacoes: Record<string, string> | null,
  colunas: ColunaCategoria[],
): DivisaoEspecificacoes {
  if (!especificacoes) return { porColuna: colunas.map(() => null), resto: {} };

  const usadas = new Set<string>();
  const entradas = Object.entries(especificacoes);

  const porColuna = colunas.map((coluna) => {
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

  const resto: Record<string, string> = {};
  for (const [label, value] of entradas) {
    if (!usadas.has(label)) resto[label] = value;
  }

  return { porColuna, resto };
}

/** Só os valores por coluna (pra exibição) — ver `dividirEspecificacoes` quando também precisar do que sobrou. */
export function valoresDasColunas(
  especificacoes: Record<string, string> | null,
  colunas: ColunaCategoria[],
): (string | null)[] {
  return dividirEspecificacoes(especificacoes, colunas).porColuna;
}
