import { isoToDateOnly } from '../common/dates';
import { slotStatus } from './dose-status';
import { averageDailyUnits, isOccurrence, occurrenceInstant, occursOn } from './occurrences';

const AR = 'America/Argentina/Buenos_Aires';

const schedule = (overrides: Partial<Parameters<typeof occursOn>[0]> = {}) => ({
  timeOfDay: '08:00',
  daysOfWeek: [] as number[],
  startDate: isoToDateOnly('2026-11-01'),
  endDate: null as Date | null,
  ...overrides,
});

describe('occursOn', () => {
  it('respeta la vigencia', () => {
    const s = schedule({ endDate: isoToDateOnly('2026-11-10') });
    expect(occursOn(s, '2026-10-31')).toBe(false);
    expect(occursOn(s, '2026-11-01')).toBe(true);
    expect(occursOn(s, '2026-11-10')).toBe(true);
    expect(occursOn(s, '2026-11-11')).toBe(false);
  });

  it('filtra por día de la semana (1 = lunes)', () => {
    const s = schedule({ daysOfWeek: [1, 3, 5] });
    expect(occursOn(s, '2026-11-09')).toBe(true); // lunes
    expect(occursOn(s, '2026-11-10')).toBe(false); // martes
    expect(occursOn(s, '2026-11-13')).toBe(true); // viernes
  });
});

describe('occurrenceInstant', () => {
  it('convierte la hora local del grupo a UTC', () => {
    expect(occurrenceInstant('08:00', '2026-11-11', AR).toISOString()).toBe(
      '2026-11-11T11:00:00.000Z',
    );
    expect(occurrenceInstant('22:30', '2026-11-11', AR).toISOString()).toBe(
      '2026-11-12T01:30:00.000Z',
    );
  });
});

describe('isOccurrence', () => {
  const s = schedule({ timeOfDay: '22:30', daysOfWeek: [3] }); // miércoles

  it('acepta el instante exacto aunque en UTC sea otro día', () => {
    expect(isOccurrence(s, new Date('2026-11-12T01:30:00.000Z'), AR)).toBe(true);
  });

  it('rechaza horas o días que no corresponden', () => {
    expect(isOccurrence(s, new Date('2026-11-12T01:31:00.000Z'), AR)).toBe(false);
    expect(isOccurrence(s, new Date('2026-11-13T01:30:00.000Z'), AR)).toBe(false);
  });
});

describe('slotStatus', () => {
  const at = new Date('2026-11-11T11:00:00.000Z');
  const minutes = (n: number) => new Date(at.getTime() + n * 60_000);

  it('calcula el estado según la hora actual', () => {
    expect(slotStatus(at, minutes(-31))).toBe('UPCOMING');
    expect(slotStatus(at, minutes(-30))).toBe('DUE');
    expect(slotStatus(at, minutes(60))).toBe('DUE');
    expect(slotStatus(at, minutes(61))).toBe('OVERDUE');
  });

  it('prioriza el registro existente', () => {
    expect(slotStatus(at, minutes(500), { status: 'GIVEN' })).toBe('GIVEN');
    expect(slotStatus(at, minutes(-500), { status: 'SKIPPED' })).toBe('SKIPPED');
  });
});

describe('averageDailyUnits', () => {
  it('promedia los días de la semana', () => {
    expect(averageDailyUnits({ ...schedule(), unitsPerDose: 1 })).toBe(1);
    expect(averageDailyUnits({ ...schedule({ daysOfWeek: [1, 4] }), unitsPerDose: 3.5 })).toBe(1);
  });
});
