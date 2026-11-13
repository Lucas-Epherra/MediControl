'use client';

import Link from 'next/link';
import { PrinterIcon, ShareIcon, SpinnerIcon } from '@/components/icons';
import type { ToastMessage } from '@/components/toast';
import { Button } from '@/components/ui';
import { useDaySummaryText } from '@/lib/queries';

/**
 * Comparte el resumen del día que arma la API. En el celular abre el menú de compartir del
 * sistema (WhatsApp incluido); en la compu copia el texto. Lo ven todos los roles: no modifica nada.
 */
export function ShareSummary({
  groupId,
  date,
  notify,
}: {
  groupId: string;
  date?: string;
  notify: (text: string, tone?: ToastMessage['tone']) => void;
}) {
  const summary = useDaySummaryText(groupId, date);

  async function share() {
    if (!summary.data) {
      notify(summary.error?.message ?? 'Todavía se está armando el resumen. Probá de nuevo en un momento.', 'error');
      return;
    }
    const text = summary.data.text;
    const isPhone = window.matchMedia('(pointer: coarse)').matches;
    if (isPhone && typeof navigator.share === 'function') {
      try {
        await navigator.share({ text });
        return;
      } catch (error) {
        // Cerrar el menú sin elegir nada no es un error.
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      notify('Resumen copiado. Pegalo en WhatsApp o donde quieras.');
    } catch {
      notify('No se pudo copiar el resumen. Probá de nuevo.', 'error');
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="secondary"
        onClick={share}
        disabled={summary.isPending}
        icon={summary.isPending ? <SpinnerIcon size={22} /> : <ShareIcon size={22} />}
        className="w-full"
      >
        Compartir resumen
      </Button>
      {/* Para todos los roles: imprimir no necesita entrar al Plan. */}
      <Link
        href={`/grupos/${groupId}/plan/imprimir`}
        className="flex min-h-touch items-center justify-center gap-2 rounded-btn border-[1.5px] border-line bg-white px-4 font-bold text-ink no-underline hover:bg-canvas hover:text-ink"
      >
        <PrinterIcon size={22} />
        Imprimir plan
      </Link>
    </div>
  );
}
