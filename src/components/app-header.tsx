import Link from 'next/link';
import { Check } from 'lucide-react';

export function AppHeader() {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/tarefas" className="brand" aria-label="TaskManager — ir para lista de tarefas">
          <span className="brand-icon"><Check size={23} strokeWidth={2.5} aria-hidden="true" /></span>
          TaskManager
        </Link>
        <nav className="top-right" aria-label="Navegação principal"><Link href="/tarefas" className="nav-link" aria-current="page">Tarefas</Link></nav>
      </div>
    </header>
  );
}
