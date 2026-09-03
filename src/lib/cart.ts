"use client";

import { useSyncExternalStore } from "react";

/**
 * Carrinho de pedido — vive só no navegador (localStorage) enquanto o
 * usuário está montando o pedido. Só vira registro de verdade no banco
 * (tabelas `pedidos`/`pedido_itens`) quando o pedido é finalizado em
 * /carrinho. Ver decisão em supabase/migrations/..._create_pedidos.sql.
 */
export type ItemCarrinho = {
  produtoId: string;
  codigo: string | null;
  nome: string;
  fornecedor: string;
  precoUnitario: number;
  moq: number | null;
  quantidade: number;
};

const CHAVE_STORAGE = "capi-atacado:carrinho";
const EVENTO_MUDANCA = "capi-atacado:carrinho-mudou";

// Referência estável — useSyncExternalStore exige a MESMA referência
// enquanto os dados não mudarem (tanto pro snapshot do cliente quanto
// pro do servidor), senão o React acha que sempre mudou e loopa.
const CARRINHO_VAZIO: ItemCarrinho[] = [];

// useSyncExternalStore exige que getSnapshot devolva a MESMA referência
// enquanto os dados não mudarem (senão o React re-renderiza sem parar).
// Por isso o resultado fica em cache até algo invalidar (salvarCarrinho
// nesta aba, ou o evento nativo "storage" vindo de outra aba).
let cache: ItemCarrinho[] | null = null;

function lerCarrinho(): ItemCarrinho[] {
  if (cache !== null) return cache;
  if (typeof window === "undefined") return CARRINHO_VAZIO;
  try {
    const raw = window.localStorage.getItem(CHAVE_STORAGE);
    cache = raw ? (JSON.parse(raw) as ItemCarrinho[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function salvarCarrinho(itens: ItemCarrinho[]) {
  window.localStorage.setItem(CHAVE_STORAGE, JSON.stringify(itens));
  cache = itens;
  // Componentes diferentes (badge, botões, tela do carrinho) leem o
  // localStorage de forma independente — esse evento é o que avisa todo
  // mundo que mudou, sem precisar de um Context global.
  window.dispatchEvent(new Event(EVENTO_MUDANCA));
}

export function adicionarAoCarrinho(item: Omit<ItemCarrinho, "quantidade">, quantidade: number) {
  const itens = [...lerCarrinho()];
  const existente = itens.find((i) => i.produtoId === item.produtoId);
  if (existente) {
    existente.quantidade += quantidade;
  } else {
    itens.push({ ...item, quantidade });
  }
  salvarCarrinho(itens);
}

export function atualizarQuantidade(produtoId: string, quantidade: number) {
  const itens = lerCarrinho()
    .map((i) => (i.produtoId === produtoId ? { ...i, quantidade } : i))
    .filter((i) => i.quantidade > 0);
  salvarCarrinho(itens);
}

export function removerDoCarrinho(produtoId: string) {
  salvarCarrinho(lerCarrinho().filter((i) => i.produtoId !== produtoId));
}

export function limparCarrinho() {
  salvarCarrinho([]);
}

function inscrever(avisar: () => void) {
  function aoMudarStorage() {
    cache = null; // veio de outra aba — invalida o cache pra reler
    avisar();
  }
  window.addEventListener(EVENTO_MUDANCA, avisar);
  window.addEventListener("storage", aoMudarStorage);
  return () => {
    window.removeEventListener(EVENTO_MUDANCA, avisar);
    window.removeEventListener("storage", aoMudarStorage);
  };
}

function snapshotServidor(): ItemCarrinho[] {
  return CARRINHO_VAZIO;
}

/** Hook que mantém um componente sincronizado com o carrinho — reage a
 * mudanças feitas em qualquer outro componente e entre abas do navegador. */
export function useCarrinho() {
  return useSyncExternalStore(inscrever, lerCarrinho, snapshotServidor);
}
