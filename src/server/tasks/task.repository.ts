import type { Task } from '@/types/task';

export interface TaskRepository {
  create(task: Task): Task;
  list(): Task[];
  listPaginated(limit: number, cursor?: TaskCursor): RepositoryTaskPage;
  getById(id: string): Task | undefined;
  update(id: string, changes: Partial<Pick<Task, 'titulo' | 'descricao'>>): Task | undefined;
  delete(id: string): boolean;
}

export interface TaskCursor {
  id: string;
  dataCriacao: string;
}

export interface RepositoryTaskPage {
  items: Task[];
  nextCursor: TaskCursor | null;
}

export class InMemoryTaskRepository implements TaskRepository {
  private readonly tasks = new Map<string, Task>();

  create(task: Task): Task {
    this.tasks.set(task.id, { ...task });
    return { ...task };
  }

  list(): Task[] {
    // The ID breaks timestamp ties so cursor pagination stays deterministic.
    return [...this.tasks.values()]
      .sort((a, b) => b.dataCriacao.localeCompare(a.dataCriacao) || b.id.localeCompare(a.id))
      .map((task) => ({ ...task }));
  }

  listPaginated(limit: number, cursor?: TaskCursor): RepositoryTaskPage {
    const candidates = this.list().filter((task) => {
      if (!cursor) return true;
      const dateOrder = task.dataCriacao.localeCompare(cursor.dataCriacao);
      return dateOrder < 0 || (dateOrder === 0 && task.id.localeCompare(cursor.id) < 0);
    });
    // One extra matching item is enough to signal that another cursor page exists.
    const hasMore = candidates.length > limit;
    const items = candidates.slice(0, limit);
    const lastItem = items.at(-1);

    return {
      items,
      nextCursor: hasMore && lastItem
        ? { id: lastItem.id, dataCriacao: lastItem.dataCriacao }
        : null,
    };
  }

  getById(id: string): Task | undefined {
    const task = this.tasks.get(id);
    return task ? { ...task } : undefined;
  }

  update(id: string, changes: Partial<Pick<Task, 'titulo' | 'descricao'>>): Task | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    const updated = { ...task, ...changes };
    this.tasks.set(id, updated);
    return { ...updated };
  }

  delete(id: string): boolean {
    return this.tasks.delete(id);
  }
}
