"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  atualizarProdutoBenchmark,
  atualizarProdutosBenchmarkEmLote,
  excluirProdutoBenchmark,
  excluirProdutosBenchmarkEmLote,
} from "./actions";
import { AtualizarPrecosButton } from "./AtualizarPrecosButton";
import { dividirEspecificacoes, valoresDasColunas, type ColunaCategoria } from "@/lib/scraping/category-columns";

export type BenchmarkProdutoRow = {
  id: string;
  url_produto: string;
  nome: string | null;
  marca: string | null;
  codigo: string | null;
  preco: number | null;
  imagem_url: string | null;
  especificacoes: Record<string, string> | null;
};

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function formatEspecificacoes(spec: Record<string, string> | null): string {
  if (!spec) return "";
  return Object.entries(spec)
    .map(([label, value]) => `${label}: ${value}`)
    .join(" · ");
}

/** Mesmo formato "Rótulo: Valor" por linha usado no cadastro manual — pra editar sem precisar aprender outro formato. */
function especificacoesParaTexto(spec: Record<string, string> | null): string {
  if (!spec) return "";
  return Object.entries(spec)
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n");
}

type CampoTextoEdicao = "nome" | "codigo" | "marca" | "preco" | "especTexto";

type CamposEdicao = {
  nome: string;
  codigo: string;
  marca: string;
  preco: string;
  /** Valor por coluna dedicada (chave = `ColunaCategoria.chave`) — só usado quando o job tem categoria com colunas. */
  porColuna: Record<string, string>;
  /**
   * Sem colunas dedicadas: especificações inteiras, no formato "Rótulo: Valor".
   * Com colunas dedicadas: só o que "sobrou" (não bateu com nenhuma coluna) —
   * não aparece pra editar, mas é preservado ao salvar (ver `combinarEspecificacoesTexto`).
   */
  especTexto: string;
};

/** Monta o estado inicial de edição, separando `especificacoes` em colunas dedicadas (se a categoria tiver) + o resto. */
function camposIniciais(produto: BenchmarkProdutoRow, colunas: ColunaCategoria[] | null): CamposEdicao {
  const base = {
    nome: produto.nome ?? "",
    codigo: produto.codigo ?? "",
    marca: produto.marca ?? "",
    preco: produto.preco !== null ? String(produto.preco).replace(".", ",") : "",
  };

  if (!colunas) {
    return { ...base, porColuna: {}, especTexto: especificacoesParaTexto(produto.especificacoes) };
  }

  const { porColuna: valoresPorColuna, resto } = dividirEspecificacoes(produto.especificacoes, colunas);
  const porColuna: Record<string, string> = {};
  colunas.forEach((coluna, indice) => {
    porColuna[coluna.chave] = valoresPorColuna[indice] ?? "";
  });

  return { ...base, porColuna, especTexto: especificacoesParaTexto(resto) };
}

/** Reconstrói o texto "Rótulo: Valor" (formato que a action já entende) a partir das colunas dedicadas + o resto preservado. */
function combinarEspecificacoesTexto(
  porColuna: Record<string, string>,
  colunas: ColunaCategoria[] | null,
  especTextoResto: string,
): string {
  const linhasColunas = colunas
    ? colunas
        .map((coluna) => {
          const valor = (porColuna[coluna.chave] ?? "").trim();
          return valor ? `${coluna.chave}: ${valor}` : null;
        })
        .filter((linha): linha is string => linha !== null)
    : [];

  return [...linhasColunas, especTextoResto.trim()].filter(Boolean).join("\n");
}

/**
 * Tabela de produtos importados. Tem 2 jeitos de corrigir o que o scraping
 * (ou o cadastro manual) trouxe errado: editar 1 linha por vez (✏️ na linha),
 * ou "Editar tabela" no topo pra abrir todas as linhas de uma vez e salvar
 * tudo junto — útil depois de uma importação grande com vários erros espalhados.
 */
