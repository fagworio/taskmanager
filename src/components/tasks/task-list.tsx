'use client';

import type { Task } from '@/types/task';
import { TaskCard } from './task-card';
import { useInfiniteScroll } from './use-infinite-scroll';

export function TaskList({
  tasks,
  deletingId,
  onEdit,
  onDelete,
  hasNextPage,
  isFetchingNextPage,
  isFetchNextPageError,
  nextPageError,
  enteringTaskIds,
  onLoadMore,
}: {
  tasks: Task[];
  deletingId?: string;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isFetchNextPageError: boolean;
  nextPageError?: string;
  enteringTaskIds: ReadonlySet<string>;
  onLoadMore: () => void;
}) {
  const sentinelRef = useInfiniteScroll(
    hasNextPage && !isFetchingNextPage && !isFetchNextPageError,
    onLoadMore,
  );

  return (
    <>
      <div className="task-list" aria-label="Lista de tarefas">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            busy={deletingId === task.id}
            entering={enteringTaskIds.has(task.id)}
            onEdit={() => onEdit(task)}
            onDelete={() => onDelete(task)}
          />
        ))}
      </div>
      {(hasNextPage || isFetchingNextPage) && <div className="load-more-region">
        <div className="task-list-sentinel" ref={sentinelRef} aria-hidden="true" />
        {isFetchingNextPage && <div className="load-more-feedback" role="status" aria-live="polite">
          <div className="load-more-status-row">
            <span className="loading-spinner" aria-hidden="true" />
            <p className="load-more-status">Buscando tarefas mais antigas…</p>
          </div>
          <div className="task-skeleton-list" aria-hidden="true">
            <div className="task-skeleton"><span className="task-skeleton-icon" /><span className="task-skeleton-content"><span className="task-skeleton-title" /><span className="task-skeleton-meta" /></span></div>
            <div className="task-skeleton"><span className="task-skeleton-icon" /><span className="task-skeleton-content"><span className="task-skeleton-title" /><span className="task-skeleton-meta" /></span></div>
          </div>
        </div>}
        {nextPageError && <p className="load-more-error" role="alert">{nextPageError}</p>}
        <button className="button button-secondary" type="button" onClick={onLoadMore} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? 'Carregando tarefas…' : isFetchNextPageError ? 'Tentar novamente' : 'Carregar mais'}
        </button>
      </div>}
    </>
  );
}
