import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import { parsePtBrCurrency } from "./parse-price";
import type { ExtractedProduct } from "./types";

/**
 * Entre vários preços encontrados perto um do outro pro mesmo produto, o
 * maior costuma ser o parcelado e o segundo maior o à vista/pix — usado nas
 * 3 camadas de extração de preço (JSON-LD com múltiplas ofertas, texto perto
 * de "pix", DOM genérico). NÃO é o menor valor puro e simples: o valor da
 * PARCELA (ex: "12x de R$ 3,33") também aparece perto do preço total e é bem
 * menor que tudo, então "pegar o menor" acaba pegando a parcela por engano.
 * Com 0 ou 1 preço encontrado, devolve o que tiver (não tem "segundo" pra pegar).
 */
function segundoMaiorOuUnico(precos: number[]): number | null {
  if (precos.length === 0) return null;
  const ordenados = [...precos].sort((a, b) => b - a);
  return ordenados.length >= 2 ? ordenados[1] : ordenados[0];
}

/**
 * Extrai os dados de UM produto a partir do HTML da sua página, sem saber
 * nada sobre a plataforma de e-commerce que gerou a página. A estratégia é
 * em camadas, da fonte mais confiável para a mais arriscada — cada camada
 * só preenche o que a anterior deixou em branco:
 *
 *   1. JSON-LD (schema.org/Product) — dado estruturado que a própria loja
 *      publica para o Google. Quando existe, é a fonte mais confiável.
 *   2. Meta tags Open Graph (og:title, og:image, product:price:amount).
 *   3. Blocos de especificação identificáveis na página (tabela, <dl>,
 *      listas dentro de containers com nome tipo "especificacoes").
 *   4. Varredura genérica de texto em padrão "Rótulo: Valor" — último
 *      recurso, mais ruidoso, só usada se as camadas acima acharam pouco.
 *
 * `codigo` (pra cruzar com `produtos.codigo` do catálogo próprio) compara 3
 * candidatos — JSON-LD (model/mpn/sku, nessa ordem), um rótulo tipo
 * "Código"/"SKU"/"Modelo" nas especificações da página, e o último token do
 * nome do produto (comum em catálogo de atacado terminar em "<Marca>
 * <Código>") — e fica com o primeiro que NÃO for só dígitos: em várias
 * plataformas de e-commerce, um sku/model só numérico é o id interno de
 * estoque da loja (ex: "9098"), não o código real do produto (que quase
 * sempre tem letra, ex: "CB143"). Um valor só numérico só é usado se não
 * sobrar nenhum candidato melhor.
 *
 * Não há garantia de 100% de acerto em qualquer site — sites sem dado
 * estruturado e com HTML muito específico podem sair com campos em branco.
 */
export function extractProduct(html: string, url: string): ExtractedProduct {
  const $ = cheerio.load(html);

  const fromJsonLd = extractFromJsonLd($);
  const fromMeta = extractFromMeta($);

  // Prioridade nas especificações: JSON-LD > blocos de especificação >
  // varredura genérica (cada camada só preenche o que a anterior não achou).
  let especificacoes: Record<string, string> = {
    ...extractFromSpecContainers($),
    ...fromJsonLd.especificacoes,
  };
  if (Object.keys(especificacoes).length < 2) {
    especificacoes = { ...extractFromGenericLines($), ...especificacoes };
  }

  const nome = fromJsonLd.nome ?? fromMeta.nome ?? extractH1($);
  const marca = fromJsonLd.marca ?? fromMeta.marca ?? especificacoes["Marca"] ?? null;
  const codigo = melhorCodigo(
    fromJsonLd.codigo,
    findCodigoEmEspecificacoes(especificacoes),
    extractCodigoDoNome(nome),
  );
  // Preço do PIX tem prioridade quando a página menciona (costuma ser menor
  // que o preço parcelado que geralmente é o que vai pro JSON-LD/meta) — ver
  // extractPixPriceFromDom. Só cai pro resto quando a página não menciona pix.
  const precoPix = extractPixPriceFromDom($);
  const precoDom = extractPriceFromDom($);
  const preco = precoPix ?? fromJsonLd.preco ?? fromMeta.preco ?? precoDom;
  // DEBUG temporário — remover depois de descobrir de onde está saindo o
  // preço errado. Aparece no terminal onde roda `npm run dev`.
  console.log("[benchmark-debug]", {
    url,
    precoPix,
    precoJsonLd: fromJsonLd.preco,
    precoMeta: fromMeta.preco,
    precoDom,
    precoEscolhido: preco,
  });
  const imagemUrl = resolveUrl(fromJsonLd.imagemUrl ?? fromMeta.imagemUrl ?? extractImageFromDom($), url);

  return {
    url,
    nome: nome ?? null,
    marca: marca ?? null,
    codigo: codigo ?? null,
    preco: preco ?? null,
    imagemUrl,
    especificacoes,
  };
}

