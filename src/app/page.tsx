// Força a checagem a rodar a cada request, em vez de ser congelada no build
// (sem isso, o Next pré-renderiza a página como estática e o resultado da
// checagem de conexão fica fixo para sempre).
export const dynamic = "force-dynamic";

type SupabaseCheck = { ok: true } | { ok: false; message: string };

/**
 * Checa a saúde do serviço de Auth do Supabase local (endpoint público do
 * GoTrue, não exige chave). Confirma que o stack local está de pé e
 * acessível a partir do app — sem depender de nenhuma tabela de domínio.
 */
async function checkSupabaseConnection(): Promise<SupabaseCheck> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!url) {
    return {
      ok: false,
      message: "NEXT_PUBLIC_SUPABASE_URL não definida. Configure o .env.local.",
    };
  }

  try {
    const res = await fetch(`${url}/auth/v1/health`, { cache: "no-store" });

    if (!res.ok) {
      return { ok: false, message: `Supabase respondeu com status ${res.status}.` };
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      message:
        err instanceof Error
          ? err.message
          : "Falha ao conectar ao Supabase. O stack local está rodando (`supabase start`)?",
    };
  }
}

export default async function Home() {
  const supabase = await checkSupabaseConnection();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-2xl font-semibold">Capi Atacado</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Next.js + TypeScript + Tailwind rodando.
      </p>

      <div className="rounded-lg border border-black/10 px-6 py-4 dark:border-white/15">
        {supabase.ok ? (
          <p className="font-medium text-green-600 dark:text-green-400">
            ✅ Conectado ao Supabase (Auth) local
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            <p className="font-medium text-red-600 dark:text-red-400">
              ❌ Não foi possível conectar ao Supabase
            </p>
            <p className="max-w-md text-sm text-zinc-500 dark:text-zinc-400">
              {supabase.message}
            </p>
          </div>
        )}
      </div>

      <a
        href="/comparador"
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-zinc-900"
      >
        Comparador de cabos
      </a>
    </main>
  );
}
