import { TRPCError } from '@trpc/server';
import type { Task } from '@/types/task';
import { taskPaginationCursorSchema } from '@/schemas/task.schema';
import type { CreateTaskInput, ListPaginatedTasksInput, UpdateTaskInput } from '@/schemas/task.schema';
import { InMemoryTaskRepository } from './task.repository';
import type { TaskCursor, TaskRepository } from './task.repository';
import type { TaskPage } from '@/types/task';
import { TASK_DEFAULT_PAGE_SIZE } from '@/types/task';

type EditableTask = Partial<Pick<Task, 'titulo' | 'descricao'>>;

export class TaskService {
  constructor(private readonly repository: TaskRepository) {}

  create(input: CreateTaskInput): Task {
    // Keep identity and creation time server-owned instead of trusting client input.
    const task: Task = {
      id: crypto.randomUUID(),
      titulo: input.titulo.trim(),
      descricao: input.descricao?.trim() || undefined,
      dataCriacao: new Date().toISOString(),
    };
    return this.repository.create(task);
  }

  list(): Task[] {
    return this.repository.list();
  }

  listPaginated(input: ListPaginatedTasksInput): TaskPage {
    const cursor = input.cursor ? this.decodeCursor(input.cursor) : undefined;
    const page = this.repository.listPaginated(input.limit ?? TASK_DEFAULT_PAGE_SIZE, cursor);

    return {
      items: page.items,
      nextCursor: page.nextCursor ? this.encodeCursor(page.nextCursor) : null,
    };
  }

  getById(id: string): Task {
    const task = this.repository.getById(id);
    if (!task) throw new TRPCError({ code: 'NOT_FOUND', message: 'Tarefa não encontrada.' });
    return task;
  }

  update(input: UpdateTaskInput): Task {
    const changes: EditableTask = {};
    if (input.titulo !== undefined) changes.titulo = input.titulo.trim();
    if (Object.hasOwn(input, 'descricao')) changes.descricao = input.descricao?.trim() || undefined;
    const task = this.repository.update(input.id, changes);
    if (!task) throw new TRPCError({ code: 'NOT_FOUND', message: 'Tarefa não encontrada.' });
    return task;
  }

  delete(id: string): { success: true; id: string } {
    if (!this.repository.delete(id)) throw new TRPCError({ code: 'NOT_FOUND', message: 'Tarefa não encontrada.' });
    return { success: true, id };
  }

  private decodeCursor(value: string): TaskCursor {
    try {
      // Cursors are opaque to callers and still validated after decoding.
      const decoded = Buffer.from(value, 'base64url').toString('utf8');
      if (Buffer.from(decoded, 'utf8').toString('base64url') !== value) throw new Error('Cursor fora do formato canonico.');

      const result = taskPaginationCursorSchema.safeParse(JSON.parse(decoded));
      if (!result.success) throw new Error('Cursor invalido.');
      return result.data;
    } catch {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cursor de paginação inválido.' });
    }
  }

  private encodeCursor(cursor: TaskCursor): string {
    return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
  }
}

type TaskRuntime = typeof globalThis & { __taskManagerRepository?: InMemoryTaskRepository };

const runtime = globalThis as TaskRuntime;
const repository = runtime.__taskManagerRepository ??= new InMemoryTaskRepository();

// Next.js dev HMR can retain the old instance while replacing this class definition.
// Upgrade its prototype in place so the Map and every existing service reference stay shared.
if (typeof repository.listPaginated !== 'function') {
  Object.setPrototypeOf(repository, InMemoryTaskRepository.prototype);
}

export const taskService = new TaskService(repository);
