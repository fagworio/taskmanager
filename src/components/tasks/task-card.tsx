'use client';

import { CalendarDays, FileText, Pencil, Trash2 } from 'lucide-react';
import type { Task } from '@/types/task';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(value));
}

export function TaskCard({ task, onEdit, onDelete, busy, entering = false }: {
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
  busy: boolean;
  entering?: boolean;
}) {
  return (
    <article className={`task-card${entering ? ' task-card-entering' : ''}`}>
      <div className="task-icon"><FileText size={20} aria-hidden="true" /></div>
      <div className="task-content">
        <h3>{task.titulo}</h3>
        {task.descricao && <p className="task-description">{task.descricao}</p>}
        <p className="task-date"><CalendarDays size={14} aria-hidden="true" /> Criada em {formatDate(task.dataCriacao)}</p>
      </div>
      <div className="task-actions">
        <button className="icon-button" type="button" aria-label={`Editar ${task.titulo}`} title={`Editar ${task.titulo}`} onClick={onEdit} disabled={busy}>
          <Pencil size={18} aria-hidden="true" />
        </button>
        <button className="icon-button delete-button" type="button" aria-label={`Excluir ${task.titulo}`} title={`Excluir ${task.titulo}`} onClick={onDelete} disabled={busy}>
          <Trash2 size={18} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}
