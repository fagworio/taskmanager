'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, RotateCw } from 'lucide-react';
import { useTRPC } from '@/trpc/client';
import { TASK_LIST_PAGE_SIZE } from '@/types/task';
import type { Task, TaskPage } from '@/types/task';
import { DeleteTaskDialog } from './delete-task-dialog';
import { EmptyState } from './empty-state';
import { TaskDialog } from './task-dialog';
import { TaskList } from './task-list';

function errorMessage(error: unknown) {
  if (!(error instanceof Error)) return undefined;
  const rpcError = error as Error & { data?: { code?: string } | null };
  if (rpcError.data?.code === 'NOT_FOUND') return 'A tarefa não foi encontrada. Atualize a lista e tente novamente.';
  if (rpcError.data?.code === 'BAD_REQUEST') return error.message || 'Confira os dados informados.';
  return 'Não foi possível concluir a operação. Tente novamente.';
}

interface ToastNotice {
  id: number;
  message: string;
  exiting: boolean;
}

const NEXT_PAGE_MIN_LOADING_MS = 720;
const TASK_ENTRY_ANIMATION_MS = 480;

export function TaskManager({ initialPage }: { initialPage: TaskPage }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<'create' | 'edit' | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [deleteTask, setDeleteTask] = useState<Task | null>(null);
  const [toast, setToast] = useState<ToastNotice | null>(null);
  const toastId = useRef(0);
  const toastAutoDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastRemovalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const taskEntryAnimationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (toastAutoDismissTimer.current) clearTimeout(toastAutoDismissTimer.current);
    if (toastRemovalTimer.current) clearTimeout(toastRemovalTimer.current);
    if (taskEntryAnimationTimer.current) clearTimeout(taskEntryAnimationTimer.current);
  }, []);

  function clearToastTimers() {
    if (toastAutoDismissTimer.current) clearTimeout(toastAutoDismissTimer.current);
    if (toastRemovalTimer.current) clearTimeout(toastRemovalTimer.current);
  }

  function showToast(message: string) {
    clearToastTimers();
    const id = ++toastId.current;
    setToast({ id, message, exiting: false });
    toastAutoDismissTimer.current = setTimeout(() => {
      setToast((current) => current?.id === id ? { ...current, exiting: true } : current);
    }, 3200);
    toastRemovalTimer.current = setTimeout(() => {
      setToast((current) => current?.id === id ? null : current);
    }, 3550);
  }

  function dismissToast() {
    if (!toast) return;
    if (toastAutoDismissTimer.current) clearTimeout(toastAutoDismissTimer.current);
    if (toastRemovalTimer.current) clearTimeout(toastRemovalTimer.current);
    const id = toast.id;
    setToast((current) => current?.id === id ? { ...current, exiting: true } : current);
    toastRemovalTimer.current = setTimeout(() => {
      setToast((current) => current?.id === id ? null : current);
    }, 320);
  }

  const listQuery = useInfiniteQuery(trpc.task.listPaginated.infiniteQueryOptions(
    { limit: TASK_LIST_PAGE_SIZE },
    {
      initialCursor: null,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      initialData: { pages: [initialPage], pageParams: [null] },
    },
  ));
  const [visiblePageCount, setVisiblePageCount] = useState(listQuery.data.pages.length);
  const [showingNextPageLoading, setShowingNextPageLoading] = useState(false);
  const [enteringTaskIds, setEnteringTaskIds] = useState<Set<string>>(() => new Set());
  const editQuery = useQuery({
    ...trpc.task.getById.queryOptions({ id: activeTask?.id ?? '' }),
    enabled: dialog === 'edit' && Boolean(activeTask),
  });

  const invalidateTaskPages = () => queryClient.invalidateQueries({
    queryKey: trpc.task.listPaginated.infiniteQueryKey({ limit: TASK_LIST_PAGE_SIZE }),
  });

  const createMutation = useMutation(trpc.task.create.mutationOptions({
    onSuccess: async () => {
      await invalidateTaskPages();
      setDialog(null);
      showToast('Tarefa criada com sucesso.');
    },
  }));
  const updateMutation = useMutation(trpc.task.update.mutationOptions({
    onSuccess: async () => {
      await invalidateTaskPages();
      await queryClient.invalidateQueries({ queryKey: trpc.task.getById.queryKey({ id: activeTask?.id ?? '' }) });
      setDialog(null);
      setActiveTask(null);
      showToast('Tarefa atualizada com sucesso.');
    },
  }));
  const deleteMutation = useMutation(trpc.task.delete.mutationOptions({
    onSuccess: async () => {
      await invalidateTaskPages();
      setDeleteTask(null);
      showToast('Tarefa excluída com sucesso.');
    },
  }));

  function openCreate() {
    createMutation.reset();
    setActiveTask(null);
    setDialog('create');
  }

  function openEdit(task: Task) {
    updateMutation.reset();
    setActiveTask(task);
    setDialog('edit');
  }

  function closeTaskDialog() {
    setDialog(null);
    setActiveTask(null);
    createMutation.reset();
    updateMutation.reset();
  }

  const tasks = listQuery.data.pages.slice(0, visiblePageCount).flatMap((page) => page.items);
  const loadMoreInFlight = useRef(false);
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = listQuery;
  const loadMore = useCallback(async () => {
    if (!hasNextPage || isFetchingNextPage || loadMoreInFlight.current) return;
    loadMoreInFlight.current = true;
    setShowingNextPageLoading(true);
    const startedAt = Date.now();
    try {
      const result = await fetchNextPage();
      // Fast in-memory responses otherwise make the loading feedback flash too briefly.
      const remainingLoadingTime = NEXT_PAGE_MIN_LOADING_MS - (Date.now() - startedAt);
      if (remainingLoadingTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, remainingLoadingTime));
      }

      if (result.isSuccess) {
        const newTasks = result.data.pages
          .slice(visiblePageCount)
          .flatMap((page) => page.items);
        setEnteringTaskIds(new Set(newTasks.map((task) => task.id)));
        setVisiblePageCount(result.data.pages.length);
        if (taskEntryAnimationTimer.current) clearTimeout(taskEntryAnimationTimer.current);
        taskEntryAnimationTimer.current = setTimeout(() => setEnteringTaskIds(new Set()), TASK_ENTRY_ANIMATION_MS);
      }
    } finally {
      setShowingNextPageLoading(false);
      loadMoreInFlight.current = false;
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, visiblePageCount]);
  const formPending = createMutation.isPending || updateMutation.isPending;
  const formError = dialog === 'edit'
    ? errorMessage(editQuery.error) ?? errorMessage(updateMutation.error)
    : errorMessage(createMutation.error);

  return (
    <>
      <main className="page-shell">
        <div className="route-label">Área de trabalho</div>
        <section className="page-heading">
          <div>
            <h1>Minhas tarefas</h1>
            <p>Organize suas atividades em um só lugar, de forma simples.</p>
          </div>
          <button className="button button-primary" type="button" onClick={openCreate}><Plus size={19} aria-hidden="true" /> Nova tarefa</button>
        </section>

        <div className="section-toolbar">
          <h2>Suas atividades</h2>
        <span className="task-counter">{tasks.length} {tasks.length === 1 ? 'tarefa' : 'tarefas'}{listQuery.hasNextPage ? ' carregadas' : ''}</span>
        </div>

        {listQuery.isError && !listQuery.data ? (
          <section className="load-error" role="alert">
            <p>Não foi possível carregar suas tarefas.</p>
            <button className="button button-secondary" type="button" onClick={() => void listQuery.refetch()}><RotateCw size={16} aria-hidden="true" /> Tentar novamente</button>
          </section>
        ) : listQuery.isPending ? (
          <div className="loading-state" role="status">Carregando tarefas…</div>
        ) : tasks.length ? (
          <TaskList
            tasks={tasks}
            deletingId={deleteMutation.isPending ? deleteTask?.id : undefined}
            onEdit={openEdit}
            onDelete={(task) => { deleteMutation.reset(); setDeleteTask(task); }}
            hasNextPage={Boolean(listQuery.hasNextPage)}
            isFetchingNextPage={listQuery.isFetchingNextPage || showingNextPageLoading}
            isFetchNextPageError={listQuery.isFetchNextPageError}
            nextPageError={listQuery.isFetchNextPageError ? errorMessage(listQuery.error) ?? 'Não foi possível carregar mais tarefas.' : undefined}
            enteringTaskIds={enteringTaskIds}
            onLoadMore={() => { void loadMore(); }}
          />
        ) : (
          <EmptyState onCreate={openCreate} />
        )}

        {tasks.length > 0 && <p className="footer-note">Exibindo {tasks.length} {tasks.length === 1 ? 'tarefa carregada' : 'tarefas carregadas'}.</p>}
      </main>

      {dialog && <TaskDialog
        key={`${dialog}-${activeTask?.id ?? 'new'}`}
        mode={dialog}
        task={dialog === 'edit' ? editQuery.data : undefined}
        loading={dialog === 'edit' && editQuery.isPending}
        pending={formPending}
        error={formError}
        onClose={closeTaskDialog}
        onRetry={() => void editQuery.refetch()}
        onSubmit={(values) => {
          if (dialog === 'create') createMutation.mutate(values);
          if (dialog === 'edit' && activeTask) updateMutation.mutate({ id: activeTask.id, ...values });
        }}
      />}

      {deleteTask && <DeleteTaskDialog
        task={deleteTask}
        pending={deleteMutation.isPending}
        error={errorMessage(deleteMutation.error)}
        onClose={() => { setDeleteTask(null); deleteMutation.reset(); }}
        onConfirm={() => deleteMutation.mutate({ id: deleteTask.id })}
      />}

      <div className="toast-region" aria-live="polite" aria-atomic="true">
        {toast && <div className={`toast${toast.exiting ? ' toast-exiting' : ''}`} role="status">
          {toast.message}
          <button type="button" aria-label="Dispensar mensagem" onClick={dismissToast}>×</button>
        </div>}
      </div>
    </>
  );
}
