# Triagem UPA — Frontend

Interface do sistema de triagem hospitalar (Protocolo de Manchester).
Consome a API em [`triagem-upa-api`](../triagem-upa-api).

## Stack

- React 18, TypeScript, Vite 6
- Tailwind CSS 4, Radix UI, shadcn/ui tokens
- pnpm

## Três painéis

- **Painel Público** — TV da sala de espera; polling de 5s.
- **Painel do Médico** — chamar próximo / encerrar atendimento.
- **Triagem** — cadastrar paciente e nível de urgência (P1–P5).

## Rodando local

```bash
pnpm install
pnpm dev
```

Servidor sobe em `http://localhost:5173`.

Por padrão aponta para `http://localhost:8080/api` — o backend precisa estar
rodando (`docker compose up` no repositório `triagem-upa-api`).

## Variáveis de ambiente

| Arquivo           | Quando                      |
|-------------------|-----------------------------|
| `.env.local`      | `pnpm dev`                  |
| `.env.production` | `pnpm build`                |

Variável: `VITE_API_URL` (default: `http://localhost:8080/api`).

## Build de produção

```bash
pnpm build
# output em dist/
```

## Estrutura

```
src/
├── app/
│   ├── App.tsx            ← composição dos 3 painéis
│   └── components/        ← shadcn/ui
├── services/
│   └── api.ts             ← cliente HTTP da triagem-upa-api
└── styles/                ← tokens Tailwind, tema
```

## Deploy

Build + copiar `dist/` para `/var/www/triagem/` no Droplet — Nginx serve
como SPA com `try_files $uri /index.html`.
