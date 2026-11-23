export interface Task {
  id: string;
  titulo: string;
  descricao?: string;
  dataCriacao: string;
}

export interface TaskPage {
  items: Task[];
  nextCursor: string | null;
}

export const TASK_DEFAULT_PAGE_SIZE = 20;
export const TASK_LIST_PAGE_SIZE = 8;
