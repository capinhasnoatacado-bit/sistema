"use server";

import { createClient } from "@/lib/supabase/server";
import type { ItemCarrinho } from "@/lib/cart";

/**
 * Grava o pedido finalizado no banco (tabelas `pedidos` + `pedido_itens`).
 * O carrinho em si (localStorage) é limpo pelo chamador depois do sucesso
 * — essa função só cuida da escrita.
 */
export async function finalizarPedido(itens: ItemCarrinho[]): Promise<{ pedidoId: string }> {
  if (itens.length === 0) {
    throw new Error("O carrinho está vazio.");
  }

  const supabase = await createClient();

  const { data: pedido, error: erroPedido } = await supabase
    .from("pedidos")
    .insert({})
    .select("id")
    .single();

  if (erroPedido || !pedido) {
    throw new Error(`Falha ao criar o pedido: ${erroPedido?.message ?? "erro desconhecido"}`);
  }

  const itensParaInserir = itens.map((item) => ({
    pedido_id: pedido.id as string,
    produto_id: item.produtoId,
    quantidade: item.quantidade,
    // Congela o preço de agora — se o produto for recadastrado com outro
    // preço depois, o histórico deste pedido não muda.
    preco_unitario_pedido: item.precoUnitario,
  }));

  const { error: erroItens } = await supabase.from("pedido_itens").insert(itensParaInserir);

  if (erroItens) {
    // Violação de FK em produto_id: o item no carrinho (localStorage) aponta pra
    // um produto que não existe mais — normalmente porque o banco local foi
    // resetado (`supabase db reset` recria os produtos com id novo) depois que
    // o item entrou no carrinho. Mensagem mais direta que o erro cru do Postgres.
    if (erroItens.code === "23503") {
      throw new Error(
        "Um ou mais itens do carrinho não existem mais no catálogo (provavelmente o banco foi resetado depois que você adicionou eles). Clique em \"Limpar carrinho\" e adicione de novo pelo comparador.",
      );
    }
    throw new Error(`Falha ao salvar os itens do pedido: ${erroItens.message}`);
  }

  return { pedidoId: pedido.id as string };
}