// Rótulos que costumam identificar o código/SKU do produto na própria
// página (fallback pra quando não há sku/mpn no JSON-LD).
const CODIGO_LABEL = /^c[oó]d(igo)?\.?$|^sku$|^refer[eê]ncia$|^modelo$/i;

function findCodigoEmEspecificacoes(especificacoes: Record<string, string>): string | null {
  for (const [label, value] of Object.entries(especificacoes)) {
    if (CODIGO_LABEL.test(label.trim())) return value;
  }
  return null;
}

const CODIGO_PURAMENTE_NUMERICO = /^\d+$/;

/**
 * Entre os candidatos a código, prefere o primeiro que não for só dígitos
 * (ver nota em `extractProduct`) — só usa um valor puramente numérico se
 * não sobrar nenhuma alternativa melhor.
 */
function melhorCodigo(...candidatos: Array<string | null>): string | null {
  const naoNumerico = candidatos.find((c) => c && !CODIGO_PURAMENTE_NUMERICO.test(c));
  if (naoNumerico) return naoNumerico;
  return candidatos.find((c) => c) ?? null;
}

// Token que parece mesmo um código de produto: mistura letra e número (e
// opcionalmente hífen), tamanho curto — evita pegar palavra solta tipo
// "Branco" ou "iPhone" (sem dígito) do fim do nome.
const CODIGO_LIKE_TOKEN = /^(?=[A-Za-z0-9-]{2,15}$)(?=.*[A-Za-z])(?=.*\d)[A-Za-z0-9-]+$/;

/**
 * Último recurso pra achar o código: em catálogo de atacado é comum o nome
 * do produto terminar em "<descrição> <Marca> <Código>" (ex: "Cabo Turbo
 * ... Hrebos CB-320i"). Só usa o último "token" do nome se ele parecer
 * mesmo um código — não é garantido em qualquer site, mas como é o último
 * candidato tentado (depois de JSON-LD e das especificações da página),
 * só entra em jogo quando não sobrou nada melhor.
 */
function extractCodigoDoNome(nome: string | null): string | null {
  if (!nome) return null;
  const tokens = nome.trim().split(/\s+/);
  const ultimo = tokens[tokens.length - 1]?.replace(/[.,;:]+$/, "");
  return ultimo && CODIGO_LIKE_TOKEN.test(ultimo) ? ultimo : null;
}

// ---------------------------------------------------------------------------
// Camada 1: JSON-LD (schema.org/Product)
// ---------------------------------------------------------------------------

type JsonLdResult = {
  nome: string | null;
  marca: string | null;
  codigo: string | null;
  preco: number | null;
  imagemUrl: string | null;
  especificacoes: Record<string, string>;
};

function extractFromJsonLd($: CheerioAPI): JsonLdResult {
  const result: JsonLdResult = {
    nome: null,
    marca: null,
    codigo: null,
    preco: null,
    imagemUrl: null,
    especificacoes: {},
  };

  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    if (!raw?.trim()) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return; // bloco de JSON-LD malformado — ignora e segue tentando os outros
    }

    const product = findProductNode(parsed);
    if (!product) return;

    result.nome ??= firstString(product.name);
    result.marca ??= firstString(product.brand);
    result.imagemUrl ??= firstString(product.image);
    result.preco ??= extractOfferPrice(product.offers);
    // Prioridade: "model" (schema.org: o modelo mostrado pro cliente,
    // costuma bater com o que a loja exibe na tela) > "mpn" (código do
    // fabricante) > "sku" por último — em várias plataformas de e-commerce
    // (ex: Tray) o "sku" é um id interno de estoque da própria loja, sem
    // relação com o código impresso no produto/mostrado na página.
    result.codigo ??= firstString(product.model ?? product.mpn ?? product.sku);
    Object.assign(result.especificacoes, extractAdditionalProperties(product));
  });

  return result;
}

