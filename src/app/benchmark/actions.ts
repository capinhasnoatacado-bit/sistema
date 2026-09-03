"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
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

export type AtualizarProdutoInput = {
  produtoId: string;
  nome: string;
  marca: string;
  codigo: string;
  preco: string;
  especificacoesTexto: string;
};

/** Validação + gravação de 1 produto — compartilhado entre a edição de 1 linha e a edição em lote da tabela toda. */
async function salvarProdutoBenchmark(supabase: SupabaseClient, input: AtualizarProdutoInput): Promise<void> {
  const nome = input.nome.trim();
  if (!nome) {
    throw new Error("Digite o nome do produto.");
  }

  const precoTexto = input.preco.trim();
  const preco = precoTexto ? parsePtBrCurrency(precoTexto) : null;
  if (precoTexto && preco === null) {
    throw new Error("Não entendi esse preço.");
  }

  const { error } = await supabase
    .from("benchmark_produtos")
    .update({
      nome,
      marca: input.marca.trim() || null,
      codigo: input.codigo.trim() || null,
      preco,
      especificacoes: parseEspecificacoesTexto(input.especificacoesTexto),
    })
    .eq("id", input.produtoId);

  if (error) {
    throw new Error(`Falha ao salvar o produto: ${error.message}`);
  }
}

/** Edita um produto já importado (link, cadastro manual ou lote) — corrige o que o scraping trouxe errado. */
export async function atualizarProdutoBenchmark(input: AtualizarProdutoInput): Promise<void> {
  const supabase = await createClient();
  await salvarProdutoBenchmark(supabase, input);
}

export type AtualizarProdutoLoteResultado = {
  totalSalvo: number;
  erros: { produtoId: string; mensagem: string }[];
};

/**
 * Modo "editar tabela toda": salva várias linhas de uma vez. Cada linha é
 * validada e gravada independente — se uma falhar (ex: preço inválido), as
 * outras são salvas normalmente e só a linha com problema volta em `erros`.
 */
export async function atualizarProdutosBenchmarkEmLote(
  itens: AtualizarProdutoInput[],
): Promise<AtualizarProdutoLoteResultado> {
  const supabase = await createClient();
  let totalSalvo = 0;
  const erros: { produtoId: string; mensagem: string }[] = [];

  for (const item of itens) {
    try {
      await salvarProdutoBenchmark(supabase, item);
      totalSalvo += 1;
    } catch (err) {
      erros.push({ produtoId: item.produtoId, mensagem: err instanceof Error ? err.message : "Falha ao salvar." });
    }
  }

  return { totalSalvo, erros };
}

/** Exclui só esse produto (mantém o resto do job) e ajusta o contador de "importados" do job pra continuar batendo com o que realmente sobrou. */
export async function excluirProdutoBenchmark(produtoId: string): Promise<void> {
  const supabase = await createClient();

  const { data: produto, error: erroSelect } = await supabase
    .from("benchmark_produtos")
    .select("job_id")
    .eq("id", produtoId)
    .single();

  if (erroSelect || !produto) {
    throw new Error(`Produto não encontrado: ${erroSelect?.message ?? produtoId}`);
  }

  const { error: erroDelete } = await supabase.from("benchmark_produtos").delete().eq("id", produtoId);
  if (erroDelete) {
    throw new Error(`Falha ao excluir o produto: ${erroDelete.message}`);
  }

  const jobId = produto.job_id as string;
  const { data: job } = await supabase.from("benchmark_jobs").select("total_importado").eq("id", jobId).single();

  if (job) {
    await supabase
      .from("benchmark_jobs")
      .update({ total_importado: Math.max(0, (job.total_importado as number) - 1) })
      .eq("id", jobId);
  }
}

/**
 * Exclui vários produtos de uma vez (modo "editar tabela", seleção por
 * checkbox) — mesmo ajuste de contador do job que a exclusão individual,
 * só que somando quantos produtos de cada job saíram no lote.
 */
export async function excluirProdutosBenchmarkEmLote(produtoIds: string[]): Promise<void> {
  if (produtoIds.length === 0) return;

  const supabase = await createClient();

  const { data: produtos, error: erroSelect } = await supabase
    .from("benchmark_produtos")
    .select("id, job_id")
    .in("id", produtoIds);

  if (erroSelect) {
    throw new Error(`Falha ao buscar os produtos: ${erroSelect.message}`);
  }
  if (!produtos || produtos.length === 0) return;

  const { error: erroDelete } = await supabase.from("benchmark_produtos").delete().in("id", produtoIds);
  if (erroDelete) {
    throw new Error(`Falha ao excluir os produtos: ${erroDelete.message}`);
  }

  // Normalmente é só 1 job (o aberto na tela), mas soma por job pra ficar correto mesmo se não for.
  const quantidadePorJob = new Map<string, number>();
  for (const produto of produtos) {
    const jobId = produto.job_id as string;
    quantidadePorJob.set(jobId, (quantidadePorJob.get(jobId) ?? 0) + 1);
  }

  for (const [jobId, quantidade] of quantidadePorJob) {
    const { data: job } = await supabase.from("benchmark_jobs").select("total_importado").eq("id", jobId).single();
    if (job) {
      await supabase
        .from("benchmark_jobs")
        .update({ total_importado: Math.max(0, (job.total_importado as number) - quantidade) })
        .eq("id", jobId);
    }
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
