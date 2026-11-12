import { prescriptionAlert, prescriptionStatus, stockAlert } from './alerts.calc';

const med = { id: 'm1', name: 'Enalapril', form: 'comprimidos', lowStockThreshold: 6, dailyUnits: 2 };

describe('stockAlert', () => {
  it('no avisa si hay stock suficiente', () => {
    expect(stockAlert({ ...med, stock: 30 })).toBeNull();
  });

  it('avisa por umbral y muestra la cobertura', () => {
    const alert = stockAlert({ ...med, stock: 6, dailyUnits: 1 });
    expect(alert?.severity).toBe('warning');
    expect(alert?.message).toBe('Enalapril: quedan 6 comprimidos (≈ 6 días)');
  });

  it('avisa por cobertura aunque no haya umbral', () => {
    expect(stockAlert({ ...med, lowStockThreshold: 0, stock: 5 })?.type).toBe('LOW_STOCK');
  });

  it('es crítico sin stock', () => {
    const alert = stockAlert({ ...med, stock: -1 });
    expect(alert?.severity).toBe('critical');
    expect(alert?.message).toBe('Enalapril: sin stock');
  });
});

describe('prescriptionAlert', () => {
  const p = { id: 'p1', description: 'Receta Enalapril', medicationId: null };

  it('ignora recetas lejanas', () => {
    expect(prescriptionAlert({ ...p, expiresAtIso: '2026-11-30' }, '2026-11-11')).toBeNull();
  });

  it('avisa recetas por vencer y vencidas', () => {
    expect(prescriptionAlert({ ...p, expiresAtIso: '2026-11-14' }, '2026-11-11')?.message).toBe(
      'Receta Enalapril: vence en 3 días',
    );
    expect(prescriptionAlert({ ...p, expiresAtIso: '2026-11-11' }, '2026-11-11')?.message).toBe(
      'Receta Enalapril: vence hoy',
    );
    const expired = prescriptionAlert({ ...p, expiresAtIso: '2026-11-10' }, '2026-11-11');
    expect(expired?.type).toBe('PRESCRIPTION_EXPIRED');
    expect(expired?.message).toBe('Receta Enalapril: venció hace 1 día');
  });
});

describe('prescriptionStatus', () => {
  it('distingue vigente, por vencer y vencida', () => {
    expect(prescriptionStatus('2026-11-30', '2026-11-12')).toEqual({ status: 'VALID', daysLeft: 18 });
    expect(prescriptionStatus('2026-11-19', '2026-11-12')).toEqual({ status: 'EXPIRING', daysLeft: 7 });
    expect(prescriptionStatus('2026-11-12', '2026-11-12')).toEqual({ status: 'EXPIRING', daysLeft: 0 });
    expect(prescriptionStatus('2026-11-10', '2026-11-12')).toEqual({ status: 'EXPIRED', daysLeft: -2 });
  });
});
