import { createClient } from "@/lib/supabase/server";
import { CartBadge } from "@/components/CartBadge";
import { AddToCartButton } from "./AddToCartButton";
import { CLASSES_FONTES } from "@/lib/fonts";
import { TEMA_ESCURO, TAG_FORNECEDOR, TAG_FORNECEDOR_PADRAO } from "@/lib/theme";
import { normalizarChave } from "@/lib/scraping/category-columns";

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

// Margem de lucro alvo SOBRE O PREÇO DE VENDA (não markup sobre o custo) —
// margem = (venda - compra) / venda. Isolando venda: venda = compra / (1 - margem).
// Ex: comprou por 3, margem 30% -> venda = 3 / 0,70 = 4,29 (confere:
// (4,29 - 3) / 4,29 ≈ 30%, não os 43% que markup direto (compra * 1,30) daria).
const MARGEM_LUCRO_ALVO = 0.3;

function precoDeVendaSugerido(precoCompra: number): number {
  return precoCompra / (1 - MARGEM_LUCRO_ALVO);
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

type ConcorrenteMatch = {
  precoUnitario: number;
  siteOrigem: string | null;
  urlProduto: string;
};

/** Produto de concorrente (benchmark) com preço preenchido — sem preço não ajuda a decidir, então já filtrado no fetch. */
type BenchmarkProdutoParaMatch = {
  codigo: string | null;
  preco: number;
  especificacoes: Record<string, string> | null;
  url_produto: string;
  benchmark_jobs: { site_origem: string | null } | null;
};

async function fetchConcorrentes(): Promise<BenchmarkProdutoParaMatch[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("benchmark_produtos")
    .select("codigo, preco, especificacoes, url_produto, benchmark_jobs(site_origem)")
    .not("preco", "is", null)
    .limit(2000);

  if (error) {
    throw new Error(`Falha ao buscar produtos de concorrentes: ${error.message}`);
  }

  return (data ?? []) as unknown as BenchmarkProdutoParaMatch[];
}

function valorNumerico(texto: string): number | null {
  const encontrado = texto.replace(",", ".").match(/[\d.]+/);
  return encontrado ? Number.parseFloat(encontrado[0]) : null;
}

/** Comparação tolerante a espaço/maiúscula e a número-com-unidade (ex: "1" bate com "1m", "1 metro"). */
function valoresBatem(valorProduto: string, valorConcorrente: string): boolean {
  const a = valorProduto.trim().toLowerCase();
  const b = valorConcorrente.trim().toLowerCase();
  if (a === b) return true;

  const numeroA = valorNumerico(a);
  const numeroB = valorNumerico(b);
  return numeroA !== null && numeroB !== null && numeroA === numeroB;
}

/**
 * Bate quando TODA especificação que o produto tem (conector, comprimento,
 * amperagem, material, cor) encontra um valor equivalente no concorrente —
 * comparando a chave normalizada (ver `normalizarChave`, que já trata
 * "conector_origem" e "Conector origem" como a mesma coisa) e o valor com
 * `valoresBatem`. Produto sem nenhuma especificação preenchida nunca bate
 * por aqui (evita "combinar" só por acaso os dois estarem vazios).
 */
function especificacoesBatem(produtoEspec: Especificacoes | null, concorrenteEspec: Record<string, string> | null): boolean {
  if (!produtoEspec || !concorrenteEspec) return false;

  const entradasProduto = Object.entries(produtoEspec).filter(
    ([, valor]) => valor !== undefined && valor !== null && valor !== "",
  );
  if (entradasProduto.length === 0) return false;

  const concorrentePorChaveNormalizada = new Map<string, string>();
  for (const [label, valor] of Object.entries(concorrenteEspec)) {
    concorrentePorChaveNormalizada.set(normalizarChave(label), valor);
  }

  return entradasProduto.every(([chave, valor]) => {
    const valorConcorrente = concorrentePorChaveNormalizada.get(normalizarChave(chave));
    return valorConcorrente !== undefined && valoresBatem(String(valor), valorConcorrente);
  });
}

/** Mesmo produto quando o código bate (raro — cada loja usa o código dela) ou quando todas as especificações batem. */
function produtoBateComConcorrente(produto: ProdutoRow, concorrente: BenchmarkProdutoParaMatch): boolean {
  if (produto.codigo && concorrente.codigo && produto.codigo.trim().toLowerCase() === concorrente.codigo.trim().toLowerCase()) {
    return true;
  }
  return especificacoesBatem(produto.especificacoes, concorrente.especificacoes);
}

/** Concorrentes equivalentes a esse produto, do mais barato pro mais caro. */
function concorrentesDoProduto(produto: ProdutoRow, todosOsConcorrentes: BenchmarkProdutoParaMatch[]): ConcorrenteMatch[] {
  return todosOsConcorrentes
    .filter((concorrente) => produtoBateComConcorrente(produto, concorrente))
    .map((concorrente) => ({
      precoUnitario: concorrente.preco,
      siteOrigem: concorrente.benchmark_jobs?.site_origem ?? null,
      urlProduto: concorrente.url_produto,
    }))
    .sort((a, b) => a.precoUnitario - b.precoUnitario);
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
  const todosOsConcorrentes = await fetchConcorrentes();
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
    <div
      className={`${CLASSES_FONTES} min-h-screen w-full bg-[var(--background)]`}
      style={{ ...TEMA_ESCURO, fontFamily: "var(--font-body), ui-sans-serif, system-ui, sans-serif" }}
    >
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-6 sm:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="font-[family-name:var(--font-data-mono)] text-[11px] font-medium tracking-[0.14em] text-[var(--accent)] uppercase">
            Capi Atacado · Reposição de estoque
          </p>
          <h1 className="text-balance font-[family-name:var(--font-display)] text-4xl leading-[1.02] font-bold tracking-tight text-[var(--ink)]">
            Comparador de Cabos
          </h1>
          <p className="max-w-[62ch] text-[15px] text-[var(--ink-muted)]">
            Mesmo cabo, fornecedor diferente, preço diferente. Filtre por conector, comprimento, cor
            e fornecedor pra achar o mais barato — sempre em preço por peça. A equivalência entre
            fornecedores é escolhida por você, não é automática. A coluna &ldquo;Concorrentes&rdquo; já é
            automática: cruza com o que foi importado em <code className="font-[family-name:var(--font-data-mono)]">/benchmark</code> por
            código ou por especificação equivalente.
          </p>
        </div>
        <CartBadge />
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
              <Th align="right">Venda (30%)</Th>
              <Th>Concorrentes</Th>
              <Th align="right">MOQ</Th>
              <Th align="right">Pedido</Th>
            </tr>
          </thead>
          <tbody>
            {resultado.map((produto) => {
              const spec = produto.especificacoes ?? {};
              const ehMaisBarato = produto.preco_unitario === menorPreco;
              const nomeFornecedor = produto.fornecedores?.nome ?? "";
              const concorrentes = concorrentesDoProduto(produto, todosOsConcorrentes);

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
                  <Td align="right" className="font-[family-name:var(--font-data-mono)] text-[var(--ink-muted)]">
                    {currency.format(precoDeVendaSugerido(produto.preco_unitario))}
                  </Td>
                  <Td className="max-w-[280px] text-[var(--ink-muted)]">
                    {concorrentes.length > 0 ? (
                      <span className="flex flex-wrap gap-x-2 gap-y-0.5">
                        {concorrentes.map((concorrente, indice) => (
                          <a
                            key={indice}
                            href={concorrente.urlProduto}
                            target="_blank"
                            rel="noreferrer noopener"
                            title={concorrente.siteOrigem ?? concorrente.urlProduto}
                            className={`font-[family-name:var(--font-data-mono)] whitespace-nowrap underline decoration-[var(--border)] underline-offset-2 hover:text-[var(--accent)] ${
                              concorrente.precoUnitario < produto.preco_unitario
                                ? "font-semibold text-[var(--bad)]"
                                : ""
                            }`}
                          >
                            {currency.format(concorrente.precoUnitario)} ({concorrente.siteOrigem ?? "concorrente"})
                          </a>
                        ))}
                      </span>
                    ) : (
                      "—"
                    )}
                  </Td>
                  <Td align="right">{produto.moq ?? "—"}</Td>
                  <Td align="right">
                    <AddToCartButton
                      produtoId={produto.id}
                      codigo={produto.codigo}
                      nome={produto.nome}
                      fornecedor={nomeFornecedor}
                      precoUnitario={produto.preco_unitario}
                      moq={produto.moq}
                    />
                  </Td>
                </tr>
              );
            })}

            {resultado.length === 0 && (
              <tr>
                <td colSpan={12} className="p-10 text-center text-[var(--ink-muted)]">
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
    </div>
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