function isProductType(type: unknown): boolean {
  return matchesAnyType(type, ["product"]);
}

// Páginas de categoria/busca costumam publicar um "ItemList"/"CollectionPage"
// onde CADA item da lista carrega sua própria ficha "Product" lá dentro —
// prática comum e até recomendada pelo Google. Sem essa checagem, procurar
// por "Product" recursivamente acha o primeiro produto da lista e conclui
// (errado) que a página inteira é sobre 1 produto só.
function isListingType(type: unknown): boolean {
  return matchesAnyType(type, ["itemlist", "collectionpage", "searchresultspage", "offercatalog"]);
}

function matchesAnyType(type: unknown, tipos: string[]): boolean {
  if (typeof type === "string") return tipos.includes(type.toLowerCase());
  if (Array.isArray(type)) return type.some((t) => typeof t === "string" && tipos.includes(t.toLowerCase()));
  return false;
}

/** Procura recursivamente (JSON-LD costuma vir dentro de "@graph" ou arrays) o primeiro nó cujo `@type` bate com `ehDoTipo`. */
function findNodeOfType(
  node: unknown,
  ehDoTipo: (type: unknown) => boolean,
  depth = 0,
): Record<string, unknown> | null {
  if (depth > 6 || node === null || typeof node !== "object") return null;

  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findNodeOfType(item, ehDoTipo, depth + 1);
      if (found) return found;
    }
    return null;
  }

  const obj = node as Record<string, unknown>;
  if (ehDoTipo(obj["@type"])) return obj;

  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") {
      const found = findNodeOfType(value, ehDoTipo, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function findProductNode(node: unknown): Record<string, unknown> | null {
  return findNodeOfType(node, isProductType);
}

/** JSON-LD representa texto de formas variadas: string solta, array, ou objeto com `name`/`url`. */
function firstString(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const str = firstString(item);
      if (str) return str;
    }
    return null;
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.name === "string") return obj.name.trim() || null;
    if (typeof obj.url === "string") return obj.url.trim() || null;
  }
  return null;
}

/**
 * Quando a página publica mais de uma oferta pro mesmo produto (ex: preço
 * parcelado e preço à vista/pix como ofertas separadas), fica com o segundo
 * maior (ver segundoMaiorOuUnico) — o maior costuma ser o parcelado.
 */
function extractOfferPrice(offers: unknown): number | null {
  if (!offers) return null;
  const offerList = Array.isArray(offers) ? offers : [offers];
  const precos: number[] = [];

  for (const offer of offerList) {
    if (offer && typeof offer === "object") {
      const o = offer as Record<string, unknown>;
      const price = parsePtBrCurrency((o.price ?? o.lowPrice) as string | number | null | undefined);
      if (price !== null) precos.push(price);
    }
  }

  return segundoMaiorOuUnico(precos);
}

function extractAdditionalProperties(node: Record<string, unknown>): Record<string, string> {
  const raw = node.additionalProperty;
  if (!raw) return {};
  const list = Array.isArray(raw) ? raw : [raw];
  const especificacoes: Record<string, string> = {};
  for (const item of list) {
    if (item && typeof item === "object") {
      const prop = item as Record<string, unknown>;
      const name = typeof prop.name === "string" ? prop.name.trim() : null;
      const value = firstString(prop.value);
      if (name && value) especificacoes[name] = value;
    }
  }
  return especificacoes;
}

/**
 * Diz se a página declara JSON-LD de schema.org/Product — usado para
 * distinguir "página de 1 produto" de "página de listagem/categoria" antes
 * de decidir se vale a pena procurar links de produto nela.
 */
