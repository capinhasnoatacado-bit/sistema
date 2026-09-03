import type { SupabaseClient } from "@supabase/supabase-js";
import { delay } from "./delay";
import { discoverProductUrls } from "./discover-product-urls";
import { extractProduct } from "./extract-product";
import { fetchHtml } from "./fetch-html";

/**
 * Quantos produtos são extraídos por chamada de `processarProximoLote`.
 * Cada chamada precisa terminar dentro do tempo de uma requisição — em
 * produção (Vercel) isso é o `maxDuration` da action; um lote pequeno
 * evita estourar esse limite mesmo se algumas páginas demorarem a responder.
 */
const TAMANHO_LOTE_PADRAO = 3;

/** Pausa entre requisições de produto dentro de um mesmo lote — mesmo motivo do delay entre páginas na descoberta. */
const DELAY_ENTRE_PRODUTOS_MS = 300;

export type BenchmarkJobStatus = "pendente" | "processando" | "concluido" | "erro";

export type BenchmarkJob = {
  id: string;
  url_origem: string;
  site_origem: string | null;
  tipo: "produto" | "categoria" | "manual" | null;
  status: BenchmarkJobStatus;
  total_encontrado: number;
  total_importado: number;
  total_com_erro: number;
  urls_pendentes: string[];
  mensagem_erro: string | null;
  criado_em: string;
  iniciado_em: string | null;
  finalizado_em: string | null;
};

/**
 * Cria o job pro link colado pelo usuário. Só grava a intenção (status
 * "pendente") — a descoberta de produtos e a extração em si só acontecem
 * nas chamadas seguintes de `processarProximoLote`, pra essa função nunca
 * correr risco de estourar o tempo de uma requisição.
 */
export async function criarBenchmarkJob(supabase: SupabaseClient, urlOrigem: string): Promise<BenchmarkJob> {
  const siteOrigem = safeHostname(urlOrigem);

  const { data, error } = await supabase
    .from("benchmark_jobs")
    .insert({ url_origem: urlOrigem, site_origem: siteOrigem })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Falha ao criar o job de benchmark: ${error?.message ?? "erro desconhecido"}`);
  }

  return data as BenchmarkJob;
}

export type NovoProdutoManual = {
  urlProduto: string;
  nome: string;
  marca: string | null;
  codigo: string | null;
  preco: number | null;
  especificacoes: Record<string, string>;
};

/**
 * Cadastro manual: pra quando o site exige login e o scraping automático
 * não consegue entrar — o usuário manda um print do produto pro Claude
 * (na conversa), que lê os dados e cadastra aqui. Diferente do fluxo por
 * link, não tem nada pra descobrir/processar depois: o job já nasce
 * "concluido", com o único produto já salvo.
 */
export async function criarBenchmarkJobManual(
  supabase: SupabaseClient,
  produto: NovoProdutoManual,
): Promise<BenchmarkJob> {
  const agora = new Date().toISOString();

  const { data: job, error: erroJob } = await supabase
    .from("benchmark_jobs")
    .insert({
      url_origem: produto.urlProduto,
      site_origem: safeHostname(produto.urlProduto),
      tipo: "manual",
      status: "concluido",
      total_encontrado: 1,
      total_importado: 1,
      iniciado_em: agora,
      finalizado_em: agora,
    })
    .select()
    .single();

  if (erroJob || !job) {
    throw new Error(`Falha ao criar o job manual: ${erroJob?.message ?? "erro desconhecido"}`);
  }

  const { error: erroProduto } = await supabase.from("benchmark_produtos").insert({
    job_id: job.id,
    url_produto: produto.urlProduto,
    nome: produto.nome,
    marca: produto.marca,
    codigo: produto.codigo,
    preco: produto.preco,
    especificacoes: produto.especificacoes,
  });

  if (erroProduto) {
    // Job já foi criado mas o produto não salvou — melhor apagar o job
    // órfão do que deixar um "concluído" com 0 produtos na lista.
    await supabase.from("benchmark_jobs").delete().eq("id", job.id);
    throw new Error(`Falha ao salvar o produto: ${erroProduto.message}`);
  }

  return job as BenchmarkJob;
}

export type ProdutoManualSemUrl = Omit<NovoProdutoManual, "urlProduto">;

/**
 * Mesma ideia do cadastro manual único, mas pra quando o site nem dá pra
 * scraping nem é 1 produto só — ex: uma listagem inteira com dezenas de
 * produtos que o usuário leu num (ou mais) print(s) e passou pro Claude.
 * Como não tem link individual por produto (só o da listagem), cada linha
 * ganha uma `url_produto` sintética baseada nela pra satisfazer a
 * constraint de único (job_id, url_produto).
 */
export async function criarBenchmarkJobManualEmLote(
  supabase: SupabaseClient,
  urlOrigem: string,
  produtos: ProdutoManualSemUrl[],
): Promise<BenchmarkJob> {
  const agora = new Date().toISOString();

  const { data: job, error: erroJob } = await supabase
    .from("benchmark_jobs")
    .insert({
      url_origem: urlOrigem,
      site_origem: safeHostname(urlOrigem),
      tipo: "manual",
      status: "concluido",
      total_encontrado: produtos.length,
      total_importado: produtos.length,
      iniciado_em: agora,
      finalizado_em: agora,
    })
    .select()
    .single();

  if (erroJob || !job) {
    throw new Error(`Falha ao criar o job manual: ${erroJob?.message ?? "erro desconhecido"}`);
  }

  const linhas = produtos.map((produto, indice) => ({
    job_id: job.id,
    url_produto: `${urlOrigem}#${indice + 1}`,
    nome: produto.nome,
    marca: produto.marca,
    codigo: produto.codigo,
    preco: produto.preco,
    especificacoes: produto.especificacoes,
  }));

  const { error: erroProdutos } = await supabase.from("benchmark_produtos").insert(linhas);

  if (erroProdutos) {
    await supabase.from("benchmark_jobs").delete().eq("id", job.id);
    throw new Error(`Falha ao salvar os produtos: ${erroProdutos.message}`);
  }

  return job as BenchmarkJob;
}

