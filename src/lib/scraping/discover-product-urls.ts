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

// Se a página já mostra pelo menos essa quantidade de links com cara de
// card de produto, é uma listagem — ponto final. Alguns temas de loja
// publicam JSON-LD de "Product" (de 1 item só, geralmente o primeiro da
// grade) até em página de categoria; sem essa checagem primeiro, esse
// JSON-LD "vaza" e faz a página inteira ser tratada como 1 produto único.
const LISTAGEM_MIN_LINKS = 2;

// Alguns temas (comum em Tiendanube/Nuvemshop) carregam o resto da grade só
// via JS ("carregar mais"/scroll infinito), sem nenhum link de próxima
// página no HTML — mas aceitam navegação direta pra outras páginas por
// parâmetro de query. Usado só como fallback, depois que `findNextPageUrl`
// (baseado em link real) não encontra nada.
const PAGINACAO_PARAM_CANDIDATOS = ["mpage", "page"];

function currentPageNumberFromUrl(url: string, param: string): number {
  try {
    const numero = Number.parseInt(new URL(url).searchParams.get(param) ?? "", 10);
    return Number.isFinite(numero) && numero > 0 ? numero : 1;
  } catch {
    return 1;
  }
}

function buildPaginaCandidata(baseUrl: string, param: string, numero: number): string | null {
  try {
    const url = new URL(baseUrl);
    url.searchParams.set(param, String(numero));
    return url.toString();
  } catch {
    return null;
  }
}

type TentativaPaginacao = { url: string; html: string; links: string[]; param: string };

/**
 * Tenta os parâmetros de paginação candidatos (ou só o já descoberto numa
 * página anterior do mesmo job) incrementando o número da página atual. Só
 * considera sucesso se a página candidata trouxer pelo menos 1 link de
 * produto ainda não coletado — assim não entra em loop quando o parâmetro
 * não faz nada no site (a página candidata simplesmente repete a página 1).
 */
async function tentarProximaPaginaPorParametro(
  currentUrl: string,
  visited: Set<string>,
  produtoUrlsConhecidos: Map<string, true>,
  paramJaDescoberto: string | null,
): Promise<TentativaPaginacao | null> {
  const candidatos = paramJaDescoberto ? [paramJaDescoberto] : PAGINACAO_PARAM_CANDIDATOS;

  for (const param of candidatos) {
    const proximoNumero = currentPageNumberFromUrl(currentUrl, param) + 1;
    const candidata = buildPaginaCandidata(currentUrl, param, proximoNumero);
    if (!candidata || visited.has(candidata)) continue;

    let html: string;
    try {
      html = await fetchHtml(candidata);
    } catch {
      continue;
    }

    const links = findProductLinks(html, candidata);
    const trouxeAlgoNovo = links.some((url) => !produtoUrlsConhecidos.has(url));
    if (trouxeAlgoNovo) {
      return { url: candidata, html, links, param };
    }
  }

  return null;
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
  const primeirosLinks = findProductLinks(firstHtml, startUrl);

  // Só confia no JSON-LD dizendo "isso é 1 produto" quando a página NÃO
  // mostra vários cards de produto de verdade (ver nota em LISTAGEM_MIN_LINKS).
  if (primeirosLinks.length < LISTAGEM_MIN_LINKS && pageDeclaresProductSchema(firstHtml)) {
    return { tipo: "produto", produtoUrls: [startUrl], paginasVisitadas: 1 };
  }

  const produtoUrls = new Map<string, true>();
  const visited = new Set<string>([startUrl]);
  let html = firstHtml;
  let currentUrl = startUrl;
  let paginasVisitadas = 0;
  let linksDaPaginaAtual = primeirosLinks;
  // Uma vez que um parâmetro de paginação funcionar pra esse site, reusa
  // direto nas páginas seguintes — não precisa reprovar os candidatos toda vez.
  let paramPaginacaoDescoberto: string | null = null;

  while (true) {
    paginasVisitadas += 1;
    for (const url of linksDaPaginaAtual) {
      if (produtoUrls.size >= maxProdutos) break;
      produtoUrls.set(url, true);
    }

    if (paginasVisitadas >= maxPaginas || produtoUrls.size >= maxProdutos) break;

    const nextUrl = findNextPageUrl(html, currentUrl, visited);
    if (nextUrl) {
      visited.add(nextUrl);
      await delay(delayEntrePaginasMs);
      html = await fetchHtml(nextUrl);
      currentUrl = nextUrl;
      linksDaPaginaAtual = findProductLinks(html, currentUrl);
      continue;
    }

    // Sem link real de próxima página — tenta o fallback por parâmetro de
    // query antes de desistir (ver `tentarProximaPaginaPorParametro`).
    await delay(delayEntrePaginasMs);
    const tentativa = await tentarProximaPaginaPorParametro(
      currentUrl,
      visited,
      produtoUrls,
      paramPaginacaoDescoberto,
    );
    if (!tentativa) break;

    paramPaginacaoDescoberto = tentativa.param;
    visited.add(tentativa.url);
    html = tentativa.html;
    currentUrl = tentativa.url;
    linksDaPaginaAtual = tentativa.links;
  }

  if (produtoUrls.size === 0) {
    return { tipo: "produto", produtoUrls: [startUrl], paginasVisitadas };
  }
  return { tipo: "categoria", produtoUrls: [...produtoUrls.keys()], paginasVisitadas };
}
