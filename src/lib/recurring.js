// Materializes recurring rules into concrete entries. Runs once on app load:
// for each recurring rule it generates any occurrences that fall between the
// last generated date (exclusive) and today (inclusive), then records how far
// it has caught up.

import {
  addMonths, addWeeks, isBefore, isEqual,
  setDate, getDaysInMonth, startOfDay,
} from 'date-fns';
import { uid } from './storage.js';

// Given a recurring rule, returns the first occurrence date on/after its start.
function firstOccurrence(rule) {
  const start = startOfDay(new Date(rule.startDate));
  if (rule.frequency === 'weekly') {
    return start;
  }
  // monthly: anchor to dayOfMonth, clamped to month length.
  const day = Math.min(rule.dayOfMonth || start.getDate(), getDaysInMonth(start));
  const anchored = setDate(start, day);
  return isBefore(anchored, start) ? addMonths(anchored, 1) : anchored;
}

function nextOccurrence(rule, date) {
  if (rule.frequency === 'weekly') {
    return addWeeks(date, 1);
  }
  const stepped = addMonths(date, 1);
  const day = Math.min(rule.dayOfMonth || date.getDate(), getDaysInMonth(stepped));
  return setDate(stepped, day);
}

// Returns { entries: [...newEntries], lastGeneratedDate } for one rule.
function generateForRule(rule, today) {
  const newEntries = [];
  const cursorStart = rule.lastGeneratedDate
    ? nextOccurrence(rule, startOfDay(new Date(rule.lastGeneratedDate)))
    : firstOccurrence(rule);

  let cursor = cursorStart;
  let lastGenerated = rule.lastGeneratedDate
    ? startOfDay(new Date(rule.lastGeneratedDate))
    : null;

  // Safety cap to avoid runaway loops on bad data.
  let guard = 0;
  while ((isBefore(cursor, today) || isEqual(cursor, today)) && guard < 1000) {
    if (!isBefore(cursor, startOfDay(new Date(rule.startDate)))) {
      newEntries.push({
        id: uid(),
        name: rule.name,
        categoryId: rule.categoryId,
        amount: rule.amount,
        type: rule.type || 'expense',
        date: cursor.toISOString(),
        recurringId: rule.id,
      });
      lastGenerated = cursor;
    }
    cursor = nextOccurrence(rule, cursor);
    guard += 1;
  }

  return {
    entries: newEntries,
    lastGeneratedDate: lastGenerated ? lastGenerated.toISOString() : rule.lastGeneratedDate,
  };
}

// Processes all recurring rules across all budgets. Returns a new state if
// anything changed, otherwise the original state (referential equality lets
// callers skip a redundant save).
export function catchUpRecurring(state, now = new Date()) {
  const today = startOfDay(now);
  let changed = false;

  const budgets = state.budgets.map((budget) => {
    if (!budget.recurring || budget.recurring.length === 0) return budget;

    const addedEntries = [];
    const recurring = budget.recurring.map((rule) => {
      const result = generateForRule(rule, today);
      if (result.entries.length > 0) {
        addedEntries.push(...result.entries);
        changed = true;
        return { ...rule, lastGeneratedDate: result.lastGeneratedDate };
      }
      return rule;
    });

    if (addedEntries.length === 0) return budget;
    return {
      ...budget,
      entries: [...budget.entries, ...addedEntries],
      recurring,
    };
  });

  return changed ? { ...state, budgets } : state;
}
