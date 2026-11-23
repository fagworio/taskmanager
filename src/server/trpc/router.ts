import { taskCreateSchema, taskIdSchema, taskListPaginatedSchema, taskUpdateSchema } from '@/schemas/task.schema';
import { taskService } from '@/server/tasks/task.service';
import type { TaskService } from '@/server/tasks/task.service';
import { baseProcedure, createTRPCRouter } from './init';

export function createAppRouter(service: TaskService) {
  return createTRPCRouter({
    task: createTRPCRouter({
      create: baseProcedure.input(taskCreateSchema).mutation(({ input }) => service.create(input)),
      list: baseProcedure.query(() => service.list()),
      listPaginated: baseProcedure.input(taskListPaginatedSchema).query(({ input }) => service.listPaginated(input)),
      getById: baseProcedure.input(taskIdSchema).query(({ input }) => service.getById(input.id)),
      update: baseProcedure.input(taskUpdateSchema).mutation(({ input }) => service.update(input)),
      delete: baseProcedure.input(taskIdSchema).mutation(({ input }) => service.delete(input.id)),
    }),
  });
}

export const appRouter = createAppRouter(taskService);

export type AppRouter = typeof appRouter;

export function createAppCaller() {
  return appRouter.createCaller({});
}