export function pageDeclaresProductSchema(html: string): boolean {
  const $ = cheerio.load(html);
  let ehProduto = false;
  let ehListagem = false;

  $('script[type="application/ld+json"]').each((_, el) => {
    if (ehListagem) return; // já decidido que é listagem — nem vale a pena olhar os outros blocos
    const raw = $(el).contents().text();
    if (!raw?.trim()) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return; // bloco de JSON-LD malformado — ignora e segue tentando os outros
    }

    // "ItemList"/"CollectionPage" tem prioridade: mesmo que haja um
    // "Product" aninhado dentro dela (1 por item da lista), a página em si
    // é uma listagem, não a página de um produto só.
    if (findNodeOfType(parsed, isListingType)) {
      ehListagem = true;
      return;
    }
    if (findProductNode(parsed)) ehProduto = true;
  });

  return !ehListagem && ehProduto;
}

// ---------------------------------------------------------------------------
// Camada 2: meta tags Open Graph / product:*
// ---------------------------------------------------------------------------

function extractFromMeta($: CheerioAPI): { nome: string | null; marca: string | null; preco: number | null; imagemUrl: string | null } {
  const getMeta = (name: string): string | null => {
    const content = $(`meta[property="${name}"]`).attr("content") ?? $(`meta[name="${name}"]`).attr("content");
    return content?.trim() || null;
  };

  return {
    nome: getMeta("og:title"),
    imagemUrl: getMeta("og:image"),
    marca: getMeta("product:brand") ?? getMeta("og:brand"),
    preco: parsePtBrCurrency(getMeta("product:price:amount") ?? getMeta("og:price:amount")),
  };
}

// ---------------------------------------------------------------------------
// Camadas 3 e 4: blocos de especificação e varredura genérica "Rótulo: Valor"
// ---------------------------------------------------------------------------

const SPEC_CONTAINER_SELECTOR = [
  '[class*="especific" i]',
  '[id*="especific" i]',
  '[class*="ficha-tecnica" i]',
  '[class*="ficha_tecnica" i]',
  '[class*="detalhe" i]',
  '[class*="atributo" i]',
  '[class*="spec" i]',
  '[class*="caracteristic" i]',
].join(", ");

