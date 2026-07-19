import type { ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  ancho?: 'md' | 'lg';
}

export function Modal({ open, title, onClose, children, ancho = 'md' }: ModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className={`max-h-[90vh] w-full ${
          ancho === 'lg' ? 'max-w-2xl' : 'max-w-lg'
        } overflow-y-auto rounded-2xl border border-dark-border bg-dark-surface shadow-2xl shadow-black/50 animate-scale-in`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-dark-border px-6 py-4">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg px-2 py-1 text-gray-400 transition-all duration-200 hover:bg-dark hover:text-white"
          >
            ✕
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
