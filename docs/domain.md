# Domínio do PDI

## Perfis de acesso

### Colaborador
- Visualiza o próprio PDI.
- Visualiza cargo, step atual, salário e próximos steps permitidos.
- Registra/acompanha qualificações concluídas.
- Solicita promoção quando elegível.

### Gerente
- Visualiza os membros dos times sob sua responsabilidade.
- Acompanha gaps de qualificação.
- Aprova ou rejeita solicitações de promoção.
- Pode registrar observações na decisão.

### Admin
- Acesso global.
- Gerencia times, usuários, cargos, steps, salários e requisitos.
- Pode ajustar estrutura organizacional e corrigir histórico.

## Estrutura de carreira

Um cargo pertence a um time e contém de 1 a 5 steps.

- BASE: obrigatório.
- STEP_1 a STEP_4: opcionais.

Cada step define:
- salário;
- ordem;
- requisitos de qualificação;
- tempo mínimo de casa;
- tempo mínimo de experiência.

## Qualificações

As qualificações são reutilizáveis e podem ser vinculadas a diferentes cargos/steps.

Tipos iniciais:
- COURSE
- KNOWLEDGE
- TENURE
- EXPERIENCE

Uma qualificação pode conter URL de referência, descrição, validade e instruções de comprovação.

## Promoção

Fluxo sugerido:

`DRAFT -> REQUESTED -> APPROVED | REJECTED | CANCELLED`

Ao solicitar promoção, o sistema gera um snapshot dos requisitos para auditoria. O gerente decide e o sistema registra o histórico.

## Regras importantes

- Não apagar histórico de carreira; use registros de vigência.
- Salário deve ser armazenado como Decimal.
- Senha nunca deve ser armazenada em texto puro.
- Aprovação precisa guardar quem aprovou, data e justificativa.
- Alterações de cargo/step devem gerar CareerHistory.
- Requisitos devem poder ser marcados como obrigatórios ou opcionais.
