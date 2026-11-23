'use client';

import { useEffect, useRef } from 'react';
import { Trash2 } from 'lucide-react';
import type { Task } from '@/types/task';

export function DeleteTaskDialog({ task, pending, error, onClose, onConfirm }: {
  task: Task;
  pending: boolean;
  error?: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLButtonElement>('.button-danger')?.focus();
    }
    return () => { if (dialog?.open) dialog.close(); };
  }, []);

  function close() {
    if (pending) return;
    if (ref.current?.open) ref.current.close();
    onClose();
  }

  return (
    <dialog
      ref={ref}
      className="delete-dialog"
      aria-labelledby="delete-title"
      aria-describedby="delete-description"
      onCancel={(event) => { event.preventDefault(); close(); }}
      onClick={(event) => { if (event.target === ref.current) close(); }}
    >
      <div className="delete-icon"><Trash2 size={22} aria-hidden="true" /></div>
      <h2 id="delete-title">Excluir tarefa?</h2>
      <p id="delete-description">A tarefa “{task.titulo}” será removida da lista. Esta ação não poderá ser desfeita.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="dialog-buttons">
        <button className="button button-secondary" type="button" onClick={close} disabled={pending}>Cancelar</button>
        <button className="button button-danger" type="button" onClick={onConfirm} disabled={pending} autoFocus>
          {pending ? 'Excluindo…' : 'Excluir tarefa'}
        </button>
      </div>
    </dialog>
  );
}
