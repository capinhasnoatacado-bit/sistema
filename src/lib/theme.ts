import type { CSSProperties } from "react";

/** As telas do comparador/carrinho/pedido ficam sempre no tema escuro,
 * independente da preferência do sistema — pedido explícito do usuário,
 * não segue o padrão claro/escuro automático do resto do app. Mesmos
 * valores que estão em globals.css (bloco @media prefers-color-scheme:
 * dark), só que forçados via variável CSS inline. */
export const TEMA_ESCURO: CSSProperties = {
  "--background": "#0a0a0a",
  "--surface": "#221a10",
  "--surface-alt": "#2c2115",
  "--border": "#453423",
  "--ink": "#f3e9d9",
  "--ink-muted": "#b5a58c",
  "--accent": "#e18f4e",
  "--accent-ink": "#1a140d",
  "--good": "#7bc98b",
  "--good-bg": "#24352a",
  "--good-border": "#3c5a44",
  "--bad": "#e08585",
  "--bad-bg": "#3a2020",
  "--bad-border": "#5c3535",
  "--tag-kaid-bg": "#253044",
  "--tag-kaid-border": "#3c4e6c",
  "--tag-kaid-ink": "#b9cbe8",
  "--tag-agold-bg": "#3a2f16",
  "--tag-agold-border": "#5c4a20",
  "--tag-agold-ink": "#edc978",
  "--tag-hrebos-bg": "#33253a",
  "--tag-hrebos-border": "#543a5c",
  "--tag-hrebos-ink": "#dcb6e0",
} as CSSProperties;

/** Uma cor de tag por fornecedor, pra escanear listas rápido. Cai num
 * neutro se aparecer um fornecedor novo que ainda não tem cor definida. */
export const TAG_FORNECEDOR: Record<string, string> = {
  KAID: "bg-[var(--tag-kaid-bg)] border-[var(--tag-kaid-border)] text-[var(--tag-kaid-ink)]",
  AGOLD: "bg-[var(--tag-agold-bg)] border-[var(--tag-agold-border)] text-[var(--tag-agold-ink)]",
  HREBOS: "bg-[var(--tag-hrebos-bg)] border-[var(--tag-hrebos-border)] text-[var(--tag-hrebos-ink)]",
};
export const TAG_FORNECEDOR_PADRAO =
  "bg-[var(--surface-alt)] border-[var(--border)] text-[var(--ink-muted)]";
