import { createClient } from "@/lib/supabase/server";

// searchParams é request-time (não dá pra pré-renderizar essa página).
export const dynamic = "force-dynamic";

type Especificacoes = {
  conector_origem?: string;
  conector_destino?: string;
  comprimento_m?: number;
  amperagem?: string;
  material?: string;
  /** Classificação básica: "Preto", "Branco", "Colorido", ou combinação
   * ("Preto, Branco") quando o mesmo código vem em mais de uma cor pelo
   * mesmo preço. Ausente quando o catálogo do fornecedor não informa cor
   * (é o caso de todo o catálogo KAID). */
  cor?: string;
};

/** Opções fixas do filtro de cor — não dependem do que está cadastrado,
 * são a classificação básica que a gente decidiu usar. */
const CORES_FILTRO = ["Preto", "Branco", "Colorido"] as const;

type ProdutoRow = {
  id: string;
  codigo: string | null;
  nome: string;
  preco_unitario: number;
  moq: number | null;
  embalagem_unidades: number | null;
  especificacoes: Especificacoes | null;
  fornecedores: { nome: string } | null;
};

type Filtros = {
  origem: string;
  destino: string;
  comprimento: string;
  cor: string;
  fornecedor: string;
  busca: string;
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatComprimento(m: number | undefined) {
  if (m === undefined) return "—";
  // 1 -> "1m", 1.2 -> "1,2m"
  return `${m.toString().replace(".", ",")}m`;
}

async function fetchCabos(): Promise<ProdutoRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("produtos")
    .select(
      "id, codigo, nome, preco_unitario, moq, embalagem_unidades, especificacoes, fornecedores(nome)",
    )
    .eq("categoria", "cabo")
    .order("preco_unitario", { ascending: true })
    .limit(1000);

  if (error) {
    throw new Error(`Falha ao buscar produtos: ${error.message}`);
  }

  // O select acima não tem tipos gerados (sem `supabase gen types` ainda),
  // então o retorno do PostgREST é convertido pro shape que a página espera.
  return (data ?? []) as unknown as ProdutoRow[];
}

/** Valores únicos (ordenados) presentes nos produtos, pra montar os selects de filtro. */
function opcoesDe(produtos: ProdutoRow[], campo: "conector_origem" | "conector_destino" | "comprimento_m") {
  const valores = new Set<string>();
  for (const produto of produtos) {
    const valor = produto.especificacoes?.[campo];
    if (valor !== undefined && valor !== null && valor !== "") {
      valores.add(String(valor));
    }
  }
  return [...valores].sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
}

function opcoesFornecedor(produtos: ProdutoRow[]) {
  const valores = new Set<string>();
  for (const produto of produtos) {
    if (produto.fornecedores?.nome) valores.add(produto.fornecedores.nome);
  }
  return [...valores].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function aplicaFiltros(produtos: ProdutoRow[], filtros: Filtros) {
  const busca = filtros.busca.trim().toLowerCase();

  return produtos.filter((produto) => {
    const spec = produto.especificacoes ?? {};

    if (filtros.origem && spec.conector_origem !== filtros.origem) return false;
    if (filtros.destino && spec.conector_destino !== filtros.destino) return false;
    if (filtros.comprimento && String(spec.comprimento_m) !== filtros.comprimento) return false;
    // "cor" pode ter mais de um valor no mesmo produto (ex: "Preto, Branco",
    // quando o código vem em mais de uma cor pelo mesmo preço) — por isso é
    // "contém", não igualdade exata.
    if (filtros.cor && !(spec.cor ?? "").includes(filtros.cor)) return false;
    if (filtros.fornecedor && produto.fornecedores?.nome !== filtros.fornecedor) return false;

    if (busca) {
      const alvo = [produto.nome, spec.amperagem, spec.material]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!alvo.includes(busca)) return false;
    }

    return true;
  });
}

