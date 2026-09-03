const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

/** Erro ao buscar uma página — mensagem já pensada para ir direto pro `mensagem_erro` do job. */
export class FetchHtmlError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "FetchHtmlError";
    this.status = status;
  }
}

/**
 * Busca o HTML de uma URL se passando por um navegador comum (muitos sites
 * bloqueiam requisições sem User-Agent). Lança `FetchHtmlError` com uma
 * mensagem legível em vez de deixar o erro cru do fetch vazar.
 */
export async function fetchHtml(url: string, timeoutMs = 15000): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
      redirect: "follow",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new FetchHtmlError(
        `A página respondeu com erro ${response.status}`,
        response.status,
      );
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("html")) {
      throw new FetchHtmlError(
        `A URL não retornou uma página HTML (content-type: ${contentType || "desconhecido"})`,
      );
    }

    return await decodeBody(response);
  } catch (error) {
    if (error instanceof FetchHtmlError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new FetchHtmlError(`Tempo limite de ${timeoutMs / 1000}s excedido ao buscar a página`);
    }
    const reason = error instanceof Error ? error.message : String(error);
    throw new FetchHtmlError(`Falha ao buscar a página: ${reason}`);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * `response.text()` só olha o charset do header HTTP `Content-Type`,
 * caindo pra UTF-8 quando ele não vem declarado — bastante comum em sites
 * mais antigos, que declaram o charset só via `<meta charset>` dentro do
 * próprio HTML. Decodificar como UTF-8 nesse caso corrompe acentos (ex:
 * "Cerâmica" virando "Cer�mica"), então aqui a gente lê os bytes crus e
 * decodifica com o charset certo, onde quer que ele esteja declarado.
 */
async function decodeBody(response: Response): Promise<string> {
  const buffer = await response.arrayBuffer();
  const charset = detectCharset(response.headers.get("content-type") ?? "", buffer);

  try {
    return new TextDecoder(charset).decode(buffer);
  } catch {
    return new TextDecoder("utf-8").decode(buffer); // charset não reconhecido — utf-8 como fallback seguro
  }
}

function detectCharset(contentType: string, buffer: ArrayBuffer): string {
  const doHeader = contentType.match(/charset=([^;]+)/i);
  if (doHeader) return doHeader[1].trim().toLowerCase();

  // Sem charset no header — procura a declaração <meta charset> no HTML.
  // A declaração em si é sempre ASCII, então dá pra ler os primeiros bytes
  // com um decoder que nunca falha (windows-1252) antes de saber o charset
  // de verdade da página inteira.
  const preview = new TextDecoder("windows-1252").decode(buffer.slice(0, 2048));
  const metaCharset =
    preview.match(/<meta[^>]+charset=["']?([\w-]+)/i) ?? preview.match(/charset=([\w-]+)/i);
  return metaCharset ? metaCharset[1].trim().toLowerCase() : "utf-8";
}