// "Marca: A'Gold" — rótulo curto começando com maiúscula, seguido de ":" e um valor curto.
const LABEL_VALUE_LINE = /^([A-ZÀ-Ÿ][\wÀ-ÿ'´` ]{1,40}?)\s*:\s*(.{1,120})$/u;

function extractFromSpecContainers($: CheerioAPI): Record<string, string> {
  const especificacoes: Record<string, string> = {};

  $(SPEC_CONTAINER_SELECTOR).each((_, container) => {
    const $container = $(container);

    $container.find("tr").each((_, tr) => {
      const cells = $(tr).find("th, td");
      if (cells.length < 2) return;
      const label = $(cells[0]).text().trim().replace(/:$/, "");
      const value = $(cells[1]).text().trim();
      if (label && value) especificacoes[label] ??= value;
    });

    $container.find("dt").each((_, dt) => {
      const label = $(dt).text().trim().replace(/:$/, "");
      const value = $(dt).next("dd").text().trim();
      if (label && value) especificacoes[label] ??= value;
    });

    $container.find("li, p").each((_, el) => {
      const match = $(el).text().trim().match(LABEL_VALUE_LINE);
      if (!match) return;
      const label = match[1].trim();
      const value = match[2].trim();
      if (label && value) especificacoes[label] ??= value;
    });
  });

  return especificacoes;
}

/** Último recurso: varre a página inteira à procura de linhas "Rótulo: Valor". Mais ruidoso. */
function extractFromGenericLines($: CheerioAPI): Record<string, string> {
  const especificacoes: Record<string, string> = {};

  $("li, p, tr, dt").each((_, el) => {
    let label = "";
    let value = "";
    const $el = $(el);

    if (el.tagName === "tr") {
      const cells = $el.find("th, td");
      if (cells.length < 2) return;
      label = $(cells[0]).text().trim().replace(/:$/, "");
      value = $(cells[1]).text().trim();
    } else if (el.tagName === "dt") {
      label = $el.text().trim().replace(/:$/, "");
      value = $el.next("dd").text().trim();
    } else {
      const match = $el.text().trim().match(LABEL_VALUE_LINE);
      if (!match) return;
      label = match[1].trim();
      value = match[2].trim();
    }

    if (label && value && value.length <= 120) especificacoes[label] ??= value;
  });

  return especificacoes;
}

// ---------------------------------------------------------------------------
// Fallbacks pontuais de DOM (nome, preço e imagem quando nada estruturado existe)
// ---------------------------------------------------------------------------

function extractH1($: CheerioAPI): string | null {
  return $("h1").first().text().trim() || null;
}

const PRICE_SELECTOR = ['[itemprop="price"]', '[class*="price" i]', '[class*="preco" i]', "[data-price]"].join(", ");

/**
 * Entre os elementos com cara de preço na página, fica com o segundo maior
 * (ver segundoMaiorOuUnico) — sites costumam mostrar o preço parcelado
 * (maior) em destaque e o à vista/pix logo depois, com a mesma classe
 * "price"/"preco".
 */
function extractPriceFromDom($: CheerioAPI): number | null {
  const precos: number[] = [];
  for (const el of $(PRICE_SELECTOR).toArray()) {
    const $el = $(el);
    const raw = $el.attr("content") ?? $el.attr("data-price") ?? $el.text();
    const price = parsePtBrCurrency(raw);
    if (price !== null && price > 0) precos.push(price);
  }
  return segundoMaiorOuUnico(precos);
}

const PADRAO_PRECO_BRUTO = /R\$\s?[\d.,]+/g;

/**
 * Acha, em templates tipo Shopify/Liquid, o preço do pix perto da palavra
 * "pix" — em vez de olhar uma janela de caracteres sobre o texto todo da
 * página já achatado (frágil: a indentação/whitespace real do HTML varia
 * muito de site pra site), usa a própria estrutura do DOM: acha o MENOR
 * elemento (por tamanho de texto) que contém tanto "pix" quanto um preço
 * "R$ X,XX" — isso isola o bloco daquele produto específico (ex.:
 * "em 12x de R$ 0,54 ... ou R$ 4,75 via pix"), sem pegar preço de outro
 * produto/seção da página. Dentro desse elemento, fica com o MAIOR preço
 * encontrado — nesse bloco isolado os únicos valores que aparecem junto do
 * "pix" são o da parcela (sempre o menor, ex. R$ 0,54) e o do pix em si
 * (sempre maior que uma parcela isolada, ex. R$ 4,75); o preço parcelado
 * cheio (R$ 5,00) fica de fora porque normalmente está num elemento irmão
 * separado, que não teria a palavra "pix" junto — por isso não entra nessa
 * busca. `null` quando a página não menciona pix — nesse caso quem chama
 * cai pro resto da cadeia normal (JSON-LD, meta, DOM genérico).
 */
function extractPixPriceFromDom($: CheerioAPI): number | null {
  let melhorTexto: string | null = null;

  $("*").each((_, el) => {
    if (el.type !== "tag" || el.tagName === "script" || el.tagName === "style") return;

    const texto = $(el).text();
    if (!/pix/i.test(texto) || !PADRAO_PRECO_BRUTO.test(texto)) return;
    PADRAO_PRECO_BRUTO.lastIndex = 0;

    if (melhorTexto === null || texto.length < melhorTexto.length) {
      melhorTexto = texto;
    }
  });

  if (melhorTexto === null) return null;
  const texto: string = melhorTexto;

  const precosNoTrecho = texto.match(PADRAO_PRECO_BRUTO);
  if (!precosNoTrecho) return null;

  let melhorPreco: number | null = null;
  for (const bruto of precosNoTrecho) {
    const preco = parsePtBrCurrency(bruto);
    if (preco !== null && preco > 0 && (melhorPreco === null || preco > melhorPreco)) {
      melhorPreco = preco;
    }
  }

  return melhorPreco;
}

function extractImageFromDom($: CheerioAPI): string | null {
  const structured = $('[itemprop="image"]').first();
  const src = structured.attr("src") ?? structured.attr("content");
  if (src) return src;

  return $("img[src]").first().attr("src") ?? null;
}

function resolveUrl(value: string | null | undefined, base: string): string | null {
  if (!value) return null;
  try {
    return new URL(value, base).toString();
  } catch {
    return null;
  }
}
