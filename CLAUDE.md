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
```

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

**A DEFINIR.** Nenhuma regra de negócio, tabela de domínio ou tela foi definida ainda. Esta sessão cobriu apenas a fundação técnica (stack, ambiente Supabase local, clients, variáveis de ambiente). O escopo será detalhado aos poucos nas próximas sessões e esta seção será atualizada conforme isso acontecer.
