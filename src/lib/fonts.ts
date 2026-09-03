import { Barlow_Condensed, IBM_Plex_Mono, Public_Sans } from "next/font/google";

/** Tipografia compartilhada entre as telas do comparador/carrinho/pedido —
 * condensada pra títulos, mono pra código/preço/labels, corpo neutro pro
 * resto. Definidas uma única vez aqui pra não duplicar por página. */
export const display = Barlow_Condensed({
  variable: "--font-display",
  weight: ["600", "700"],
  subsets: ["latin"],
});

export const mono = IBM_Plex_Mono({
  variable: "--font-data-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

export const body = Public_Sans({
  variable: "--font-body",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

export const CLASSES_FONTES = `${display.variable} ${mono.variable} ${body.variable}`;
