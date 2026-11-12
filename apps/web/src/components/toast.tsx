'use client';

import { useEffect } from 'react';
import { CheckIcon, InfoIcon } from './icons';

export interface ToastMessage {
  id: number;
  text: string;
  tone: 'ok' | 'error';
}

/** Aviso breve sobre la barra inferior. La región aria-live existe siempre para que se anuncie. */
export function Toast({ toast, onDismiss }: { toast: ToastMessage | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(onDismiss, 5000);
    return () => window.clearTimeout(timer);
  }, [toast, onDismiss]);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-3 bottom-[88px] z-30 flex justify-center lg:bottom-6 lg:left-[264px]"
    >
      {toast && (
        <div
          key={toast.id}
          role={toast.tone === 'error' ? 'alert' : 'status'}
          className={`pointer-events-auto flex max-w-[480px] items-start gap-2.5 rounded-btn px-4 py-3 font-bold text-white shadow-[0_8px_24px_rgba(23,40,43,0.25)] ${
            toast.tone === 'error' ? 'bg-atrasada' : 'bg-ink'
          }`}
        >
          {toast.tone === 'error' ? (
            <InfoIcon size={22} className="mt-0.5 flex-none" />
          ) : (
            <CheckIcon size={22} className="mt-0.5 flex-none" />
          )}
          <span>{toast.text}</span>
        </div>
      )}
    </div>
  );
}
