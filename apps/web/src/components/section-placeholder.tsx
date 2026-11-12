import Link from 'next/link';
import type { ReactNode } from 'react';

/** Encabezado de sección con un aviso mientras la pantalla se construye en su issue. */
export function SectionPlaceholder({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-4 px-4 pt-5 lg:px-10 lg:pt-10">
      <h1 className="text-h1 font-bold lg:text-display">{title}</h1>
      <p className="max-w-[60ch] rounded-card border-[1.5px] border-dashed border-line bg-surface px-5 py-4 text-muted">
        {children}
      </p>
    </div>
  );
}

export function NoAccess({ groupId }: { groupId: string }) {
  return (
    <div className="mx-auto flex max-w-[1100px] flex-col items-start gap-4 px-4 pt-5 lg:px-10 lg:pt-10">
      <h1 className="text-h1 font-bold">No tenés acceso a esta sección</h1>
      <p className="text-muted">Tu rol en el grupo no incluye esta parte. Si la necesitás, pedíselo a quien administra el grupo.</p>
      <Link
        href={`/grupos/${groupId}`}
        className="flex min-h-action items-center rounded-btn border-2 border-primary bg-surface px-5 text-[19px] font-bold no-underline"
      >
        Volver a Hoy
      </Link>
    </div>
  );
}

export function Ref({ children }: { children: ReactNode }) {
  return <span className="font-bold text-ink">{children}</span>;
}
