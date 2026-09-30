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


## Cursos internos e vídeo protegido

A Trilha possui um módulo de aprendizado interno vinculado às qualificações do tipo `COURSE`.

Fluxo:

1. Admin ou gerente cria um curso e o vincula a uma qualificação.
2. O curso é organizado em módulos e aulas sequenciais.
3. O upload de uma aula é processado pelo backend para HLS.
4. O colaborador acessa o curso pela Biblioteca de Aprendizado em `Minha Trilha`.
5. A próxima aula só é liberada quando a anterior atinge o percentual mínimo de conclusão.
6. O player não oferece seek e força reprodução em 1x.
7. O backend valida heartbeats usando tempo real transcorrido e posição do vídeo.
8. Ao concluir todas as aulas, a qualificação vinculada é marcada automaticamente como concluída.

### Dependências do servidor de vídeo

O host da API precisa ter `ffmpeg` e `ffprobe` disponíveis no PATH.

Exemplo no Ubuntu/Debian:

```bash
sudo apt update
sudo apt install -y ffmpeg
```

Variáveis opcionais:

```env
COURSE_STORAGE_PATH=/var/lib/trilha/courses
FFMPEG_PATH=/usr/bin/ffmpeg
FFPROBE_PATH=/usr/bin/ffprobe
```

Sem `COURSE_STORAGE_PATH`, os segmentos HLS são armazenados em `storage/courses` fora do controle de versão.
