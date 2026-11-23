# TaskManager

Aplicação de gerenciamento de tarefas feita com Next.js 15 App Router, React, TypeScript e tRPC. O CRUD armazena dados em um `Map` no processo Node.js; não usa banco de dados nem API REST paralela.

## Requisitos e execução

- Node.js 20.9 ou superior (validado com Node.js 24.22.0)
- npm

Instale as dependências e inicie o servidor de desenvolvimento:

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`. Para executar a versão de produção:

```bash
npm run build
npm run start
```

Use uma única instância persistente do processo Node.js: o SSR e as chamadas tRPC acessam a mesma memória desse processo.

## Como o sistema funciona

1. A rota `/tarefas` é um Server Component dinâmico em Node.js. Ela chama o caller tRPC diretamente para buscar a primeira página e a entrega ao componente cliente como dados iniciais, já presentes no HTML renderizado.
2. O router tRPC encaminha as operações para `TaskService`, que aplica as regras de negócio. IDs UUID e `dataCriacao` ISO UTC são gerados no servidor.
3. `TaskService` usa `InMemoryTaskRepository`, que mantém as tarefas em um `Map`. O serviço e os componentes não acessam esse armazenamento diretamente.
4. No cliente, TanStack Query com a integração tRPC atualiza a lista após criação, edição e exclusão. Os contratos e a validação de entrada estão em Zod; título vazio é rejeitado e tarefas inexistentes retornam `NOT_FOUND`.
5. A lista começa com 8 tarefas e busca as seguintes perto do fim da página, usando cursor estável por data e ID. Um indicador e skeletons ficam visíveis por pelo menos 720 ms antes da próxima página aparecer; os novos cards entram com animação. **Carregar mais** é a alternativa caso `IntersectionObserver` não esteja disponível ou a tentativa falhe.

## Checklist dos requisitos do desafio

### Configuração do projeto

- [x] Next.js 15.x com App Router, React e TypeScript.
- [x] tRPC configurado para o frontend consumir as procedures do servidor.

### Backend (tRPC)

- [x] Modelo de tarefa com `id` UUID, `titulo`, `descricao` opcional e `dataCriacao` ISO 8601 UTC.
- [x] Operações `task.create`, `task.list`, `task.update` e `task.delete`; `task.getById` também está disponível.
- [x] Validação no servidor rejeita título vazio ou só com espaços e normaliza entradas com `trim()`.
- [x] Erros significativos: `BAD_REQUEST` para entradas inválidas, `NOT_FOUND` para tarefas ausentes e falhas internas sanitizadas.
- [x] Armazenamento exclusivamente em memória no processo Node.js, sem banco de dados.

### Frontend (React/Next.js)

- [x] Listagem inicial renderizada no servidor (SSR) e entregue ao cliente como dados iniciais.
- [x] Tarefas exibidas em uma lista com ações de edição e exclusão.
- [x] Formulário de criação e edição em componentes funcionais, com hooks e validação de título.
- [x] Exclusão com confirmação e feedback visual de sucesso ou falha.
- [x] Estados de carregamento, sucesso e erro tratados na lista, nos formulários e nas operações.

### Extras

- [x] Infinite Scroll com paginação por cursor e carregamento automático ao rolar; botão alternativo disponível.
- [x] Feedback visual perceptível durante a paginação, seguido por animação de entrada dos novos cards.
- [x] Comentários no código registram decisões importantes; este README documenta arquitetura, execução e testes.
- [x] Testes unitários/de integração cobrem CRUD, validação e erros; testes E2E cobrem SSR, fluxos de CRUD e Infinite Scroll.

## Dados e paginação

Cada tarefa contém `id`, `titulo`, `descricao` opcional e `dataCriacao`. O título aceita de 1 a 120 caracteres depois de `trim()`; a descrição é opcional e aceita até 2000 caracteres. Os dados começam vazios e desaparecem quando o processo é reiniciado. A memória não é compartilhada entre processos, workers, réplicas ou instâncias serverless.

O procedure `task.listPaginated` usa limite padrão de 20 quando o cliente não informa `limit` e aceita valores de 1 a 100. A tela escolhe um lote de 8 para apresentar carregamento progressivo em listas menores.

Procedures tRPC em `/api/trpc`:

- `task.create`
- `task.list`
- `task.listPaginated`
- `task.getById`
- `task.update`
- `task.delete`

## Scripts de validação

```bash
npm run lint       # ESLint/Next.js
npm run typecheck  # TypeScript estrito
npm run test       # Vitest: validação e integração tRPC
npm run test:e2e   # Playwright: SSR, CRUD, responsividade e Infinite Scroll
```

Para rodar E2E contra uma instância de produção, inicie o servidor em outro terminal e aponte a suíte para ele:

```bash
npm run start -- --hostname 127.0.0.1 --port 3100
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 npm run test:e2e
```

## Organização do código

- `src/app/`: rotas Next.js, layout e handler HTTP do tRPC.
- `src/components/`: componentes de interface e interações da lista.
- `src/schemas/` e `src/types/`: contratos de entrada e tipos compartilhados.
- `src/server/trpc/`: router, contexto e caller para SSR.
- `src/server/tasks/`: serviço e repository em memória.

O repository fica em `globalThis` para preservar a mesma instância durante hot reload no mesmo processo. Isso não coordena processos diferentes; a configuração suportada para esta entrega é um único processo Node.js persistente.

## Interface

A interface é composta por componentes React (`AppHeader`, `TaskList`, `TaskCard`, `EmptyState`, `TaskDialog`, `TaskForm`, `DeleteTaskDialog`) e usa tokens CSS centralizados. Os dados exibidos vêm do serviço tRPC em memória; não há fixtures permanentes na aplicação.
