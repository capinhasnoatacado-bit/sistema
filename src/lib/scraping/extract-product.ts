import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import { parsePtBrCurrency } from "./parse-price";
import type { ExtractedProduct } from "./types";

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
 * Não há garantia de 100% de acerto em qualquer site — sites sem dado
 * estruturado e com HTML muito específico podem sair com campos em branco.
 */
export function extractProduct(html: string, url: string): ExtractedProduct {
  const $ = cheerio.load(html);

  const fromJsonLd = extractFromJsonLd($);
  const fromMeta = extractFromMeta($);

  // Prioridade nos atributos: JSON-LD > blocos de especificação > varredura
  // genérica (cada camada só preenche o que a anterior não achou).
  let atributos: Record<string, string> = {
    ...extractFromSpecContainers($),
    ...fromJsonLd.atributos,
  };
  if (Object.keys(atributos).length < 2) {
    atributos = { ...extractFromGenericLines($), ...atributos };
  }

  const nome = fromJsonLd.nome ?? fromMeta.nome ?? extractH1($);
  const marca = fromJsonLd.marca ?? fromMeta.marca ?? atributos["Marca"] ?? null;
  const preco = fromJsonLd.preco ?? fromMeta.preco ?? extractPriceFromDom($);
  const imagemUrl = resolveUrl(fromJsonLd.imagemUrl ?? fromMeta.imagemUrl ?? extractImageFromDom($), url);

  return {
    url,
    nome: nome ?? null,
    marca: marca ?? null,
    preco: preco ?? null,
    imagemUrl,
    atributos,
  };
}

// ---------------------------------------------------------------------------
// Camada 1: JSON-LD (schema.org/Product)
// ---------------------------------------------------------------------------

type JsonLdResult = {
  nome: string | null;
  marca: string | null;
  preco: number | null;
  imagemUrl: string | null;
  atributos: Record<string, string>;
};

function extractFromJsonLd($: CheerioAPI): JsonLdResult {
  const result: JsonLdResult = { nome: null, marca: null, preco: null, imagemUrl: null, atributos: {} };

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

    const sku = firstString(product.sku ?? product.mpn);
    if (sku) result.atributos["Modelo"] ??= sku;
    Object.assign(result.atributos, extractAdditionalProperties(product));
  });

  return result;
}

function isProductType(type: unknown): boolean {
  if (typeof type === "string") return type.toLowerCase() === "product";
  if (Array.isArray(type)) return type.some((t) => typeof t === "string" && t.toLowerCase() === "product");
  return false;
}

/** Procura recursivamente (JSON-LD costuma vir dentro de "@graph" ou arrays) um nó `{"@type": "Product"}`. */
function findProductNode(node: unknown, depth = 0): Record<string, unknown> | null {
  if (depth > 6 || node === null || typeof node !== "object") return null;

  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findProductNode(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  const obj = node as Record<string, unknown>;
  if (isProductType(obj["@type"])) return obj;

  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") {
      const found = findProductNode(value, depth + 1);
      if (found) return found;
    }
  }
  return null;
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

function extractOfferPrice(offers: unknown): number | null {
  if (!offers) return null;
  const offerList = Array.isArray(offers) ? offers : [offers];
  for (const offer of offerList) {
    if (offer && typeof offer === "object") {
      const o = offer as Record<string, unknown>;
      const price = parsePtBrCurrency((o.price ?? o.lowPrice) as string | number | null | undefined);
      if (price !== null) return price;
    }
  }
  return null;
}

function extractAdditionalProperties(node: Record<string, unknown>): Record<string, string> {
  const raw = node.additionalProperty;
  if (!raw) return {};
  const list = Array.isArray(raw) ? raw : [raw];
  const atributos: Record<string, string> = {};
  for (const item of list) {
    if (item && typeof item === "object") {
      const prop = item as Record<string, unknown>;
      const name = typeof prop.name === "string" ? prop.name.trim() : null;
      const value = firstString(prop.value);
      if (name && value) atributos[name] = value;
    }
  }
  return atributos;
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
  const atributos: Record<string, string> = {};

  $(SPEC_CONTAINER_SELECTOR).each((_, container) => {
    const $container = $(container);

    $container.find("tr").each((_, tr) => {
      const cells = $(tr).find("th, td");
      if (cells.length < 2) return;
      const label = $(cells[0]).text().trim().replace(/:$/, "");
      const value = $(cells[1]).text().trim();
      if (label && value) atributos[label] ??= value;
    });

    $container.find("dt").each((_, dt) => {
      const label = $(dt).text().trim().replace(/:$/, "");
      const value = $(dt).next("dd").text().trim();
      if (label && value) atributos[label] ??= value;
    });

    $container.find("li, p").each((_, el) => {
      const match = $(el).text().trim().match(LABEL_VALUE_LINE);
      if (!match) return;
      const label = match[1].trim();
      const value = match[2].trim();
      if (label && value) atributos[label] ??= value;
    });
  });

  return atributos;
}

/** Último recurso: varre a página inteira à procura de linhas "Rótulo: Valor". Mais ruidoso. */
function extractFromGenericLines($: CheerioAPI): Record<string, string> {
  const atributos: Record<string, string> = {};

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

    if (label && value && value.length <= 120) atributos[label] ??= value;
  });

  return atributos;
}

// ---------------------------------------------------------------------------
// Fallbacks pontuais de DOM (nome, preço e imagem quando nada estruturado existe)
// ---------------------------------------------------------------------------

function extractH1($: CheerioAPI): string | null {
  return $("h1").first().text().trim() || null;
}

const PRICE_SELECTOR = ['[itemprop="price"]', '[class*="price" i]', '[class*="preco" i]', "[data-price]"].join(", ");

function extractPriceFromDom($: CheerioAPI): number | null {
  for (const el of $(PRICE_SELECTOR).toArray()) {
    const $el = $(el);
    const raw = $el.attr("content") ?? $el.attr("data-price") ?? $el.text();
    const price = parsePtBrCurrency(raw);
    if (price !== null && price > 0) return price;
  }
  return null;
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
