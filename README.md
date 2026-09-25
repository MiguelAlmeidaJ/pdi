# PDI — Plano de Desenvolvimento Individual

Sistema para estruturar carreira, cargos, steps salariais, qualificações e promoções dos times.

## Escopo inicial

- Usuários com nome, e-mail, senha, cargo, step atual e tempo de casa.
- Cargos dinâmicos cadastrados por time.
- Steps por cargo: `BASE`, `STEP_1`, `STEP_2`, `STEP_3`, `STEP_4`.
- O step `BASE` é obrigatório; os demais são opcionais por cargo.
- Cada step possui salário próprio.
- Qualificações requeridas por cargo/step:
  - cursos;
  - conhecimentos;
  - tempo mínimo de casa;
  - tempo mínimo de experiência/trabalho.
- Cargos especiais:
  - **ADMIN**: acesso irrestrito ao sistema.
  - **GERENTE**: liderança dos times e aprovação/rejeição de promoções.
- Histórico de progressão e solicitações de promoção.

## Stack

- TypeScript
- NestJS
- Prisma
- PostgreSQL
- Docker / Docker Compose
- PM2
- Next.js
- Tailwind CSS
- Turborepo
- pnpm workspaces
- Zod
- React Hook Form
- TanStack Query
- Swagger/OpenAPI
- Jest
- ESLint + Prettier

## Arquitetura proposta

```
apps/
  api/        # NestJS
  web/        # Next.js
packages/
  database/   # Prisma schema/client
  contracts/  # schemas e tipos compartilhados
docs/
  domain.md
```

## Entidades principais

- Team
- User
- Role
- RoleStep
- Qualification
- RoleStepQualification
- UserQualification
- PromotionRequest
- PromotionRequestQualification
- CareerHistory

Veja a modelagem inicial em `packages/database/prisma/schema.prisma`.

## Próximos passos

1. Criar o monorepo e instalar dependências.
2. Subir PostgreSQL via Docker Compose.
3. Gerar e executar a primeira migration do Prisma.
4. Implementar autenticação, RBAC e CRUDs de times, usuários e cargos.
5. Implementar motor de requisitos e fluxo de promoção.
6. Criar dashboards separados para colaborador, gerente e admin.

A planilha **Cargos e Salários.xlsx** será usada como fonte para uma etapa posterior de importação e normalização dos cargos, níveis, qualificações e salários existentes.
