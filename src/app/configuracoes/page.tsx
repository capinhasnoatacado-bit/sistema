import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { CLASSES_FONTES } from "@/lib/fonts";
import { TEMA_ESCURO } from "@/lib/theme";
import { CategoriasList } from "./CategoriasList";
import type { BenchmarkCategoria } from "./actions";

// categorias vêm do banco — não dá pra pré-renderizar.
export const dynamic = "force-dynamic";

async function fetchCategorias(supabase: SupabaseClient): Promise<BenchmarkCategoria[]> {
  const { data, error } = await supabase.from("benchmark_categorias").select().order("nome");
  if (error) throw new Error(`Falha ao buscar as categorias: ${error.message}`);
  return (data ?? []) as BenchmarkCategoria[];
}

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const categorias = await fetchCategorias(supabase);

  return (
    <div
      className={`${CLASSES_FONTES} min-h-screen w-full bg-[var(--background)]`}
      style={{ ...TEMA_ESCURO, fontFamily: "var(--font-body), ui-sans-serif, system-ui, sans-serif" }}
    >
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6 sm:p-8">
        <header className="flex flex-col gap-1">
          <p className="font-[family-name:var(--font-data-mono)] text-[11px] font-medium tracking-[0.14em] text-[var(--accent)] uppercase">
            Capi Atacado · Configurações
          </p>
          <h1 className="text-balance font-[family-name:var(--font-display)] text-4xl leading-[1.02] font-bold tracking-tight text-[var(--ink)]">
            Categorias de benchmark
          </h1>
          <p className="max-w-[62ch] text-[15px] text-[var(--ink-muted)]">
            Cada categoria define os campos (ex: Cor, Comprimento, Amperagem) que aparecem como coluna
            dedicada na tabela de produtos importados em <code className="font-[family-name:var(--font-data-mono)]">/benchmark</code> — em
            vez da coluna genérica de especificações.
          </p>
          <a
            href="/benchmark"
            className="mt-1 self-start text-[13px] text-[var(--ink-muted)] underline decoration-[var(--border)] underline-offset-2 hover:text-[var(--accent)]"
          >
            ← Voltar pro Benchmark
          </a>
        </header>

        <CategoriasList categorias={categorias} />
      </main>
    </div>
  );
}
