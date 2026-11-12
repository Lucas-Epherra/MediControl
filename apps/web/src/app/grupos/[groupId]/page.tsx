'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { FormAlert } from '@/components/forms';
import { DayAlerts } from '@/components/hoy/day-alerts';
import { DaySummary } from '@/components/hoy/day-summary';
import { ConflictDialog, GiveDialog, SkipDialog, type Conflict } from '@/components/hoy/dialogs';
import { StockDialog } from '@/components/plan/stock-dialog';
import { DoseList } from '@/components/hoy/dose-list';
import { medicationTitle } from '@/components/hoy/format';
import { ChevronLeftIcon, ChevronRightIcon, SpinnerIcon } from '@/components/icons';
import { Toast, type ToastMessage } from '@/components/toast';
import { Button } from '@/components/ui';
import { addDays, capitalize, formatLongDate, formatTime, isoDateInZone } from '@/lib/dates';
import { useGroup } from '@/lib/group-context';
import { useAlerts, useDay, useUndoDose } from '@/lib/queries';
import { can } from '@/lib/roles';
import { useSession } from '@/lib/session';
import type { DaySlot } from '@/lib/types';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export default function HoyPage() {
  return (
    <Suspense>
      <Hoy />
    </Suspense>
  );
}

/** Reloj que avanza cada 30 s, para que "hace X min" y las ventanas de registro no queden viejas. */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

function Hoy() {
  const group = useGroup();
  const { user } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const param = useSearchParams().get('fecha');
  const now = useNow();

  const today = isoDateInZone(new Date(now), group.timezone);
  const date = param && ISO_DATE.test(param) && param !== today ? param : undefined;
  const shown = date ?? today;

  const day = useDay(group.id, date);
  const alerts = useAlerts(group.id);
  const undo = useUndoDose(group.id);

  const [giving, setGiving] = useState<DaySlot | null>(null);
  const [skipping, setSkipping] = useState<DaySlot | null>(null);
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const [restocking, setRestocking] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const notify = useCallback((text: string, tone: ToastMessage['tone'] = 'ok') => {
    setToast({ id: Date.now(), text, tone });
  }, []);
  const dismissToast = useCallback(() => setToast(null), []);

  function goTo(iso: string) {
    router.replace(iso === today ? pathname : `${pathname}?fecha=${iso}`, { scroll: false });
  }

  function undoDose(slot: DaySlot) {
    if (!slot.record) return;
    undo.mutate(slot.record.id, {
      onSuccess: () => notify(`Se deshizo: ${medicationTitle(slot.medication)} de las ${slot.timeOfDay}.`),
      onError: (error) => notify(error.message, 'error'),
    });
  }

  const relative = shown === today ? 'Hoy' : shown === addDays(today, -1) ? 'Ayer' : shown === addDays(today, 1) ? 'Mañana' : null;
  const longDate = formatLongDate(shown);
  const title = relative ? `${relative}, ${longDate}` : capitalize(longDate);

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 pb-6 pt-5 lg:gap-7 lg:px-10 lg:pt-9">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-h1 font-bold lg:text-display">{title}</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted" aria-live="off">
            {day.dataUpdatedAt > 0 && <>Actualizado a las {formatTime(new Date(day.dataUpdatedAt), group.timezone)}</>}
            {day.isFetching && !day.isPending && (
              <>
                <SpinnerIcon size={16} />
                <span className="sr-only">Actualizando</span>
              </>
            )}
          </p>
        </div>
        <nav aria-label="Cambiar de día" className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => goTo(addDays(shown, -1))}
            aria-label="Día anterior"
            className="flex h-12 w-12 items-center justify-center rounded-btn border-[1.5px] border-line bg-white text-ink hover:border-muted"
          >
            <ChevronLeftIcon size={24} />
          </button>
          {shown !== today && (
            <Button variant="neutral" onClick={() => goTo(today)}>
              Volver a hoy
            </Button>
          )}
          <button
            type="button"
            onClick={() => goTo(addDays(shown, 1))}
            aria-label="Día siguiente"
            className="flex h-12 w-12 items-center justify-center rounded-btn border-[1.5px] border-line bg-white text-ink hover:border-muted"
          >
            <ChevronRightIcon size={24} />
          </button>
        </nav>
      </div>

      <div className="flex flex-wrap items-start gap-6 lg:gap-7">
        <section aria-labelledby="tomas-h" className="order-2 flex min-w-0 flex-[999_1_520px] flex-col gap-2.5 lg:order-1">
          <h2 id="tomas-h" className="text-h2 font-bold">
            {shown === today ? 'Tomas de hoy' : 'Tomas del día'}
          </h2>
          {day.isPending ? (
            <DoseSkeleton />
          ) : day.isError ? (
            <div className="flex flex-col items-start gap-3">
              <FormAlert>{day.error.message}</FormAlert>
              <Button variant="secondary" onClick={() => day.refetch()}>
                Reintentar
              </Button>
            </div>
          ) : day.data.doses.length === 0 ? (
            <EmptyDay groupId={group.id} canEditPlan={can(group.myRole, 'editPlan')} />
          ) : (
            <DoseList
              group={group}
              userId={user?.id ?? ''}
              doses={day.data.doses}
              now={now}
              onGive={setGiving}
              onSkip={setSkipping}
              onUndo={undoDose}
            />
          )}
        </section>

        <aside className="order-1 flex min-w-0 flex-[1_1_340px] flex-col gap-6 lg:order-2">
          {day.data && <DaySummary day={day.data} isToday={shown === today} />}
          <DayAlerts
            group={group}
            alerts={alerts.data?.alerts}
            failed={alerts.isError && !alerts.data}
            onRestock={setRestocking}
          />
        </aside>
      </div>

      <GiveDialog
        groupId={group.id}
        slot={giving}
        onClose={() => setGiving(null)}
        onConflict={setConflict}
        onDone={notify}
      />
      <SkipDialog
        groupId={group.id}
        slot={skipping}
        onClose={() => setSkipping(null)}
        onConflict={setConflict}
        onDone={notify}
      />
      <ConflictDialog conflict={conflict} timeZone={group.timezone} onClose={() => setConflict(null)} />
      {restocking && (
        <StockDialog
          groupId={group.id}
          medicationId={restocking}
          type="RESTOCK"
          onClose={() => setRestocking(null)}
          onDone={notify}
        />
      )}
      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}

function DoseSkeleton() {
  return (
    <div role="status" aria-label="Cargando las tomas" className="flex flex-col gap-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-[150px] animate-pulse rounded-card border border-line bg-white" />
      ))}
    </div>
  );
}

function EmptyDay({ groupId, canEditPlan }: { groupId: string; canEditPlan: boolean }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-card border-[1.5px] border-dashed border-line bg-white p-5">
      <p className="font-bold">No hay tomas programadas para este día.</p>
      <p className="text-muted">
        {canEditPlan
          ? 'Cargá los medicamentos y sus horarios en el Plan para verlos acá.'
          : 'Cuando quien administra el grupo cargue medicamentos y horarios, van a aparecer acá.'}
      </p>
      {canEditPlan && (
        <Link
          href={`/grupos/${groupId}/plan`}
          className="flex min-h-touch items-center rounded-btn border-2 border-primary bg-white px-4 font-bold no-underline"
        >
          Ir al Plan
        </Link>
      )}
    </div>
  );
}
