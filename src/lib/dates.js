// Date helpers for grouping entries by timeframe (day / week / month) and
// navigating between periods. Built on date-fns.

import {
  startOfDay, endOfDay,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  addDays, addWeeks, addMonths,
  subMonths,
  isWithinInterval,
  format,
} from 'date-fns';

export const TIMEFRAMES = ['day', 'week', 'month'];

// Week starts on Monday.
const WEEK_OPTS = { weekStartsOn: 1 };

// Returns { start, end } Date interval for the period containing `ref`.
export function periodRange(timeframe, ref) {
  const d = ref instanceof Date ? ref : new Date(ref);
  switch (timeframe) {
    case 'day':
      return { start: startOfDay(d), end: endOfDay(d) };
    case 'week':
      return { start: startOfWeek(d, WEEK_OPTS), end: endOfWeek(d, WEEK_OPTS) };
    case 'month':
    default:
      return { start: startOfMonth(d), end: endOfMonth(d) };
  }
}

// Move the reference date forward/backward by one period.
export function shiftPeriod(timeframe, ref, direction) {
  const d = ref instanceof Date ? ref : new Date(ref);
  switch (timeframe) {
    case 'day':
      return addDays(d, direction);
    case 'week':
      return addWeeks(d, direction);
    case 'month':
    default:
      return addMonths(d, direction);
  }
}

// Human label for the current period, e.g. "August 2026", "Aug 4 – 10", "Aug 7".
export function periodLabel(timeframe, ref) {
  const { start, end } = periodRange(timeframe, ref);
  switch (timeframe) {
    case 'day':
      return format(start, 'EEE, MMM d, yyyy');
    case 'week':
      return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
    case 'month':
    default:
      return format(start, 'MMMM yyyy');
  }
}

export function isInPeriod(dateISO, timeframe, ref) {
  const { start, end } = periodRange(timeframe, ref);
  return isWithinInterval(new Date(dateISO), { start, end });
}

// Returns the last `count` months (including `ref`'s month), oldest first,
// each as { key, label, start, end }.
export function recentMonths(ref, count) {
  const base = ref instanceof Date ? ref : new Date(ref);
  const months = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = subMonths(base, i);
    months.push({
      key: format(d, 'yyyy-MM'),
      label: format(d, 'MMM'),
      start: startOfMonth(d),
      end: endOfMonth(d),
    });
  }
  return months;
}

// For the <input type="date"> value (yyyy-MM-dd) <-> ISO helpers.
export function toDateInputValue(dateISO) {
  return format(new Date(dateISO), 'yyyy-MM-dd');
}

export function fromDateInputValue(value) {
  // Interpret the picked calendar day at noon local time to avoid TZ drift.
  return new Date(`${value}T12:00:00`).toISOString();
}

export function formatEntryDate(dateISO) {
  return format(new Date(dateISO), 'MMM d, yyyy');
}
