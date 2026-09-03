/**
 * Produto extraído de uma página de concorrente. Os campos "fortes" (nome,
 * marca, preço, imagem) ficam soltos porque são os mais usados na tela de
 * benchmark; tudo o mais que a página expõe como especificação (potência,
 * comprimento, conectores, modelo, etc.) entra em `atributos` — cada
 * categoria de produto tem specs diferentes, então esse campo é livre.
 */
export type ExtractedProduct = {
  url: string;
  nome: string | null;
  marca: string | null;
  preco: number | null;
  imagemUrl: string | null;
  atributos: Record<string, string>;
};
