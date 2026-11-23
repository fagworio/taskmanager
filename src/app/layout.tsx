import type { Metadata } from 'next';
import { TRPCReactProvider } from '@/trpc/client';
import './globals.css';

export const metadata: Metadata = {
  title: 'TaskManager — Minhas tarefas',
  description: 'Organize suas atividades em um só lugar, de forma simples.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body><TRPCReactProvider>{children}</TRPCReactProvider></body>
    </html>
  );
}