export default async function ComparadorPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const filtros: Filtros = {
    origem: typeof params.origem === "string" ? params.origem : "",
    destino: typeof params.destino === "string" ? params.destino : "",
    comprimento: typeof params.comprimento === "string" ? params.comprimento : "",
    cor: typeof params.cor === "string" ? params.cor : "",
    fornecedor: typeof params.fornecedor === "string" ? params.fornecedor : "",
    busca: typeof params.busca === "string" ? params.busca : "",
  };

  const todosOsCabos = await fetchCabos();
  const resultado = aplicaFiltros(todosOsCabos, filtros);

  const origens = opcoesDe(todosOsCabos, "conector_origem");
  const destinos = opcoesDe(todosOsCabos, "conector_destino");
  const comprimentos = opcoesDe(todosOsCabos, "comprimento_m");
  const fornecedores = opcoesFornecedor(todosOsCabos);

  const menorPreco = resultado.length > 0 ? resultado[0].preco_unitario : null;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-6 sm:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Comparador de cabos</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Compare preço por peça entre fornecedores. Use os filtros pra achar cabos equivalentes —
          a equivalência é escolhida por você, não é automática.
        </p>
      </header>

      <form className="flex flex-wrap items-end gap-4 rounded-lg border border-black/10 p-4 dark:border-white/15">
        <Campo label="Conector de origem">
          <Select name="origem" valorAtual={filtros.origem} opcoes={origens} />
        </Campo>

        <Campo label="Conector de destino">
          <Select name="destino" valorAtual={filtros.destino} opcoes={destinos} />
        </Campo>

        <Campo label="Comprimento">
          <Select
            name="comprimento"
            valorAtual={filtros.comprimento}
            opcoes={comprimentos}
            formatarLabel={(v) => formatComprimento(Number(v))}
          />
        </Campo>

        <Campo label="Cor">
          <Select name="cor" valorAtual={filtros.cor} opcoes={[...CORES_FILTRO]} />
        </Campo>

        <Campo label="Fornecedor">
          <Select name="fornecedor" valorAtual={filtros.fornecedor} opcoes={fornecedores} />
        </Campo>

        <Campo label="Buscar (potência, material...)">
          <input
            type="text"
            name="busca"
            defaultValue={filtros.busca}
            placeholder="ex: PD, trançado, LED"
            className="h-9 rounded-md border border-black/15 bg-transparent px-3 text-sm dark:border-white/20"
          />
        </Campo>

        <div className="flex gap-2">
          <button
            type="submit"
            className="h-9 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white dark:bg-white dark:text-zinc-900"
          >
            Filtrar
          </button>
          <a
            href="/comparador"
            className="flex h-9 items-center rounded-md border border-black/15 px-4 text-sm dark:border-white/20"
          >
            Limpar
          </a>
        </div>
      </form>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {resultado.length} {resultado.length === 1 ? "cabo encontrado" : "cabos encontrados"}
        {todosOsCabos.length !== resultado.length ? ` de ${todosOsCabos.length} cadastrados` : ""}.
      </p>

      <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
        <table className="w-full min-w-[840px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-black/10 bg-black/[0.03] text-left dark:border-white/15 dark:bg-white/[0.04]">
              <Th>Fornecedor</Th>
              <Th>Código</Th>
              <Th>Conector</Th>
              <Th>Comprimento</Th>
              <Th>Cor</Th>
              <Th>Potência</Th>
              <Th>Material</Th>
              <Th align="right">Preço/peça</Th>
              <Th align="right">MOQ</Th>
            </tr>
          </thead>
          <tbody>
            {resultado.map((produto) => {
              const spec = produto.especificacoes ?? {};
              const ehMaisBarato = produto.preco_unitario === menorPreco;

              return (
                <tr
                  key={produto.id}
                  className={`border-b border-black/5 last:border-0 dark:border-white/10 ${
                    ehMaisBarato ? "bg-green-50 dark:bg-green-900/20" : ""
                  }`}
                >
                  <Td>{produto.fornecedores?.nome ?? "—"}</Td>
                  <Td className="font-mono text-xs">{produto.codigo ?? "—"}</Td>
                  <Td>
                    {spec.conector_origem ?? "—"} → {spec.conector_destino ?? "—"}
                  </Td>
                  <Td>{formatComprimento(spec.comprimento_m)}</Td>
                  <Td>{spec.cor ?? "—"}</Td>
                  <Td>{spec.amperagem ?? "—"}</Td>
                  <Td className="max-w-[220px] truncate" title={spec.material}>
                    {spec.material ?? "—"}
                  </Td>
                  <Td align="right" className={ehMaisBarato ? "font-semibold" : undefined}>
                    {currency.format(produto.preco_unitario)}
                    {ehMaisBarato ? " 🏆" : ""}
                  </Td>
                  <Td align="right">{produto.moq ?? "—"}</Td>
                </tr>
              );
            })}

            {resultado.length === 0 && (
              <tr>
                <td colSpan={9} className="p-6 text-center text-zinc-500 dark:text-zinc-400">
                  Nenhum cabo encontrado com esses filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
      {label}
      {children}
    </label>
  );
}

function Select({
  name,
  valorAtual,
  opcoes,
  formatarLabel,
}: {
  name: string;
  valorAtual: string;
  opcoes: string[];
  formatarLabel?: (valor: string) => string;
}) {
  return (
    <select
      name={name}
      defaultValue={valorAtual}
      className="h-9 rounded-md border border-black/15 bg-transparent px-2 text-sm dark:border-white/20"
    >
      <option value="">Todos</option>
      {opcoes.map((opcao) => (
        <option key={opcao} value={opcao}>
          {formatarLabel ? formatarLabel(opcao) : opcao}
        </option>
      ))}
    </select>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th className={`px-3 py-2 font-medium ${align === "right" ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
  className,
  title,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
  title?: string;
}) {
  return (
    <td
      title={title}
      className={`px-3 py-2 ${align === "right" ? "text-right" : "text-left"} ${className ?? ""}`}
    >
      {children}
    </td>
  );
}
