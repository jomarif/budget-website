// Global state for the whole app: budgets/profiles, entries, categories,
// goals, recurring rules — plus the current UI view (active budget, timeframe,
// reference date, category filter). Persisted to localStorage on every change.

import {
  createContext, useContext, useEffect, useMemo, useReducer, useState, useCallback,
} from 'react';
import {
  loadState, saveState, makeBudget, uid, normalizeState, ensureSavingsCategory,
} from '../lib/storage.js';
import { catchUpRecurring } from '../lib/recurring.js';
import { CATEGORY_COLORS } from '../lib/defaults.js';

const BudgetContext = createContext(null);

// --- Reducer -----------------------------------------------------------------

function updateActiveBudget(state, updater) {
  return {
    ...state,
    budgets: state.budgets.map((b) =>
      b.id === state.activeBudgetId ? updater(b) : b
    ),
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'REPLACE_STATE':
      return normalizeState(action.state);

    case 'SET_ACTIVE_BUDGET':
      return { ...state, activeBudgetId: action.id };

    case 'ADD_BUDGET': {
      const budget = makeBudget(action.name, action.emoji);
      return { ...state, budgets: [...state.budgets, budget], activeBudgetId: budget.id };
    }

    case 'RENAME_BUDGET':
      return {
        ...state,
        budgets: state.budgets.map((b) =>
          b.id === action.id ? { ...b, name: action.name, emoji: action.emoji } : b
        ),
      };

    case 'DELETE_BUDGET': {
      if (state.budgets.length <= 1) return state; // always keep one
      const budgets = state.budgets.filter((b) => b.id !== action.id);
      const activeBudgetId =
        state.activeBudgetId === action.id ? budgets[0].id : state.activeBudgetId;
      return { ...state, budgets, activeBudgetId };
    }

    // --- Entries ---
    case 'ADD_ENTRY':
      return updateActiveBudget(state, (b) => ({
        ...b,
        entries: [...b.entries, { id: uid(), ...action.entry }],
      }));

    case 'UPDATE_ENTRY':
      return updateActiveBudget(state, (b) => ({
        ...b,
        entries: b.entries.map((e) =>
          e.id === action.entry.id ? { ...e, ...action.entry } : e
        ),
      }));

    case 'DELETE_ENTRY':
      return updateActiveBudget(state, (b) => ({
        ...b,
        entries: b.entries.filter((e) => e.id !== action.id),
      }));

    // --- Categories ---
    case 'ADD_CATEGORY':
      return updateActiveBudget(state, (b) => {
        const color =
          action.category.color ||
          CATEGORY_COLORS[b.categories.length % CATEGORY_COLORS.length];
        return {
          ...b,
          categories: [...b.categories, { id: uid(), monthlyBudget: null, ...action.category, color }],
        };
      });

    case 'UPDATE_CATEGORY':
      return updateActiveBudget(state, (b) => ({
        ...b,
        categories: b.categories.map((c) =>
          c.id === action.category.id ? { ...c, ...action.category } : c
        ),
      }));

    case 'DELETE_CATEGORY':
      return updateActiveBudget(state, (b) => ({
        ...b,
        categories: b.categories.filter((c) => c.id !== action.id),
        // Orphan entries keep their categoryId; UI renders them as "Uncategorized".
      }));

    // --- Goals ---
    case 'ADD_GOAL':
      return updateActiveBudget(state, (b) => ({
        ...b,
        goals: [...b.goals, { id: uid(), contributions: [], ...action.goal }],
      }));

    case 'UPDATE_GOAL':
      return updateActiveBudget(state, (b) => ({
        ...b,
        goals: b.goals.map((g) =>
          g.id === action.goal.id ? { ...g, ...action.goal } : g
        ),
      }));

    case 'DELETE_GOAL':
      return updateActiveBudget(state, (b) => ({
        ...b,
        goals: b.goals.filter((g) => g.id !== action.id),
      }));

    // A goal contribution is recorded as a real expense entry (filed under the
    // Savings category and linked by goalId) so it shows up in spending and the
    // breakdown. The goal's saved amount is derived from these entries.
    case 'ADD_CONTRIBUTION':
      return updateActiveBudget(state, (b) => {
        const goal = b.goals.find((g) => g.id === action.goalId);
        if (!goal) return b;
        const { budget, categoryId } = ensureSavingsCategory(b);
        return {
          ...budget,
          entries: [
            ...budget.entries,
            {
              id: uid(),
              name: `Saved for ${goal.name}`,
              categoryId,
              amount: action.amount,
              type: 'expense',
              date: action.date || new Date().toISOString(),
              goalId: goal.id,
            },
          ],
        };
      });

    // --- Recurring ---
    case 'ADD_RECURRING': {
      const withRule = updateActiveBudget(state, (b) => ({
        ...b,
        recurring: [...b.recurring, { id: uid(), lastGeneratedDate: null, ...action.rule }],
      }));
      // Immediately materialize any occurrences already due up to today.
      return catchUpRecurring(withRule);
    }

    case 'DELETE_RECURRING':
      return updateActiveBudget(state, (b) => ({
        ...b,
        recurring: b.recurring.filter((r) => r.id !== action.id),
      }));

    default:
      return state;
  }
}

// --- Provider ----------------------------------------------------------------

export function BudgetProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    const loaded = loadState();
    return catchUpRecurring(loaded); // materialize any missed recurring entries
  });

  // UI view state (not persisted in the data file).
  const [timeframe, setTimeframe] = useState('month');
  const [refDate, setRefDate] = useState(() => new Date().toISOString());
  const [categoryFilter, setCategoryFilter] = useState(null); // categoryId or null

  // Persist on every data change.
  useEffect(() => {
    saveState(state);
  }, [state]);

  const activeBudget = useMemo(
    () => state.budgets.find((b) => b.id === state.activeBudgetId) || state.budgets[0],
    [state]
  );

  const categoryById = useMemo(() => {
    const map = new Map();
    activeBudget.categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [activeBudget]);

  const getCategory = useCallback(
    (id) => categoryById.get(id) || { id, name: 'Uncategorized', emoji: '❓', color: '#c9c9d6' },
    [categoryById]
  );

  const value = {
    state,
    dispatch,
    activeBudget,
    getCategory,
    // view state
    timeframe, setTimeframe,
    refDate, setRefDate,
    categoryFilter, setCategoryFilter,
  };

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
}

export function useBudget() {
  const ctx = useContext(BudgetContext);
  if (!ctx) throw new Error('useBudget must be used within a BudgetProvider');
  return ctx;
}
