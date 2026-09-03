import { CLASSES_FONTES } from "@/lib/fonts";
import { TEMA_ESCURO } from "@/lib/theme";
import { CarrinhoClient } from "./CarrinhoClient";

export default function CarrinhoPage() {
  return (
    <div
      className={`${CLASSES_FONTES} min-h-screen w-full bg-[var(--background)]`}
      style={{ ...TEMA_ESCURO, fontFamily: "var(--font-body), ui-sans-serif, system-ui, sans-serif" }}
    >
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6 sm:p-8">
        <header className="flex flex-col gap-1">
          <p className="font-[family-name:var(--font-data-mono)] text-[11px] font-medium tracking-[0.14em] text-[var(--accent)] uppercase">
            Capi Atacado · Reposição de estoque
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl leading-[1.02] font-bold tracking-tight text-[var(--ink)]">
            Carrinho
          </h1>
          <p className="max-w-[62ch] text-[15px] text-[var(--ink-muted)]">
            Confira as quantidades, ajuste ou remova itens, e finalize — o pedido é separado por
            fornecedor na próxima tela.
          </p>
        </header>

        <CarrinhoClient />
      </main>
    </div>
  );
}