async function buscarJob(supabase: SupabaseClient, jobId: string): Promise<BenchmarkJob> {
  const { data, error } = await supabase.from("benchmark_jobs").select().eq("id", jobId).single();
  if (error || !data) {
    throw new Error(`Job de benchmark não encontrado: ${error?.message ?? jobId}`);
  }
  return data as BenchmarkJob;
}

/**
 * Avança o job em UM passo e devolve o job atualizado — feito pra ser
 * chamado repetidamente (polling da tela) até o status virar "concluido"
 * ou "erro". Chamar depois de terminado é seguro (não faz nada).
 *
 * - job "pendente": faz a descoberta de produtos (etapa 3) e guarda a fila
 *   em `urls_pendentes`. Não extrai nenhum produto ainda nessa chamada.
 * - job "processando": extrai um lote de `urls_pendentes` e grava em
 *   `benchmark_produtos`. Se a fila esvaziar, marca "concluido".
 */
export async function processarProximoLote(
  supabase: SupabaseClient,
  jobId: string,
  tamanhoLote = TAMANHO_LOTE_PADRAO,
): Promise<BenchmarkJob> {
  const job = await buscarJob(supabase, jobId);

  if (job.status === "concluido" || job.status === "erro") {
    return job;
  }

  if (job.status === "pendente") {
    return iniciarDescoberta(supabase, job);
  }

  return processarLoteDeExtracao(supabase, job, tamanhoLote);
}

async function iniciarDescoberta(supabase: SupabaseClient, job: BenchmarkJob): Promise<BenchmarkJob> {
  const inicio: Partial<BenchmarkJob> = { status: "processando", iniciado_em: new Date().toISOString() };

  try {
    const descoberta = await discoverProductUrls(job.url_origem);

    const atualizacao: Partial<BenchmarkJob> =
      descoberta.produtoUrls.length === 0
        ? {
            ...inicio,
            status: "erro",
            mensagem_erro: "Nenhum produto foi encontrado nesse link.",
            finalizado_em: new Date().toISOString(),
          }
        : {
            ...inicio,
            tipo: descoberta.tipo,
            total_encontrado: descoberta.produtoUrls.length,
            urls_pendentes: descoberta.produtoUrls,
          };

    return atualizarJob(supabase, job.id, atualizacao);
  } catch (error) {
    return atualizarJob(supabase, job.id, {
      ...inicio,
      status: "erro",
      mensagem_erro: mensagemDeErro(error),
      finalizado_em: new Date().toISOString(),
    });
  }
}