export function ProdutosTable({
  produtos,
  jobTipo,
  colunas,
}: {
  produtos: BenchmarkProdutoRow[];
  /** Job "manual" não tem página real pra rebuscar preço — some o botão "Atualizar preços" nesse caso. */
  jobTipo: "produto" | "categoria" | "manual" | null;
  /** Colunas dedicadas da categoria do job (resolvidas em page.tsx a partir dos campos cadastrados em /configuracoes) — `null`/vazio cai na coluna genérica "Especificações". */
  colunas: ColunaCategoria[] | null;
}) {
  // Categoria com 0 campos cadastrados se comporta como "sem colunas dedicadas" (cai no fallback genérico).
  const colunasEfetivas = colunas && colunas.length > 0 ? colunas : null;
  const numeroColunasEspecificacoes = colunasEfetivas?.length ?? 1;

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [modoEdicaoTotal, setModoEdicaoTotal] = useState(false);
  const [edicoes, setEdicoes] = useState<Record<string, CamposEdicao>>({});
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [erroTudo, setErroTudo] = useState<string | null>(null);
  const [salvandoTudo, startTransitionTudo] = useTransition();
  const [excluindoSelecionados, startTransitionExcluir] = useTransition();
  const router = useRouter();

  function iniciarEdicaoTotal() {
    const inicial: Record<string, CamposEdicao> = {};
    for (const produto of produtos) inicial[produto.id] = camposIniciais(produto, colunasEfetivas);
    setEdicoes(inicial);
    setSelecionados(new Set());
    setErroTudo(null);
    setEditandoId(null);
    setModoEdicaoTotal(true);
  }

  function cancelarEdicaoTotal() {
    setModoEdicaoTotal(false);
    setEdicoes({});
    setSelecionados(new Set());
    setErroTudo(null);
  }

  function atualizarCampo(produtoId: string, campo: CampoTextoEdicao, valor: string) {
    setEdicoes((atual) => ({ ...atual, [produtoId]: { ...atual[produtoId], [campo]: valor } }));
  }

  function atualizarCampoColuna(produtoId: string, chaveColuna: string, valor: string) {
    setEdicoes((atual) => ({
      ...atual,
      [produtoId]: { ...atual[produtoId], porColuna: { ...atual[produtoId].porColuna, [chaveColuna]: valor } },
    }));
  }

  function alternarSelecionado(produtoId: string) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(produtoId)) novo.delete(produtoId);
      else novo.add(produtoId);
      return novo;
    });
  }

  function alternarSelecionarTodos() {
    setSelecionados((atual) => (atual.size === produtos.length ? new Set() : new Set(produtos.map((p) => p.id))));
  }

  function excluirSelecionados() {
    if (selecionados.size === 0) return;
    if (!confirm(`Excluir ${selecionados.size} produto(s) selecionado(s)? Não dá pra desfazer.`)) return;

    const idsParaExcluir = [...selecionados];
    startTransitionExcluir(async () => {
      await excluirProdutosBenchmarkEmLote(idsParaExcluir);
      setSelecionados(new Set());
      setEdicoes((atual) => {
        const novo = { ...atual };
        for (const id of idsParaExcluir) delete novo[id];
        return novo;
      });
      router.refresh();
    });
  }

  function salvarTudo() {
    setErroTudo(null);
    startTransitionTudo(async () => {
      const itens = produtos.map((produto) => {
        const campos = edicoes[produto.id] ?? camposIniciais(produto, colunasEfetivas);
        return {
          produtoId: produto.id,
          nome: campos.nome,
          codigo: campos.codigo,
          marca: campos.marca,
          preco: campos.preco,
          especificacoesTexto: combinarEspecificacoesTexto(campos.porColuna, colunasEfetivas, campos.especTexto),
        };
      });

      const resultado = await atualizarProdutosBenchmarkEmLote(itens);
      router.refresh();

      if (resultado.erros.length > 0) {
        setErroTudo(
          `${resultado.totalSalvo} produto(s) salvos. ${resultado.erros.length} falharam — corrija e clique em "Salvar tudo" de novo.`,
        );
      } else {
        setModoEdicaoTotal(false);
        setEdicoes({});
        setSelecionados(new Set());
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {modoEdicaoTotal ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={salvarTudo}
              disabled={salvandoTudo}
              className="h-8 rounded-md bg-[var(--accent)] px-3 text-[12.5px] font-semibold text-[var(--accent-ink)] disabled:opacity-60"
            >
              {salvandoTudo ? "Salvando…" : "Salvar tudo"}
            </button>
            <button
              type="button"
              onClick={cancelarEdicaoTotal}
              disabled={salvandoTudo}
              className="h-8 rounded-md border border-[var(--border)] px-3 text-[12.5px] font-medium text-[var(--ink-muted)] disabled:opacity-60"
            >
              Cancelar
            </button>
            {selecionados.size > 0 && (
              <button
                type="button"
                onClick={excluirSelecionados}
                disabled={excluindoSelecionados}
                className="h-8 rounded-md border border-[var(--bad-border)] bg-[var(--bad-bg)] px-3 text-[12.5px] font-medium text-[var(--bad)] disabled:opacity-60"
              >
                {excluindoSelecionados ? "Excluindo…" : `🗑️ Excluir selecionados (${selecionados.size})`}
              </button>
            )}
            {erroTudo && <p className="text-[12px] text-[var(--bad)]">{erroTudo}</p>}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={iniciarEdicaoTotal}
              disabled={produtos.length === 0}
              className="h-8 rounded-md border border-[var(--border)] px-3 text-[12.5px] font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] disabled:opacity-50"
            >
              ✏️ Editar tabela
            </button>
            {jobTipo !== "manual" && <AtualizarPrecosButton produtoIds={produtos.map((produto) => produto.id)} />}
          </div>
        )}
      </div>

      <div className="max-h-[65vh] overflow-auto rounded-[10px] border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full min-w-[960px] border-collapse text-[13.5px]">
          <thead>
            <tr>
              {modoEdicaoTotal && (
                <Th>
                  <input
                    type="checkbox"
                    checked={produtos.length > 0 && selecionados.size === produtos.length}
                    onChange={alternarSelecionarTodos}
                    aria-label="Selecionar todos os produtos"
                  />
                </Th>
              )}
              <Th>Produto</Th>
              <Th>Código</Th>
              <Th>Marca</Th>
              <Th align="right">Preço</Th>
              {colunasEfetivas ? (
                colunasEfetivas.map((coluna) => <Th key={coluna.chave}>{coluna.rotulo}</Th>)
              ) : (
                <Th>Especificações</Th>
              )}
              <Th align="right"> </Th>
            </tr>
          </thead>
          <tbody>
            {produtos.map((produto) =>
              modoEdicaoTotal ? (
                <LinhaEdicaoEmLote
                  key={produto.id}
                  url={produto.url_produto}
                  colunas={colunasEfetivas}
                  valores={edicoes[produto.id] ?? camposIniciais(produto, colunasEfetivas)}
                  onChange={(campo, valor) => atualizarCampo(produto.id, campo, valor)}
                  onChangeColuna={(chave, valor) => atualizarCampoColuna(produto.id, chave, valor)}
                  selecionado={selecionados.has(produto.id)}
                  onToggleSelecionado={() => alternarSelecionado(produto.id)}
                />
              ) : editandoId === produto.id ? (
                <LinhaEdicao
                  key={produto.id}
                  produto={produto}
                  colunas={colunasEfetivas}
                  onCancelar={() => setEditandoId(null)}
                />
              ) : (
                <LinhaVisualizacao
                  key={produto.id}
                  produto={produto}
                  colunas={colunasEfetivas}
                  onEditar={() => setEditandoId(produto.id)}
                />
              ),
            )}

            {produtos.length === 0 && (
              <tr>
                <td
                  colSpan={(modoEdicaoTotal ? 1 : 0) + 4 + numeroColunasEspecificacoes + 1}
                  className="p-10 text-center text-[var(--ink-muted)]"
                >
                  Nenhum produto foi importado nesse job.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LinhaVisualizacao({
  produto,
  colunas,
  onEditar,
}: {
  produto: BenchmarkProdutoRow;
  colunas: ColunaCategoria[] | null;
  onEditar: () => void;
}) {
  const [excluindo, startTransition] = useTransition();
  const router = useRouter();

  function excluir() {
    if (!confirm(`Excluir "${produto.nome ?? "esse produto"}" da lista?`)) return;
    startTransition(async () => {
      await excluirProdutoBenchmark(produto.id);
      router.refresh();
    });
  }

  return (
    <tr className="border-b border-[var(--border)]/60 last:border-0 hover:bg-[var(--surface-alt)]">
      <Td>
        <a
          href={produto.url_produto}
          target="_blank"
          rel="noreferrer noopener"
          className="text-[var(--ink)] underline decoration-[var(--border)] underline-offset-2 hover:text-[var(--accent)]"
        >
          {produto.nome ?? "(sem nome)"}
        </a>
      </Td>
      <Td className="font-[family-name:var(--font-data-mono)] text-xs text-[var(--ink-muted)]">
        {produto.codigo ?? "—"}
      </Td>
      <Td>{produto.marca ?? "—"}</Td>
      <Td align="right" className="font-[family-name:var(--font-data-mono)]">
        {produto.preco !== null ? currency.format(produto.preco) : "—"}
      </Td>
      {colunas ? (
        valoresDasColunas(produto.especificacoes, colunas).map((valor, indice) => (
          <Td key={colunas[indice].chave} className="text-[var(--ink-muted)]">
            {valor ?? "—"}
          </Td>
        ))
      ) : (
        <Td
          className="max-w-[320px] truncate text-[var(--ink-muted)]"
          title={formatEspecificacoes(produto.especificacoes)}
        >
          {formatEspecificacoes(produto.especificacoes) || "—"}
        </Td>
      )}
      <Td align="right">
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={onEditar}
            aria-label="Editar produto"
            title="Editar produto"
            className="rounded-md p-1.5 text-[var(--ink-muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--accent)]"
          >
            ✏️
          </button>
          <button
            type="button"
            onClick={excluir}
            disabled={excluindo}
            aria-label="Excluir produto"
            title="Excluir produto"
            className="rounded-md p-1.5 text-[var(--ink-muted)] hover:bg-[var(--bad-bg)] hover:text-[var(--bad)] disabled:opacity-50"
          >
            🗑️
          </button>
        </div>
      </Td>
    </tr>
  );
}

const CAMPO_CLASS =
  "h-8 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 font-[family-name:var(--font-body)] text-[13px] text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]";

/** As colunas dedicadas (Cor, Comprimento…) ou, sem categoria com campos, o textarea genérico "Rótulo: Valor" — usado tanto na edição de 1 linha quanto na em lote. */
function CelulasDeEspecificacoes({
  colunas,
  porColuna,
  onChangeColuna,
  especTexto,
  onChangeEspecTexto,
}: {
  colunas: ColunaCategoria[] | null;
  porColuna: Record<string, string>;
  onChangeColuna: (chave: string, valor: string) => void;
  especTexto: string;
  onChangeEspecTexto: (valor: string) => void;
}) {
  if (colunas) {
    return (
      <>
        {colunas.map((coluna) => (
          <td key={coluna.chave} className="px-3.5 py-2.5">
            <input
              value={porColuna[coluna.chave] ?? ""}
              onChange={(e) => onChangeColuna(coluna.chave, e.target.value)}
              className={CAMPO_CLASS}
            />
          </td>
        ))}
      </>
    );
  }

  return (
    <td className="px-3.5 py-2.5">
      <textarea
        rows={2}
        value={especTexto}
        onChange={(e) => onChangeEspecTexto(e.target.value)}
        placeholder={"Rótulo: Valor"}
        className={`${CAMPO_CLASS} h-auto resize-y py-1.5`}
      />
    </td>
  );
}

function LinhaEdicao({
  produto,
  colunas,
  onCancelar,
}: {
  produto: BenchmarkProdutoRow;
  colunas: ColunaCategoria[] | null;
  onCancelar: () => void;
}) {
  const camposIniciaisProduto = camposIniciais(produto, colunas);
  const [nome, setNome] = useState(camposIniciaisProduto.nome);
  const [codigo, setCodigo] = useState(camposIniciaisProduto.codigo);
  const [marca, setMarca] = useState(camposIniciaisProduto.marca);
  const [preco, setPreco] = useState(camposIniciaisProduto.preco);
  const [porColuna, setPorColuna] = useState(camposIniciaisProduto.porColuna);
  const [especTexto, setEspecTexto] = useState(camposIniciaisProduto.especTexto);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function atualizarColuna(chave: string, valor: string) {
    setPorColuna((atual) => ({ ...atual, [chave]: valor }));
  }

  function salvar() {
    setErro(null);
    startTransition(async () => {
      try {
        await atualizarProdutoBenchmark({
          produtoId: produto.id,
          nome,
          codigo,
          marca,
          preco,
          especificacoesTexto: combinarEspecificacoesTexto(porColuna, colunas, especTexto),
        });
        router.refresh();
        onCancelar(); // fecha o modo de edição — os dados novos vêm do refresh
      } catch (err) {
        setErro(err instanceof Error ? err.message : "Falha ao salvar.");
      }
    });
  }

  return (
    <tr className="border-b border-[var(--border)]/60 bg-[var(--surface-alt)] align-top last:border-0">
      <td className="px-3.5 py-2.5">
        <input value={nome} onChange={(e) => setNome(e.target.value)} className={CAMPO_CLASS} />
      </td>
      <td className="px-3.5 py-2.5">
        <input value={codigo} onChange={(e) => setCodigo(e.target.value)} className={CAMPO_CLASS} />
      </td>
      <td className="px-3.5 py-2.5">
        <input value={marca} onChange={(e) => setMarca(e.target.value)} className={CAMPO_CLASS} />
      </td>
      <td className="px-3.5 py-2.5">
        <input
          value={preco}
          onChange={(e) => setPreco(e.target.value)}
          placeholder="9,90"
          className={`${CAMPO_CLASS} text-right tabular-nums`}
        />
      </td>
      <CelulasDeEspecificacoes
        colunas={colunas}
        porColuna={porColuna}
        onChangeColuna={atualizarColuna}
        especTexto={especTexto}
        onChangeEspecTexto={setEspecTexto}
      />
      <td className="px-3.5 py-2.5">
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={salvar}
            disabled={pending}
            className="rounded-md bg-[var(--accent)] px-2 py-1 text-[11px] font-semibold whitespace-nowrap text-[var(--accent-ink)] disabled:opacity-60"
          >
            {pending ? "Salvando…" : "Salvar"}
          </button>
          <button
            type="button"
            onClick={onCancelar}
            disabled={pending}
            className="rounded-md border border-[var(--border)] px-2 py-1 text-[11px] whitespace-nowrap text-[var(--ink-muted)]"
          >
            Cancelar
          </button>
        </div>
        {erro && <p className="mt-1 max-w-[140px] text-[10.5px] text-[var(--bad)]">{erro}</p>}
      </td>
    </tr>
  );
}

/**
 * Mesma linha de campos da edição individual, mas sem Salvar/Cancelar
 * próprios — o estado vive no `ProdutosTable` (modo "Editar tabela") e é
 * salvo tudo junto. Tem também a checkbox de seleção pra exclusão em lote.
 */
function LinhaEdicaoEmLote({
  url,
  colunas,
  valores,
  onChange,
  onChangeColuna,
  selecionado,
  onToggleSelecionado,
}: {
  url: string;
  colunas: ColunaCategoria[] | null;
  valores: CamposEdicao;
  onChange: (campo: CampoTextoEdicao, valor: string) => void;
  onChangeColuna: (chave: string, valor: string) => void;
  selecionado: boolean;
  onToggleSelecionado: () => void;
}) {
  return (
    <tr
      className={`border-b border-[var(--border)]/60 align-top last:border-0 ${
        selecionado ? "bg-[var(--accent)]/10" : "bg-[var(--surface-alt)]"
      }`}
    >
      <td className="px-3.5 py-2.5">
        <input
          type="checkbox"
          checked={selecionado}
          onChange={onToggleSelecionado}
          aria-label="Selecionar produto"
        />
      </td>
      <td className="px-3.5 py-2.5">
        <input value={valores.nome} onChange={(e) => onChange("nome", e.target.value)} className={CAMPO_CLASS} />
      </td>
      <td className="px-3.5 py-2.5">
        <input value={valores.codigo} onChange={(e) => onChange("codigo", e.target.value)} className={CAMPO_CLASS} />
      </td>
      <td className="px-3.5 py-2.5">
        <input value={valores.marca} onChange={(e) => onChange("marca", e.target.value)} className={CAMPO_CLASS} />
      </td>
      <td className="px-3.5 py-2.5">
        <input
          value={valores.preco}
          onChange={(e) => onChange("preco", e.target.value)}
          placeholder="9,90"
          className={`${CAMPO_CLASS} text-right tabular-nums`}
        />
      </td>
      <CelulasDeEspecificacoes
        colunas={colunas}
        porColuna={valores.porColuna}
        onChangeColuna={onChangeColuna}
        especTexto={valores.especTexto}
        onChangeEspecTexto={(valor) => onChange("especTexto", valor)}
      />
      <td className="px-3.5 py-2.5 text-right">
        <a
          href={url}
          target="_blank"
          rel="noreferrer noopener"
          aria-label="Abrir produto original"
          title="Abrir produto original"
          className="inline-block rounded-md p-1.5 text-[var(--ink-muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--accent)]"
        >
          🔗
        </a>
      </td>
    </tr>
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
