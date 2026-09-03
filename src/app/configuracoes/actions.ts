"use server";

import { createClient } from "@/lib/supabase/server";

export type BenchmarkCategoria = {
  id: string;
  nome: string;
  campos: string[];
  criado_em: string;
};

export type CategoriaInput = {
  nome: string;
  campos: string[];
};

const CODIGO_UNIQUE_VIOLATION = "23505";

/** Tira campo em branco e duplicado (por nome, sem diferenciar maiúscula) — sem isso a mesma coluna apareceria 2x na tabela. */
function limparCampos(campos: string[]): string[] {
  const vistos = new Set<string>();
  const limpos: string[] = [];

  for (const campoBruto of campos) {
    const campo = campoBruto.trim();
    if (!campo) continue;

    const chave = campo.toLowerCase();
    if (vistos.has(chave)) continue;

    vistos.add(chave);
    limpos.push(campo);
  }

  return limpos;
}

/** Cria uma categoria de benchmark — nome + campos que viram coluna dedicada na tabela de produtos (ver category-columns.ts). */
export async function criarCategoria(input: CategoriaInput): Promise<{ id: string }> {
  const nome = input.nome.trim();
  if (!nome) {
    throw new Error("Digite o nome da categoria.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("benchmark_categorias")
    .insert({ nome, campos: limparCampos(input.campos) })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(
      error?.code === CODIGO_UNIQUE_VIOLATION
        ? `Já existe uma categoria chamada "${nome}".`
        : `Falha ao criar a categoria: ${error?.message ?? "erro desconhecido"}`,
    );
  }

  return { id: data.id as string };
}

/** Edita nome e/ou campos de uma categoria já existente — jobs que já usam ela passam a mostrar as colunas novas na próxima vez que a tabela for aberta. */
export async function atualizarCategoria(categoriaId: string, input: CategoriaInput): Promise<void> {
  const nome = input.nome.trim();
  if (!nome) {
    throw new Error("Digite o nome da categoria.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("benchmark_categorias")
    .update({ nome, campos: limparCampos(input.campos) })
    .eq("id", categoriaId);

  if (error) {
    throw new Error(
      error.code === CODIGO_UNIQUE_VIOLATION
        ? `Já existe uma categoria chamada "${nome}".`
        : `Falha ao salvar a categoria: ${error.message}`,
    );
  }
}

/** Exclui a categoria — jobs que usavam ela ficam "Sem categoria" (FK com `on delete set null`), não são apagados. */
export async function excluirCategoria(categoriaId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("benchmark_categorias").delete().eq("id", categoriaId);

  if (error) {
    throw new Error(`Falha ao excluir a categoria: ${error.message}`);
  }
}
