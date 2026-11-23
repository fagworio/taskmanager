'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { Task } from '@/types/task';
import { TaskForm } from './task-form';

interface TaskDialogProps {
  mode: 'create' | 'edit';
  task?: Task;
  loading?: boolean;
  pending: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (values: { titulo: string; descricao?: string }) => void;
  onRetry?: () => void;
}

export function TaskDialog({ mode, task, loading, pending, error, onClose, onSubmit, onRetry }: TaskDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLInputElement>('#task-title')?.focus();
    }
    return () => { if (dialog?.open) dialog.close(); };
  }, []);

  function close() {
    if (pending) return;
    dialogRef.current?.close();
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      className="task-dialog"
      aria-labelledby="task-dialog-title"
      onCancel={(event) => { event.preventDefault(); close(); }}
      onClick={(event) => { if (event.target === dialogRef.current) close(); }}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href]',
        ) ?? []).filter((control) => control.getClientRects().length > 0);
        if (!controls.length) return;
        if (event.shiftKey && document.activeElement === controls[0]) {
          event.preventDefault();
          controls[controls.length - 1]?.focus();
        } else if (!event.shiftKey && document.activeElement === controls[controls.length - 1]) {
          event.preventDefault();
          controls[0]?.focus();
        }
      }}
    >
      <div className="dialog-head">
        <div>
          <span className="dialog-eyebrow">TaskManager / Tarefas</span>
          <h2 id="task-dialog-title">{mode === 'edit' ? 'Editar tarefa' : 'Nova tarefa'}</h2>
          <p>{mode === 'edit' ? 'Atualize os detalhes abaixo sem sair da lista.' : 'Adicione uma tarefa sem sair da listagem.'}</p>
        </div>
        <button className="close-modal" type="button" onClick={close} aria-label="Fechar formulário" disabled={pending}>
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      <div className="dialog-content">
        {loading ? <p className="dialog-loading" role="status">Carregando tarefa…</p> : task || mode === 'create' ? (
          <TaskForm key={`${task?.id ?? 'new'}-${formKey}`} task={task} pending={pending} error={error} onSubmit={onSubmit} onCancel={close} />
        ) : (
          <div className="dialog-error" role="alert">
            <p>{error ?? 'Tarefa não encontrada.'}</p>
            {onRetry && <button className="button button-secondary" type="button" onClick={() => { setFormKey((n) => n + 1); onRetry(); }}>Tentar novamente</button>}
            <button className="button button-secondary" type="button" onClick={close}>Fechar</button>
          </div>
        )}
      </div>
    </dialog>
  );
}
