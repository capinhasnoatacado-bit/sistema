@AGENTS.md

# Capi Atacado

## Stack

- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS**
- **Supabase** (Postgres + Auth) — rodando local via CLI/Docker no desenvolvimento, deploy futuro na Vercel
- Gerenciador de pacotes: **npm**

## Comandos úteis

```bash
# App
npm run dev              # servidor de desenvolvimento
npm run build             # build de produção
npm run start              # roda o build de produção
npm run lint                # eslint

# Supabase (local)
supabase start              # sobe o stack local (Postgres, Auth, Studio etc. via Docker)
supabase stop                # derruba o stack local
supabase status               # mostra URLs e chaves do stack local
supabase db diff -f <nome>     # gera uma migration a partir de mudanças feitas localmente
supabase migration new <nome>   # cria um arquivo de migration vazio
supabase migration up            # aplica só as migrations pendentes, SEM apagar dados existentes
supabase db reset                  # apaga o banco local inteiro e recria (migrations + seed.sql) — só usar quando isso for intencional
```

⚠️ **`supabase db reset` apaga qualquer dado que não esteja em `seed.sql`** — hoje isso inclui tudo de `benchmark_jobs`/`benchmark_produtos` (a tela `/benchmark`), que não tem seed. Pra aplicar uma migration nova sem perder esses dados, use `supabase migration up`. Só peça `db reset` quando for realmente o caso (ex: banco corrompido, ou o próprio catálogo de `seed.sql` mudou e precisa recarregar).

## Estrutura de pastas

```
src/
  app/                 # rotas (App Router)
  lib/
    supabase/
      client.ts         # client Supabase para uso em Client Components
      server.ts          # client Supabase para Server Components/Route Handlers/Server Actions
supabase/
  config.toml            # configuração do stack local
  migrations/              # TODO o schema do banco vive aqui (nunca alterar pelo Studio)
  seed.sql                  # dados de fornecedores/produtos extraídos dos catálogos em PDF
.env.local.example           # chaves necessárias, sem valores
.env.local                    # credenciais reais (git-ignored, nunca commitar)
```

## Regras de trabalho

1. Não escrever código antes de aprovação do plano.
2. Uma etapa por vez: terminar, mostrar, esperar validação, só então seguir.
3. Todo schema vive em `supabase/migrations/`. Nunca alterar o banco pelo Studio.
4. Não inventar regra de negócio, tabela de domínio ou tela que não foi pedida. Se faltar informação, perguntar — não preencher com suposição.
5. `.env.local` no `.gitignore`. Nunca commitar credencial.
6. Manter este `CLAUDE.md` atualizado conforme o escopo for sendo definido.

## Escopo do negócio

Primeira funcionalidade real do sistema: ajudar a escolher, entre catálogos de fornecedores diferentes, o produto mais barato/equivalente na hora de repor estoque. Piloto feito com **cabos** (carregador/dados).

- **Modelagem**: `fornecedores` (nome) e `produtos` (fornecedor, categoria, código, nome, preço **sempre por peça**, MOQ, e `especificacoes` em jsonb — pra cabo: `conector_origem`, `conector_destino`, `comprimento_m`, `amperagem`, `material`). `especificacoes` é jsonb de propósito: cada categoria futura tem atributos diferentes.
- **Cadastro dos produtos**: sem parser automático de PDF — os catálogos de fornecedor têm formatos incompatíveis entre si (texto estruturado, imagem pura, texto desalinhado da tabela de preço). Claude lê o PDF (texto e/ou visual) e cadastra os produtos estruturados em `supabase/seed.sql`, com validação humana depois. Esse é o fluxo padrão pra qualquer catálogo novo, não só o piloto de cabos.
- **Comparação**: não é automática — a tela `/comparador` dá filtro manual por conector/comprimento/cor/fornecedor + busca livre, e quem decide o que é "equivalente" é quem está comprando.
- **Carrinho e pedido**: em `/comparador`, cada produto tem um campo de quantidade (padrão = MOQ) + "Adicionar ao carrinho". O carrinho em si vive só no navegador (localStorage, `src/lib/cart.ts`) — só vira registro no banco (`pedidos`/`pedido_itens`) quando finalizado em `/carrinho`. `pedido_itens.preco_unitario_pedido` congela o preço do momento do pedido. `/pedidos/[id]` mostra o resultado separado por fornecedor, com botão de copiar lista (pra WhatsApp).
- **RLS**: desligado por enquanto (não tem Auth implementado ainda). Revisar quando o app for pro ar.
- **Fornecedores cadastrados no piloto**: KAID, AGOLD, HREBOS (catálogos em PDF fornecidos pelo usuário).

Fora do escopo até ser pedido: parser automático de PDF, categorias além de cabo, tela de upload/gerenciamento de catálogo, tela de cadastro manual de produto, listagem de pedidos anteriores, edição de pedido já finalizado, exportar pedido em PDF/planilha.
