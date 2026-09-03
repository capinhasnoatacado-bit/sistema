import * as cheerio from "cheerio";
import type { Cheerio } from "cheerio";
import type { AnyNode } from "domhandler";
import { delay } from "./delay";
import { fetchHtml } from "./fetch-html";
import { pageDeclaresProductSchema } from "./extract-product";

export type DiscoverProductUrlsResult = {
  /** Detectado automaticamente: "produto" (1 página) ou "categoria" (listagem paginada). */
  tipo: "produto" | "categoria";
  produtoUrls: string[];
  paginasVisitadas: number;
};

export type DiscoverProductUrlsOptions = {
  /** Trava de segurança: no máximo essas páginas de listagem são seguidas. */
  maxPaginas?: number;
  /** Trava de segurança: para de coletar links ao atingir esse total. */
  maxProdutos?: number;
  /** Intervalo entre requisições de página, pra não sobrecarregar o site do concorrente. */
  delayEntrePaginasMs?: number;
};

const DEFAULTS: Required<DiscoverProductUrlsOptions> = {
  maxPaginas: 20,
  maxProdutos: 300,
  delayEntrePaginasMs: 400,
};

// Segmentos de path que quase nunca são produto — filtra ruído de menu/rodapé
// (carrinho, login, institucional, etc.) comuns a qualquer e-commerce.
const PATH_BLOCKLIST = [
  "carrinho", "cart", "checkout", "conta", "account", "login", "cadastro",
  "senha", "logout", "busca", "search", "institucional", "sobre-nos", "sobre",
  "contato", "politica", "privacidade", "termos", "trabalhe-conosco",
  "trocas-e-devolucoes", "faq", "ajuda", "wp-admin", "wp-content", "blog",
  "rastreio", "rastreamento", "atendimento",
];

const ASSET_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|svg|css|js|pdf|xml|json)(\?|$)/i;

function isLikelyNonProductPath(pathname: string): boolean {
  const lower = pathname.toLowerCase();
  if (ASSET_EXTENSIONS.test(lower)) return true;
  return PATH_BLOCKLIST.some((segment) => lower.includes(`/${segment}`));
}

function toAbsoluteUrl(href: string, base: string): string | null {
  try {
    const url = new URL(href, base);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

const NEXT_PAGE_LABEL = /(pr[oó]xima|próximo|next|»|›)/i;
const PAGINATION_CONTAINER_SELECTOR = '[class*="pagina" i], [class*="pagination" i], nav[aria-label*="pagina" i]';

/**
 * Um card de produto normalmente tem preço (R$) ou uma imagem por perto do
 * link — sobe até 3 ancestrais procurando isso. Sem essa distância curta,
 * texto de outras partes da página (ex: preços de cards vizinhos) vazaria
 * pro texto agregado de um ancestral comum demais (como <body>).
 */
function isLikelyProductCard($anchor: Cheerio<AnyNode>): boolean {
  let $node = $anchor;
  for (let i = 0; i < 3; i++) {
    if (/R\$\s?\d/.test($node.text())) return true;
    if ($node.find("img").length > 0) return true;
    const parent = $node.parent();
    if (parent.length === 0) break;
    $node = parent;
  }
  return false;
}

/** Link de "página seguinte" nunca é produto, mesmo que esteja perto de preços de outros cards na mesma página. */
function isPaginationLink($anchor: Cheerio<AnyNode>): boolean {
  const rel = $anchor.attr("rel");
  if (rel === "next" || rel === "prev") return true;
  if ($anchor.closest(PAGINATION_CONTAINER_SELECTOR).length > 0) return true;
  return NEXT_PAGE_LABEL.test($anchor.text().trim());
}

function findProductLinks(html: string, pageUrl: string): string[] {
  const $ = cheerio.load(html);
  const hostname = new URL(pageUrl).hostname;
  const found = new Set<string>();

  $("a[href]").each((_, el) => {
    const $anchor = $(el);
    const href = $anchor.attr("href");
    if (!href) return;

    const absolute = toAbsoluteUrl(href, pageUrl);
    if (!absolute || absolute === pageUrl) return;

    const url = new URL(absolute);
    if (url.hostname !== hostname) return;
    if (isLikelyNonProductPath(url.pathname)) return;
    if (isPaginationLink($anchor)) return;
    if (!isLikelyProductCard($anchor)) return;

    found.add(absolute);
  });

  return [...found];
}

function findNextPageUrl(html: string, pageUrl: string, visited: Set<string>): string | null {
  const $ = cheerio.load(html);

  const relNext = $('link[rel="next"]').attr("href") ?? $('a[rel="next"]').attr("href");
  if (relNext) {
    const absolute = toAbsoluteUrl(relNext, pageUrl);
    if (absolute && !visited.has(absolute)) return absolute;
  }

  let candidate: string | null = null;
  $(PAGINATION_CONTAINER_SELECTOR)
    .find("a[href]")
    .each((_, el) => {
      if (candidate) return;
      const $el = $(el);
      const label = `${$el.text()} ${$el.attr("aria-label") ?? ""}`.trim();
      if (!NEXT_PAGE_LABEL.test(label)) return;

      const href = $el.attr("href");
      const absolute = href ? toAbsoluteUrl(href, pageUrl) : null;
      if (absolute && !visited.has(absolute)) candidate = absolute;
    });

  return candidate;
}

/**
 * Dado UM link colado pelo usuário, decide sozinho se é uma página de
 * produto (retorna só ela) ou uma listagem/categoria — nesse caso segue a
 * paginação da própria página coletando links de produto, dentro de limites
 * de segurança (`maxPaginas`, `maxProdutos`), com uma pequena pausa entre
 * requisições pra não sobrecarregar o site do concorrente.
 *
 * Se a página parecer listagem mas nenhum link de produto for encontrado
 * nela (heurística não bateu com o layout do site), assume que a própria
 * URL colada já é a do produto — mais seguro que devolver um job vazio.
 */
export async function discoverProductUrls(
  startUrl: string,
  options: DiscoverProductUrlsOptions = {},
): Promise<DiscoverProductUrlsResult> {
  const { maxPaginas, maxProdutos, delayEntrePaginasMs } = { ...DEFAULTS, ...options };

  const firstHtml = await fetchHtml(startUrl);
  if (pageDeclaresProductSchema(firstHtml)) {
    return { tipo: "produto", produtoUrls: [startUrl], paginasVisitadas: 1 };
  }

  const produtoUrls = new Map<string, true>();
  const visited = new Set<string>([startUrl]);
  let html = firstHtml;
  let currentUrl = startUrl;
  let paginasVisitadas = 0;

  while (true) {
    paginasVisitadas += 1;
    for (const url of findProductLinks(html, currentUrl)) {
      if (produtoUrls.size >= maxProdutos) break;
      produtoUrls.set(url, true);
    }

    const reachedLimits = paginasVisitadas >= maxPaginas || produtoUrls.size >= maxProdutos;
    const nextUrl = reachedLimits ? null : findNextPageUrl(html, currentUrl, visited);
    if (!nextUrl) break;

    visited.add(nextUrl);
    await delay(delayEntrePaginasMs);
    html = await fetchHtml(nextUrl);
    currentUrl = nextUrl;
  }

  if (produtoUrls.size === 0) {
    return { tipo: "produto", produtoUrls: [startUrl], paginasVisitadas };
  }
  return { tipo: "categoria", produtoUrls: [...produtoUrls.keys()], paginasVisitadas };
}
