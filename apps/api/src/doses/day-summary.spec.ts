import { formatDaySummary, type SummaryDose } from './day-summary';

const ZONE = 'America/Argentina/Buenos_Aires';
const med = (name: string, strength: string | null = null) => ({ name, strength });

describe('formatDaySummary', () => {
  it('agrupa por estado con responsable, motivo y avisos, en la zona del grupo', () => {
    const doses: SummaryDose[] = [
      {
        timeOfDay: '08:00',
        status: 'GIVEN',
        medication: med('Enalapril', '10 mg'),
        // 11:31 UTC = 08:31 en Buenos Aires
        record: { notes: null, recordedAt: new Date('2026-11-12T11:31:00Z'), recordedBy: { name: 'Ana' } },
      },
      {
        timeOfDay: '13:00',
        status: 'SKIPPED',
        medication: med('Metformina'),
        record: { notes: 'No quiso comer', recordedAt: new Date('2026-11-12T16:05:00Z'), recordedBy: { name: 'Lucas' } },
      },
      { timeOfDay: '14:00', status: 'OVERDUE', medication: med('Atorvastatina'), record: null },
      { timeOfDay: '20:00', status: 'UPCOMING', medication: med('Enalapril', '10 mg'), record: null },
    ];

    const text = formatDaySummary({
      patientName: 'Marta',
      date: '2026-11-12',
      timezone: ZONE,
      doses,
      alerts: ['Enalapril: quedan 3 comprimidos (≈ 1 días)'],
    });

    expect(text).toBe(
      [
        '*MediControl · Marta*',
        'Jueves 12 de noviembre',
        '',
        '*Atrasadas (1)*',
        '- 14:00 Atorvastatina',
        '',
        '*Dadas (1)*',
        '- 08:00 Enalapril 10 mg (Ana, 08:31)',
        '',
        '*Omitidas (1)*',
        '- 13:00 Metformina (Lucas): No quiso comer',
        '',
        '*Pendientes (1)*',
        '- 20:00 Enalapril 10 mg',
        '',
        '*Avisos*',
        '- Enalapril: quedan 3 comprimidos (≈ 1 días)',
      ].join('\n'),
    );
  });

  it('avisa cuando no hay tomas', () => {
    const text = formatDaySummary({ patientName: 'Marta', date: '2026-11-15', timezone: ZONE, doses: [], alerts: [] });
    expect(text).toBe('*MediControl · Marta*\nDomingo 15 de noviembre\n\nNo hay tomas programadas para este día.');
  });
});
