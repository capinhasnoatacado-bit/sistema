import { Barlow_Condensed, IBM_Plex_Mono, Public_Sans } from "next/font/google";
import { createClient } from "@/lib/supabase/server";

// searchParams é request-time (não dá pra pré-renderizar essa página).
export const dynamic = "force-dynamic";

const display = Barlow_Condensed({
  variable: "--font-display",
  weight: ["600", "700"],
  subsets: ["latin"],
});
const mono = IBM_Plex_Mono({
  variable: "--font-data-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});
const body = Public_Sans({
  variable: "--font-body",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

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

/** Uma cor de tag por fornecedor, pra escanear a coluna rápido. Cai num
 * neutro se aparecer um fornecedor novo que ainda não tem cor definida. */
const TAG_FORNECEDOR: Record<string, string> = {
  KAID: "bg-[var(--tag-kaid-bg)] border-[var(--tag-kaid-border)] text-[var(--tag-kaid-ink)]",
  AGOLD: "bg-[var(--tag-agold-bg)] border-[var(--tag-agold-border)] text-[var(--tag-agold-ink)]",
  HREBOS: "bg-[var(--tag-hrebos-bg)] border-[var(--tag-hrebos-border)] text-[var(--tag-hrebos-ink)]",
};
const TAG_FORNECEDOR_PADRAO = "bg-[var(--surface-alt)] border-[var(--border)] text-[var(--ink-muted)]";

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
  const precos = todosOsCabos.map((p) => p.preco_unitario);
  const stats = [
    { label: "Cabos cadastrados", value: String(todosOsCabos.length) },
    { label: "Fornecedores", value: String(fornecedores.length) },
    { label: "Menor preço", value: precos.length ? currency.format(Math.min(...precos)) : "—" },
    { label: "Maior preço", value: precos.length ? currency.format(Math.max(...precos)) : "—" },
  ];

  return (
    <main
      className={`${display.variable} ${mono.variable} ${body.variable} mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 bg-[var(--background)] p-6 sm:p-8`}
      style={{ fontFamily: "var(--font-body), ui-sans-serif, system-ui, sans-serif" }}
    >
      <header className="flex flex-col gap-1">
        <p className="font-[family-name:var(--font-data-mono)] text-[11px] font-medium tracking-[0.14em] text-[var(--accent)] uppercase">
          Capi Atacado · Reposição de estoque
        </p>
        <h1 className="text-balance font-[family-name:var(--font-display)] text-4xl leading-[1.02] font-bold tracking-tight text-[var(--ink)]">
          Comparador de Cabos
        </h1>
        <p className="max-w-[62ch] text-[15px] text-[var(--ink-muted)]">
          Mesmo cabo, fornecedor diferente, preço diferente. Filtre por conector, comprimento, cor
          e fornecedor pra achar o mais barato — sempre em preço por peça. A equivalência é
          escolhida por você, não é automática.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--border)] sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col gap-1 bg-[var(--surface)] px-4 py-3.5">
            <span className="font-[family-name:var(--font-data-mono)] text-[10.5px] tracking-[0.08em] text-[var(--ink-muted)] uppercase">
              {s.label}
            </span>
            <span className="font-[family-name:var(--font-display)] text-[26px] font-bold tabular-nums text-[var(--ink)]">
              {s.value}
            </span>
          </div>
        ))}
      </div>

      <form className="flex flex-wrap items-end gap-4 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-4">
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

        <Campo label="Buscar (potência, material...)" className="flex-1">
          <input
            type="text"
            name="busca"
            defaultValue={filtros.busca}
            placeholder="ex: PD, trançado, LED"
            className="h-9 min-w-[220px] rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-[13.5px] text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
          />
        </Campo>

        <div className="flex gap-2">
          <button
            type="submit"
            className="h-9 rounded-md bg-[var(--accent)] px-4 text-[13px] font-semibold text-[var(--accent-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            Filtrar
          </button>
          <a
            href="/comparador"
            className="flex h-9 items-center rounded-md border border-[var(--border)] px-4 text-[13px] font-medium text-[var(--ink-muted)] hover:text-[var(--ink)]"
          >
            Limpar
          </a>
        </div>
      </form>

      <p className="text-[13px] text-[var(--ink-muted)]">
        <strong className="tabular-nums text-[var(--ink)]">{resultado.length}</strong>{" "}
        {resultado.length === 1 ? "cabo encontrado" : "cabos encontrados"}
        {todosOsCabos.length !== resultado.length ? (
          <>
            {" "}
            de <strong className="tabular-nums text-[var(--ink)]">{todosOsCabos.length}</strong>{" "}
            cadastrados
          </>
        ) : null}
        .
      </p>

      <div className="max-h-[72vh] overflow-auto rounded-[10px] border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full min-w-[900px] border-collapse text-[13.5px]">
          <thead>
            <tr>
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
              const nomeFornecedor = produto.fornecedores?.nome ?? "";

              return (
                <tr
                  key={produto.id}
                  className={`border-b border-[var(--border)]/60 last:border-0 hover:bg-[var(--surface-alt)] ${
                    ehMaisBarato ? "bg-[var(--good-bg)] hover:bg-[var(--good-bg)]" : ""
                  }`}
                >
                  <Td>
                    <span
                      className={`inline-flex h-[22px] items-center rounded-full border px-2.5 text-[11.5px] font-semibold whitespace-nowrap ${
                        TAG_FORNECEDOR[nomeFornecedor] ?? TAG_FORNECEDOR_PADRAO
                      }`}
                    >
                      {nomeFornecedor || "—"}
                    </span>
                  </Td>
                  <Td className="font-[family-name:var(--font-data-mono)] text-xs text-[var(--ink-muted)]">
                    {produto.codigo ?? "—"}
                  </Td>
                  <Td>
                    {spec.conector_origem ?? "—"} → {spec.conector_destino ?? "—"}
                  </Td>
                  <Td>{formatComprimento(spec.comprimento_m)}</Td>
                  <Td>{spec.cor ?? "—"}</Td>
                  <Td>{spec.amperagem ?? "—"}</Td>
                  <Td className="max-w-[220px] truncate text-[var(--ink-muted)]" title={spec.material}>
                    {spec.material ?? "—"}
                  </Td>
                  <Td
                    align="right"
                    className={`font-[family-name:var(--font-data-mono)] ${
                      ehMaisBarato ? "font-semibold text-[var(--good)]" : ""
                    }`}
                  >
                    {currency.format(produto.preco_unitario)}
                    {ehMaisBarato ? " 🏆" : ""}
                  </Td>
                  <Td align="right">{produto.moq ?? "—"}</Td>
                </tr>
              );
            })}

            {resultado.length === 0 && (
              <tr>
                <td colSpan={9} className="p-10 text-center text-[var(--ink-muted)]">
                  Nenhum cabo encontrado com esses filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <footer className="pt-1 text-center text-xs text-[var(--ink-muted)]">
        {todosOsCabos.length} cabos cadastrados — {fornecedores.join(" · ")}
      </footer>
    </main>
  );
}

function Campo({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label
      className={`flex flex-col gap-1.5 font-[family-name:var(--font-data-mono)] text-[10.5px] font-medium tracking-[0.06em] text-[var(--ink-muted)] uppercase ${className ?? ""}`}
    >
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
      className="h-9 min-w-[150px] rounded-md border border-[var(--border)] bg-[var(--background)] px-2 font-[family-name:var(--font-body)] text-[13.5px] font-normal tracking-normal text-[var(--ink)] normal-case focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
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
    <th
      className={`sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface-alt)] px-3.5 py-2.5 font-[family-name:var(--font-data-mono)] text-[10.5px] font-medium tracking-[0.06em] whitespace-nowrap text-[var(--ink-muted)] uppercase ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
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
      className={`px-3.5 py-2.5 text-[var(--ink)] ${align === "right" ? "text-right tabular-nums" : "text-left"} ${className ?? ""}`}
    >
      {children}
    </td>
  );
}
