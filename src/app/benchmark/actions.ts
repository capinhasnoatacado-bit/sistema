"use server";

import { createClient } from "@/lib/supabase/server";
import {
  criarBenchmarkJob,
  criarBenchmarkJobManual,
  criarBenchmarkJobManualEmLote,
  processarProximoLote,
  type BenchmarkJob,
  type ProdutoManualSemUrl,
} from "@/lib/scraping/job-runner";
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

export type CadastroManualLoteInput = {
  urlOrigem: string;
  linhas: string;
};

export type CadastroManualLoteResultado = {
  jobId: string;
  totalCadastrado: number;
  linhasIgnoradas: number;
};

/**
 * Cadastro manual em lote: pra quando não é 1 produto só (login) mas uma
 * listagem inteira que o scraping não consegue processar. Cada linha do
 * texto vira 1 produto — formato "Nome | Código | Marca | Preço |
 * Especificações", com Código/Marca/Preço/Especificações opcionais.
 * Especificações (se usado) vem como "Rótulo=Valor; Rótulo=Valor".
 */
export async function cadastrarProdutosManualEmLote(
  input: CadastroManualLoteInput,
): Promise<CadastroManualLoteResultado> {
  const urlOrigem = input.urlOrigem.trim();
  if (!urlOrigem) {
    throw new Error("Cole o link da listagem (mesmo que o scraping não funcione nela) como referência.");
  }
  try {
    new URL(urlOrigem);
  } catch {
    throw new Error("Esse link não parece válido.");
  }

  const linhasBrutas = input.linhas.split("\n").map((l) => l.trim()).filter(Boolean);
  if (linhasBrutas.length === 0) {
    throw new Error("Cole pelo menos uma linha de produto.");
  }

  const produtos: ProdutoManualSemUrl[] = [];
  let linhasIgnoradas = 0;

  for (const linha of linhasBrutas) {
    const produto = parseLinhaProdutoLote(linha);
    if (produto) produtos.push(produto);
    else linhasIgnoradas += 1;
  }

  if (produtos.length === 0) {
    throw new Error("Nenhuma linha ficou num formato reconhecível (precisa de pelo menos o nome).");
  }

  const supabase = await createClient();
  const job = await criarBenchmarkJobManualEmLote(supabase, urlOrigem, produtos);

  return { jobId: job.id, totalCadastrado: produtos.length, linhasIgnoradas };
}

function parseLinhaProdutoLote(linha: string): ProdutoManualSemUrl | null {
  const [nomeBruto, codigoBruto, marcaBruto, precoBruto, especBruto] = linha.split("|").map((p) => p.trim());

  const nome = nomeBruto?.trim();
  if (!nome) return null;

  const preco = precoBruto ? parsePtBrCurrency(precoBruto) : null;

  return {
    nome,
    codigo: codigoBruto || null,
    marca: marcaBruto || null,
    preco,
    especificacoes: especBruto ? parseEspecificacoesLinhaUnica(especBruto) : {},
  };
}

/** "Rótulo=Valor; Rótulo=Valor" — versão de 1 linha do mesmo par rótulo/valor, pro cadastro em lote. */
function parseEspecificacoesLinhaUnica(texto: string): Record<string, string> {
  const especificacoes: Record<string, string> = {};

  for (const par of texto.split(";")) {
    const idx = par.indexOf("=");
    if (idx === -1) continue;

    const label = par.slice(0, idx).trim();
    const value = par.slice(idx + 1).trim();
    if (label && value) especificacoes[label] = value;
  }

  return especificacoes;
}
