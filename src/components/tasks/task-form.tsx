'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { Check } from 'lucide-react';
import type { Task } from '@/types/task';

interface TaskFormProps {
  task?: Task;
  pending: boolean;
  error?: string;
  onSubmit: (values: { titulo: string; descricao?: string }) => void;
  onCancel: () => void;
}

export function TaskForm({ task, pending, error, onSubmit, onCancel }: TaskFormProps) {
  const [titulo, setTitulo] = useState(task?.titulo ?? '');
  const [descricao, setDescricao] = useState(task?.descricao ?? '');
  const [titleError, setTitleError] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedTitle = titulo.trim();
    if (!normalizedTitle) {
      setTitleError('Informe um título para continuar.');
      return;
    }
    if (normalizedTitle.length > 120) {
      setTitleError('Use até 120 caracteres.');
      return;
    }
    setTitleError('');
    onSubmit({ titulo: normalizedTitle, descricao: descricao.trim() || undefined });
  }

  return (
    <form className="task-form" onSubmit={submit} noValidate>
      <div className={`field ${titleError ? 'field-invalid' : ''}`}>
        <label htmlFor="task-title">Título da tarefa <span aria-hidden="true" className="required">*</span></label>
        <input
          id="task-title"
          name="titulo"
          value={titulo}
          onChange={(event) => { setTitulo(event.target.value); setTitleError(''); }}
          maxLength={120}
          required
          autoComplete="off"
          placeholder="Ex.: Revisar documentação do projeto"
          aria-invalid={Boolean(titleError)}
          aria-describedby={titleError ? 'title-error' : undefined}
          autoFocus
        />
        {titleError && <p id="title-error" className="field-error" role="alert">{titleError}</p>}
        <div className="field-note"><span>O título deve ter até 120 caracteres.</span><span>{titulo.length}/120</span></div>
      </div>

      <div className="field">
        <label htmlFor="task-description">Descrição <span className="optional">(opcional)</span></label>
        <textarea
          id="task-description"
          name="descricao"
          value={descricao}
          onChange={(event) => setDescricao(event.target.value)}
          maxLength={2000}
          placeholder="Adicione detalhes para lembrar o que precisa ser feito..."
        />
        <div className="field-note"><span>Seja breve e objetivo.</span><span>{descricao.length}/2000</span></div>
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions">
        <button className="button button-secondary" type="button" onClick={onCancel} disabled={pending}>Cancelar</button>
        <button className="button button-primary" type="submit" disabled={pending}>
          <Check size={18} aria-hidden="true" /> {pending ? 'Salvando…' : task ? 'Salvar alterações' : 'Criar tarefa'}
        </button>
      </div>
    </form>
  );
}
