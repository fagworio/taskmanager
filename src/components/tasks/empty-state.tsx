'use client';

import { FileText, Plus } from 'lucide-react';

export function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <section className="empty-state" aria-labelledby="empty-title">
      <div className="empty-icon"><FileText size={34} aria-hidden="true" /></div>
      <h2 id="empty-title">Nenhuma tarefa por aqui</h2>
      <p>Crie sua primeira tarefa para organizar suas atividades.</p>
      <button className="button button-primary" type="button" onClick={onCreate}><Plus size={18} aria-hidden="true" /> Criar primeira tarefa</button>
    </section>
  );
}
