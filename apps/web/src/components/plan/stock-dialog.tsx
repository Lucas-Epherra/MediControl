'use client';

import { useState } from 'react';
import { FormAlert } from '@/components/forms';
import { SpinnerIcon } from '@/components/icons';
import { BoxIcon, Button, Field, Modal, Stepper } from '@/components/ui';
import { medicationLabel, useMedication, useStockMovement, type StockMovementType } from '@/lib/medications';
import type { Medication } from '@/lib/types';
import { formatAmount, formatUnits } from './format';

const QUICK_AMOUNTS = [30, 60, 90];

interface StockDialogProps {
  groupId: string;
  type: StockMovementType;
  onClose: () => void;
  /** Recibe el mensaje de confirmación para mostrarlo en la pantalla. */
  onDone: (message: string) => void;
}

/**
 * Reponer suma unidades; ajustar fija el stock en el conteo real. Admite medias unidades.
 * Carga el medicamento por id: se usa desde el aviso de Hoy y desde el Plan.
 */
export function StockDialog({ medicationId, ...props }: StockDialogProps & { medicationId: string }) {
  const medication = useMedication(props.groupId, medicationId);
  const med = medication.data;
  return (
    <Modal
      open
      onOpenChange={(open) => !open && props.onClose()}
      size="form"
      title={props.type === 'RESTOCK' ? 'Reponer stock' : 'Ajustar al conteo real'}
      description={med ? `${medicationLabel(med)}${med.form ? ` · ${med.form}` : ''}` : undefined}
    >
      {medication.isPending ? (
        <p role="status" className="flex items-center justify-center gap-2 py-6 text-muted">
          <SpinnerIcon size={22} className="text-primary" /> Cargando…
        </p>
      ) : medication.isError ? (
        <FormAlert>{medication.error.message}</FormAlert>
      ) : (
        <StockForm medication={medication.data} {...props} />
      )}
    </Modal>
  );
}

function StockForm({ groupId, medication, type, onClose, onDone }: StockDialogProps & { medication: Medication }) {
  const restock = type === 'RESTOCK';
  const [quantity, setQuantity] = useState(restock ? 30 : medication.stock);
  const [note, setNote] = useState('');
  const movement = useStockMovement(groupId);

  const newStock = restock ? medication.stock + quantity : quantity;
  const coverage = medication.dailyUnits > 0 ? Math.floor(newStock / medication.dailyUnits) : null;
  const invalid = restock ? quantity <= 0 : quantity < 0;

  function submit() {
    movement.mutate(
      { medicationId: medication.id, type, quantity, note: note.trim() || undefined },
      {
        onSuccess: ({ stock }) => {
          onDone(`Stock de ${medicationLabel(medication)} actualizado: ${formatUnits(stock, medication.form)}.`);
          onClose();
        },
      },
    );
  }

  return (
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!invalid) submit();
        }}
      >
        <div
          className={`flex items-center justify-between gap-3 rounded-btn px-3.5 py-3 ${
            medication.lowStock ? 'bg-ahora-tint text-ahora-text' : 'bg-canvas'
          }`}
        >
          <span className="flex items-center gap-2">
            <BoxIcon width={20} height={20} />
            Stock actual{medication.lowStock ? ' · bajo' : ''}
          </span>
          <b>{formatUnits(medication.stock, medication.form)}</b>
        </div>

        <div className="flex flex-col gap-2">
          <span className="font-bold">
            {restock ? 'Cantidad que agregás' : 'Cuántas hay ahora (contalas)'}
          </span>
          <Stepper value={quantity} onChange={setQuantity} min={0} step={0.5} label={medicationLabel(medication)} />
          {restock && (
            <div className="flex gap-2">
              {QUICK_AMOUNTS.map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={quantity === n}
                  onClick={() => setQuantity(n)}
                  className={`min-h-touch flex-1 rounded-full font-bold ${
                    quantity === n ? 'border-2 border-primary bg-primary-tint text-primary-hover' : 'border-[1.5px] border-line bg-white text-ink'
                  }`}
                >
                  +{n}
                </button>
              ))}
            </div>
          )}
        </div>

        <Field label="Nota (opcional)" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} />

        <p className="border-t border-line-soft pt-3 text-[19px]" aria-live="polite">
          Nuevo stock: <b>{formatUnits(newStock, medication.form)}</b>
          {coverage !== null && <span className="text-muted"> (≈ {formatAmount(coverage)} días)</span>}
        </p>

        {movement.isError && <FormAlert>{movement.error.message}</FormAlert>}

        <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={invalid || movement.isPending}>
            {movement.isPending ? 'Guardando…' : 'Confirmar'}
          </Button>
        </div>
      </form>
  );
}
