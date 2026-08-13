// The single persistence boundary for the app. Everything that touches
// localStorage lives here, so swapping to a backend later only changes this file.

import { DEFAULT_CATEGORIES } from './defaults.js';

export const STORAGE_KEY = 'budgetApp.v1';
export const SCHEMA_VERSION = 1;

function uid() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// Build a fresh budget/profile with default categories.
export function makeBudget(name = 'My Budget', emoji = '🌸') {
  return {
    id: uid(),
    name,
    emoji,
    categories: DEFAULT_CATEGORIES.map((c) => ({ id: uid(), ...c })),
    entries: [],
    goals: [],
    recurring: [],
  };
}

// The default app state used on first run.
export function makeInitialState() {
  const first = makeBudget('My Budget', '🌸');
  return {
    schemaVersion: SCHEMA_VERSION,
    activeBudgetId: first.id,
    budgets: [first],
  };
}

// Auto-managed category that goal contributions are filed under, so money put
// toward a goal shows up in the spendings list and the breakdown chart.
export const SAVINGS_CATEGORY = {
  name: 'Savings',
  emoji: '🐷',
  color: '#cf9df5',
  monthlyBudget: null,
  isSavings: true,
};

// Returns { budget, categoryId } — creating the Savings category if missing.
export function ensureSavingsCategory(budget) {
  const existing = budget.categories.find((c) => c.isSavings);
  if (existing) return { budget, categoryId: existing.id };
  const cat = { id: uid(), ...SAVINGS_CATEGORY };
  return {
    budget: { ...budget, categories: [...budget.categories, cat] },
    categoryId: cat.id,
  };
}

// One-time migration: older goals stored money in a `contributions` array.
// Convert those into real expense entries linked by goalId, so they appear in
// spending. Idempotent — after conversion the array is emptied.
export function migrateGoalContributions(state) {
  let changed = false;
  const budgets = state.budgets.map((budget) => {
    const hasLegacy = (budget.goals || []).some((g) => g.contributions?.length);
    if (!hasLegacy) return budget;

    changed = true;
    let working = budget;
    const newEntries = [];
    const goals = budget.goals.map((g) => {
      if (!g.contributions?.length) return g;
      const ensured = ensureSavingsCategory(working);
      working = ensured.budget;
      g.contributions.forEach((ct) => {
        newEntries.push({
          id: ct.id || uid(),
          name: `Saved for ${g.name}`,
          categoryId: ensured.categoryId,
          amount: ct.amount,
          type: 'expense',
          date: ct.date,
          goalId: g.id,
        });
      });
      return { ...g, contributions: [] };
    });
    return { ...working, goals, entries: [...working.entries, ...newEntries] };
  });
  return changed ? { ...state, budgets } : state;
}

// Basic shape validation so a corrupt/foreign JSON import can't crash the app.
export function isValidState(state) {
  return (
    state &&
    typeof state === 'object' &&
    Array.isArray(state.budgets) &&
    state.budgets.length > 0 &&
    state.budgets.every(
      (b) =>
        b &&
        typeof b.id === 'string' &&
        Array.isArray(b.categories) &&
        Array.isArray(b.entries)
    )
  );
}

// Fill in any missing arrays on an imported/loaded state (forward-compatible).
export function normalizeState(state) {
  const budgets = state.budgets.map((b) => ({
    goals: [],
    recurring: [],
    ...b,
    categories: b.categories || [],
    entries: b.entries || [],
  }));
  const activeExists = budgets.some((b) => b.id === state.activeBudgetId);
  return {
    schemaVersion: SCHEMA_VERSION,
    activeBudgetId: activeExists ? state.activeBudgetId : budgets[0].id,
    budgets,
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return makeInitialState();
    const parsed = JSON.parse(raw);
    if (!isValidState(parsed)) return makeInitialState();
    return migrateGoalContributions(normalizeState(parsed));
  } catch (err) {
    console.warn('Failed to load saved data, starting fresh.', err);
    return makeInitialState();
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save data.', err);
  }
}

// --- Export / Import ---------------------------------------------------------

export function exportToJSON(state) {
  return JSON.stringify(state, null, 2);
}

// Parses and validates an imported JSON string; throws on invalid data.
export function parseImportedJSON(text) {
  const parsed = JSON.parse(text);
  if (!isValidState(parsed)) {
    throw new Error('This file does not look like a valid budget export.');
  }
  return normalizeState(parsed);
}

export { uid };
