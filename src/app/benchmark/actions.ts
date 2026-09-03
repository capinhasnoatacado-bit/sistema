"use server";

import { createClient } from "@/lib/supabase/server";
import { criarBenchmarkJob, criarBenchmarkJobManual, processarProximoLote, type BenchmarkJob } from "@/lib/scraping/job-runner";
import { parsePtBrCurrency } from "@/lib/scraping/parse-price";

// Nota pra quando a tela (`page.tsx`) for criada: como o processamento roda
// em lotes (ver job-runner.ts), cada chamada aqui é curta — mas se algum
// lote demorar mais que o limite padrão de função serverless da Vercel,
// declare `export const maxDuration = ...` na própria page.tsx que chama
// essas actions (Server Actions herdam o maxDuration da rota que as invoca).

/** Cria o job pro link colado pelo usuário e devolve o id pra tela começar a fazer polling. */
export async function iniciarBenchmark(urlOrigem: string): Promise<{ jobId: string }> {
  const url = urlOrigem.trim();
  if (!url) {
    throw new Error("Cole o link de um produto ou categoria.");
  }
  try {
    new URL(url);
  } catch {
    throw new Error("Esse link não parece válido.");
  }

  const supabase = await createClient();
  const job = await criarBenchmarkJob(supabase, url);
  return { jobId: job.id };
}

/** Avança o job em um passo (descoberta ou um lote de extração) — a tela chama isso repetidamente até o job terminar. */
export async function avancarBenchmarkJob(jobId: string): Promise<BenchmarkJob> {
  const supabase = await createClient();
  return processarProximoLote(supabase, jobId);
}

/** Exclui o job e, por cascade (FK em benchmark_produtos), os produtos importados nele junto. */
export async function excluirBenchmarkJob(jobId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("benchmark_jobs").delete().eq("id", jobId);
  if (error) {
    throw new Error(`Falha ao excluir a importação: ${error.message}`);
  }
}

export type CadastroManualInput = {
  urlProduto: string;
  nome: string;
  marca: string;
  codigo: string;
  preco: string;
  especificacoesTexto: string;
};

/**
 * Cadastro manual: pra sites que exigem login e o scraping automático não
 * funciona. O usuário lê o produto num print (mandado pro Claude na
 * conversa) e digita os dados aqui — sem nada pra processar depois, o job
 * já nasce concluído com o produto já salvo.
 */
export async function cadastrarProdutoManual(input: CadastroManualInput): Promise<{ jobId: string }> {
  const urlProduto = input.urlProduto.trim();
  const nome = input.nome.trim();

  if (!urlProduto) {
    throw new Error("Cole o link do produto (mesmo que exija login) como referência.");
  }
  try {
    new URL(urlProduto);
  } catch {
    throw new Error("Esse link não parece válido.");
  }
  if (!nome) {
    throw new Error("Digite o nome do produto.");
  }

  const precoTexto = input.preco.trim();
  const preco = precoTexto ? parsePtBrCurrency(precoTexto) : null;
  if (precoTexto && preco === null) {
    throw new Error("Não entendi esse preço.");
  }

  const supabase = await createClient();
  const job = await criarBenchmarkJobManual(supabase, {
    urlProduto,
    nome,
    marca: input.marca.trim() || null,
    codigo: input.codigo.trim() || null,
    preco,
    especificacoes: parseEspecificacoesTexto(input.especificacoesTexto),
  });

  return { jobId: job.id };
}

/** "Rótulo: Valor", uma linha por especificação — mesmo formato que o scraping já reconhece na página. */
function parseEspecificacoesTexto(texto: string): Record<string, string> {
  const especificacoes: Record<string, string> = {};

  for (const linhaBruta of texto.split("\n")) {
    const linha = linhaBruta.trim();
    if (!linha) continue;

    const idx = linha.indexOf(":");
    if (idx === -1) continue;

    const label = linha.slice(0, idx).trim();
    const value = linha.slice(idx + 1).trim();
    if (label && value) especificacoes[label] = value;
  }

  return especificacoes;
}
