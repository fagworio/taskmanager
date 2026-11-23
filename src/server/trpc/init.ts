import { initTRPC } from '@trpc/server';

export const createTRPCContext = async () => ({});

const t = initTRPC.context<Awaited<ReturnType<typeof createTRPCContext>>>().create({
  errorFormatter({ shape, error }) {
    if (error.code !== 'INTERNAL_SERVER_ERROR') return shape;
    return {
      ...shape,
      message: 'Ocorreu um erro inesperado. Tente novamente.',
      data: { ...shape.data, stack: undefined },
    };
  },
});

export const createTRPCRouter = t.router;
export const baseProcedure = t.procedure;
