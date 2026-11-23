import { describe, expect, it } from 'vitest';
import { TRPCError } from '@trpc/server';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { InMemoryTaskRepository } from '@/server/tasks/task.repository';
import { TaskService } from '@/server/tasks/task.service';
import { createAppRouter } from './router';
import { baseProcedure, createTRPCRouter } from './init';

function createCaller() {
  const service = new TaskService(new InMemoryTaskRepository());
  return createAppRouter(service).createCaller({});
}

describe('task tRPC procedures', () => {
  it('runs create, list, get, update and delete with server-owned fields', async () => {
    const caller = createCaller();
    const created = await caller.task.create({ titulo: '  Preparar entrega  ', descricao: '  revisar o app  ' });

    expect(created).toMatchObject({ titulo: 'Preparar entrega', descricao: 'revisar o app' });
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(new Date(created.dataCriacao).toISOString()).toBe(created.dataCriacao);
    expect(await caller.task.list()).toEqual([created]);
    expect(await caller.task.getById({ id: created.id })).toEqual(created);

    const updated = await caller.task.update({ id: created.id, titulo: 'Entrega revisada', descricao: ' ' });
    expect(updated).toEqual({ ...created, titulo: 'Entrega revisada', descricao: undefined });
    expect(await caller.task.delete({ id: created.id })).toEqual({ success: true, id: created.id });
    expect(await caller.task.list()).toEqual([]);
  });

  it('rejects blank titles, excess input, malformed ids and empty updates', async () => {
    const caller = createCaller();
    const invalidCalls = [
      caller.task.create({ titulo: '   ' }),
      caller.task.create({ titulo: 'x'.repeat(121) }),
      caller.task.create({ titulo: 'válida', descricao: 'x'.repeat(2001) }),
      caller.task.getById({ id: 'not-a-uuid' }),
      caller.task.update({ id: '00000000-0000-4000-8000-000000000000' }),
      caller.task.delete({ id: 'bad-id' }),
    ];

    for (const call of invalidCalls) {
      await expect(call).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    }
  });

  it('returns NOT_FOUND for reads, updates and deletes of missing tasks', async () => {
    const caller = createCaller();
    const id = '00000000-0000-4000-8000-000000000000';
    await expect(caller.task.getById({ id })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(caller.task.update({ id, titulo: 'Ausente' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(caller.task.delete({ id })).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('does not accept client supplied immutable task fields', async () => {
    const caller = createCaller();
    await expect(caller.task.create({
      titulo: 'Tarefa',
      id: '00000000-0000-4000-8000-000000000000',
      dataCriacao: '2000-01-01T00:00:00.000Z',
    } as never)).rejects.toBeInstanceOf(TRPCError);
  });

  it('paginates by a stable cursor without skipping or duplicating tasks', async () => {
    const caller = createCaller();
    for (let index = 0; index < 23; index += 1) {
      await caller.task.create({ titulo: `Página ${index + 1}` });
    }

    const defaultPage = await caller.task.listPaginated({});
    expect(defaultPage.items).toHaveLength(20);
    expect(defaultPage.nextCursor).toBeTruthy();

    const allTasks = await caller.task.list();
    const paginatedTasks = [];
    const pageLengths = [];
    let cursor: string | null = null;
    do {
      const page = await caller.task.listPaginated({ limit: 10, cursor });
      paginatedTasks.push(...page.items);
      pageLengths.push(page.items.length);
      cursor = page.nextCursor;
    } while (cursor);

    expect(pageLengths).toEqual([10, 10, 3]);
    expect(paginatedTasks.map((task) => task.id)).toEqual(allTasks.map((task) => task.id));
    expect(new Set(paginatedTasks.map((task) => task.id)).size).toBe(23);
  });

  it('rejects invalid pagination limits and cursors with BAD_REQUEST', async () => {
    const caller = createCaller();

    await expect(caller.task.listPaginated({ limit: 0 })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    await expect(caller.task.listPaginated({ limit: 101 })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    await expect(caller.task.listPaginated({ cursor: 'not-a-valid-cursor' })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('sanitizes unexpected server errors in the HTTP response', async () => {
    const router = createTRPCRouter({
      fail: baseProcedure.query(() => { throw new Error('private server detail'); }),
    });
    const response = await fetchRequestHandler({
      endpoint: '/api/trpc',
      req: new Request('http://localhost/api/trpc/fail'),
      router,
      createContext: async () => ({}),
    });
    const body = await response.json() as { error: { message: string; data: { stack?: string } } };

    expect(response.status).toBe(500);
    expect(body.error.message).toBe('Ocorreu um erro inesperado. Tente novamente.');
    expect(body.error.data.stack).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain('private server detail');
  });
});
