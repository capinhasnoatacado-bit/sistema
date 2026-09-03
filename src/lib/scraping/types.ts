/**
 * Produto extraído de uma página de concorrente. Os campos "fortes" (nome,
 * marca, código, preço, imagem) ficam soltos porque são os mais usados na
 * tela de benchmark — `codigo` em especial é o que permite cruzar com
 * `produtos.codigo` do catálogo próprio. Tudo o mais que a página expõe
 * como especificação (potência, comprimento, conectores, etc.) entra em
 * `especificacoes` — cada categoria de produto tem specs diferentes, então
 * esse campo é livre (mesmo padrão de `produtos.especificacoes`).
 */
export type ExtractedProduct = {
  url: string;
  nome: string | null;
  marca: string | null;
  codigo: string | null;
  preco: number | null;
  imagemUrl: string | null;
  especificacoes: Record<string, string>;
};
