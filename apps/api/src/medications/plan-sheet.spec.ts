import { isoToDateOnly } from '../common/dates';
import { buildPlanSheet, daysLabel, unitsLabel } from './plan-sheet';

const d = isoToDateOnly;

describe('buildPlanSheet', () => {
  it('agrupa por hora, ordena por nombre y deja afuera los horarios vencidos', () => {
    const sheet = buildPlanSheet({
      today: '2026-11-12',
      group: { name: 'Cuidado de Marta', patientName: 'Marta', patientAllergies: ' Penicilina ', notes: '  ' },
      medications: [
        {
          name: 'Metformina',
          strength: '850 mg',
          form: 'comprimidos',
          instructions: 'Con la comida',
          schedules: [
            { timeOfDay: '08:00', daysOfWeek: [], unitsPerDose: 1, startDate: d('2026-01-01'), endDate: null },
            // Vencido: no va.
            { timeOfDay: '13:00', daysOfWeek: [], unitsPerDose: 1, startDate: d('2026-01-01'), endDate: d('2026-11-01') },
          ],
        },
        {
          name: 'Enalapril',
          strength: '10 mg',
          form: 'comprimidos',
          instructions: null,
          schedules: [
            { timeOfDay: '08:00', daysOfWeek: [1, 3, 5], unitsPerDose: 0.5, startDate: d('2026-01-01'), endDate: d('2026-11-30') },
            { timeOfDay: '20:00', daysOfWeek: [], unitsPerDose: 2, startDate: d('2026-11-20'), endDate: null },
          ],
        },
      ],
      prescriptions: [
        { description: 'Receta B', expiresAt: d('2026-12-20'), medication: null },
        { description: 'Receta A', expiresAt: d('2026-11-10'), medication: { name: 'Enalapril', strength: '10 mg' } },
      ],
    });

    expect(sheet.notes).toBeNull();
    expect(sheet.allergies).toBe('Penicilina');
    expect(sheet.slots).toEqual([
      {
        time: '08:00',
        items: [
          {
            medication: 'Enalapril 10 mg',
            dose: '0,5 comprimido',
            instructions: null,
            days: 'Lunes, miércoles y viernes',
            period: 'Hasta el 30/11',
          },
          {
            medication: 'Metformina 850 mg',
            dose: '1 comprimido',
            instructions: 'Con la comida',
            days: 'Todos los días',
            period: null,
          },
        ],
      },
      {
        time: '20:00',
        items: [
          { medication: 'Enalapril 10 mg', dose: '2 comprimidos', instructions: null, days: 'Todos los días', period: 'Desde el 20/11' },
        ],
      },
    ]);
    expect(sheet.prescriptions.map((p) => [p.description, p.medication, p.status])).toEqual([
      ['Receta A', 'Enalapril 10 mg', 'EXPIRED'],
      ['Receta B', null, 'VALID'],
    ]);
  });

  it('describe los días y las unidades en castellano', () => {
    expect(daysLabel([])).toBe('Todos los días');
    expect(daysLabel([1, 2, 3, 4, 5])).toBe('De lunes a viernes');
    expect(daysLabel([7, 6])).toBe('Sábados y domingos');
    expect(daysLabel([2])).toBe('Martes');
    expect(unitsLabel(1, null)).toBe('1 unidad');
    expect(unitsLabel(10, 'gotas')).toBe('10 gotas');
  });
});
