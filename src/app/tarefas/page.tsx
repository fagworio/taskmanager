import { TaskManager } from '@/components/tasks/task-manager';
import { AppHeader } from '@/components/app-header';
import { createAppCaller } from '@/server/trpc/router';
import { TASK_LIST_PAGE_SIZE } from '@/types/task';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function TasksPage() {
  // Call tRPC in-process so SSR reads the same Node memory used by mutations.
  const initialPage = await createAppCaller().task.listPaginated({ limit: TASK_LIST_PAGE_SIZE });
  return <><AppHeader /><TaskManager initialPage={initialPage} /></>;
}