async function processarLoteDeExtracao(
  supabase: SupabaseClient,
  job: BenchmarkJob,
  tamanhoLote: number,
): Promise<BenchmarkJob> {
  const lote = job.urls_pendentes.slice(0, tamanhoLote);
  const restante = job.urls_pendentes.slice(tamanhoLote);

  let importados = 0;
  let comErro = 0;

  for (const [indice, url] of lote.entries()) {
    if (indice > 0) await delay(DELAY_ENTRE_PRODUTOS_MS);

    try {
      const html = await fetchHtml(url);
      const produto = extractProduct(html, url);

      const { error } = await supabase.from("benchmark_produtos").upsert(
        {
          job_id: job.id,
          url_produto: produto.url,
          nome: produto.nome,
          marca: produto.marca,
          codigo: produto.codigo,
          preco: produto.preco,
          imagem_url: produto.imagemUrl,
          especificacoes: produto.especificacoes,
        },
        { onConflict: "job_id,url_produto" },
      );

      if (error) throw new Error(error.message);
      importados += 1;
    } catch {
      // Um produto falhar não derruba o job inteiro — só conta como erro e
      // segue pro próximo. O usuário vê o total de erros no fim do job.
      comErro += 1;
    }
  }

  const finalizando = restante.length === 0;

  return atualizarJob(supabase, job.id, {
    urls_pendentes: restante,
    total_importado: job.total_importado + importados,
    total_com_erro: job.total_com_erro + comErro,
    status: finalizando ? "concluido" : "processando",
    finalizado_em: finalizando ? new Date().toISOString() : null,
  });
}

async function atualizarJob(
  supabase: SupabaseClient,
  jobId: string,
  atualizacao: Partial<BenchmarkJob>,
): Promise<BenchmarkJob> {
  const { data, error } = await supabase.from("benchmark_jobs").update(atualizacao).eq("id", jobId).select().single();
  if (error || !data) {
    throw new Error(`Falha ao atualizar o job de benchmark: ${error?.message ?? "erro desconhecido"}`);
  }
  return data as BenchmarkJob;
}

export type AtualizarPrecoItemResultado = {
  produtoId: string;
  ok: boolean;
  precoAntigo: number | null;
  precoNovo: number | null;
  mensagem?: string;
};

/**
 * Rebusca o preço de um lote de produtos já importados, sem tocar em nome,
 * marca, código ou especificações — preserva qualquer correção manual feita
 * na tabela depois da importação. Pensado pra ser chamado repetidamente com
 * lotes pequenos de ids (mesmo motivo do `TAMANHO_LOTE_PADRAO`/
 * `DELAY_ENTRE_PRODUTOS_MS` acima: não estourar o tempo de uma requisição
 * nem sobrecarregar o site do concorrente).
 */
export async function atualizarPrecosDeProdutos(
  supabase: SupabaseClient,
  produtoIds: string[],
): Promise<AtualizarPrecoItemResultado[]> {
  const { data: produtos, error } = await supabase
    .from("benchmark_produtos")
    .select("id, url_produto, preco")
    .in("id", produtoIds);

  if (error) {
    throw new Error(`Falha ao buscar os produtos: ${error.message}`);
  }

  const resultados: AtualizarPrecoItemResultado[] = [];

  for (const [indice, produto] of (produtos ?? []).entries()) {
    if (indice > 0) await delay(DELAY_ENTRE_PRODUTOS_MS);

    const precoAntigo = produto.preco as number | null;
    try {
      const html = await fetchHtml(produto.url_produto as string);
      const extraido = extractProduct(html, produto.url_produto as string);

      if (extraido.preco === null) {
        throw new Error("Não encontrei preço nessa página.");
      }

      const { error: erroUpdate } = await supabase
        .from("benchmark_produtos")
        .update({ preco: extraido.preco, capturado_em: new Date().toISOString() })
        .eq("id", produto.id);

      if (erroUpdate) throw new Error(erroUpdate.message);

      resultados.push({ produtoId: produto.id as string, ok: true, precoAntigo, precoNovo: extraido.preco });
    } catch (err) {
      resultados.push({
        produtoId: produto.id as string,
        ok: false,
        precoAntigo,
        precoNovo: null,
        mensagem: err instanceof Error ? err.message : "Falha ao atualizar.",
      });
    }
  }

  return resultados;
}

function safeHostname(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function mensagemDeErro(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
