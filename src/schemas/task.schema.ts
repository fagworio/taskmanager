import { z } from 'zod';
import { TASK_DEFAULT_PAGE_SIZE } from '@/types/task';

export const taskIdSchema = z.object({ id: z.string().uuid() });

export const taskListPaginatedSchema = z.object({
  limit: z.number().int().min(1).max(100).default(TASK_DEFAULT_PAGE_SIZE),
  cursor: z.string().min(1).max(256).nullish(),
  direction: z.enum(['forward', 'backward']).optional(),
}).strict();

export const taskPaginationCursorSchema = z.object({
  id: z.string().uuid(),
  dataCriacao: z.string().datetime(),
}).strict();

export const taskCreateSchema = z.object({
  titulo: z.string().trim().min(1, 'Informe um título para continuar.').max(120, 'Use até 120 caracteres.'),
  descricao: z.string().max(2000, 'Use até 2000 caracteres.').optional().transform((value) => value?.trim() || undefined),
}).strict();

export const taskUpdateSchema = z.object({
  id: z.string().uuid(),
  titulo: z.string().trim().min(1, 'Informe um título para continuar.').max(120, 'Use até 120 caracteres.').optional(),
  descricao: z.string().max(2000, 'Use até 2000 caracteres.').optional().transform((value) => value?.trim() || undefined),
}).strict().refine(({ titulo, descricao }) => titulo !== undefined || descricao !== undefined, {
  message: 'Informe pelo menos um campo para atualizar.',
});

export type CreateTaskInput = z.input<typeof taskCreateSchema>;
export type UpdateTaskInput = z.input<typeof taskUpdateSchema>;
export type ListPaginatedTasksInput = z.input<typeof taskListPaginatedSchema>;
