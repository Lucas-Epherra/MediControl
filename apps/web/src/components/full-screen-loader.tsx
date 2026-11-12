import { SpinnerIcon } from './icons';

export function FullScreenLoader({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div role="status" className="flex min-h-dvh flex-col items-center justify-center gap-3 text-muted">
      <SpinnerIcon size={32} className="text-primary" />
      <span>{label}</span>
    </div>
  );
}
