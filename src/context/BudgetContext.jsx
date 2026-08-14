// Global state for the whole app: budgets/profiles, entries, categories,
// goals, recurring rules — plus the current UI view (active budget, timeframe,
// reference date, category filter). Persisted to localStorage on every change.

import {
  createContext, useContext, useEffect, useMemo, useReducer, useRef, useState, useCallback,
} from 'react';
import {
  loadState, saveState, makeBudget, uid, normalizeState, ensureSavingsCategory,
} from '../lib/storage.js';
import { catchUpRecurring } from '../lib/recurring.js';
import { CATEGORY_COLORS } from '../lib/defaults.js';
import { supabase } from '../lib/supabaseClient.js';
import {
  SYNC_TABLES, flattenState, assembleState, flatSignature, pushDiff, fetchAllRows,
} from '../lib/cloudSync.js';
import { useAuth } from './AuthContext.jsx';

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
  const { user } = useAuth();
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    const loaded = loadState();
    return catchUpRecurring(loaded); // materialize any missed recurring entries
  });

  // UI view state (not persisted in the data file).
  const [timeframe, setTimeframe] = useState('month');
  const [refDate, setRefDate] = useState(() => new Date().toISOString());
  // Selected category ids to filter by. Empty set = "All" (no filtering).
  const [categoryFilter, setCategoryFilter] = useState(() => new Set());
  const toggleCategoryFilter = useCallback((id) => {
    setCategoryFilter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const clearCategoryFilter = useCallback(() => setCategoryFilter(new Set()), []);

  // --- Cloud sync (Supabase, normalized tables) -------------------------------
  // Row-level sync so two devices editing *different* rows don't clobber each
  // other. On every local change we diff the previous synced snapshot against
  // the current state and push only the rows that changed. On any remote change
  // we refetch and rebuild the tree. `lastFlatRef` is the snapshot we believe
  // the DB currently holds — it's both the diff baseline and the echo detector.
  const [syncStatus, setSyncStatus] = useState('offline'); // offline|syncing|synced|error
  const pulledRef = useRef(false);          // initial pull done for this session?
  const skipNextPushRef = useRef(false);    // next state change came from the network
  const lastFlatRef = useRef(null);         // flat snapshot the DB is believed to hold

  // Keep the latest active-budget id reachable from the realtime callback
  // without re-subscribing on every selection change.
  const activeIdRef = useRef(state.activeBudgetId);
  useEffect(() => {
    activeIdRef.current = state.activeBudgetId;
  }, [state.activeBudgetId]);

  // Persist locally on every data change (instant, always-on offline cache).
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Initial pull on login. If the account already has rows, remote wins (then
  // recurring catch-up runs against it, and the push effect below reconciles
  // any newly materialized entries). If it's empty, seed it from local state.
  useEffect(() => {
    if (!supabase || !user) {
      pulledRef.current = false;
      return;
    }
    let cancelled = false;
    setSyncStatus('syncing');
    fetchAllRows(supabase, user.id)
      .then((rows) => {
        if (cancelled) return;
        const hasCloudData = rows.budgets.length > 0;
        if (hasCloudData) {
          const cloudState = assembleState(rows, activeIdRef.current);
          lastFlatRef.current = flattenState(cloudState, user.id); // baseline = cloud
          pulledRef.current = true;
          // catchUpRecurring may add entries; those get pushed by the effect below.
          dispatch({ type: 'REPLACE_STATE', state: catchUpRecurring(cloudState) });
          setSyncStatus('synced');
        } else {
          const emptyFlat = flattenState({ budgets: [] }, user.id);
          const localFlat = flattenState(state, user.id);
          lastFlatRef.current = emptyFlat;
          pulledRef.current = true;
          pushDiff(emptyFlat, localFlat, supabase)
            .then(() => {
              lastFlatRef.current = localFlat;
              setSyncStatus('synced');
            })
            .catch((err) => {
              console.error('Cloud seed failed', err);
              setSyncStatus('error');
            });
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Cloud sync pull failed', err);
        setSyncStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Debounced diff-push whenever state changes locally after the initial pull.
  useEffect(() => {
    if (!supabase || !user || !pulledRef.current) return;
    if (skipNextPushRef.current) {
      skipNextPushRef.current = false;
      return; // this change came from the network — DB already matches
    }
    const nextFlat = flattenState(state, user.id);
    setSyncStatus('syncing');
    const timer = setTimeout(() => {
      pushDiff(lastFlatRef.current, nextFlat, supabase)
        .then(() => {
          lastFlatRef.current = nextFlat;
          setSyncStatus('synced');
        })
        .catch((err) => {
          console.error('Cloud sync push failed', err);
          setSyncStatus('error');
        });
    }, 600);
    return () => clearTimeout(timer);
  }, [state, user]);

  // Live updates from other devices: any row change on any table triggers a
  // debounced full refetch. If the refetched snapshot is identical to what we
  // last pushed (the echo of our own write), we skip re-applying it.
  useEffect(() => {
    if (!supabase || !user) return;
    let timer;
    const scheduleRefetch = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        fetchAllRows(supabase, user.id)
          .then((rows) => {
            const remoteState = assembleState(rows, activeIdRef.current);
            const remoteFlat = flattenState(remoteState, user.id);
            if (lastFlatRef.current && flatSignature(remoteFlat) === flatSignature(lastFlatRef.current)) {
              return; // echo of our own write — nothing new
            }
            lastFlatRef.current = remoteFlat;
            skipNextPushRef.current = true;
            dispatch({ type: 'REPLACE_STATE', state: remoteState });
            setSyncStatus('synced');
          })
          .catch((err) => console.error('Cloud sync refetch failed', err));
      }, 400);
    };

    const channel = supabase.channel(`sync_${user.id}`);
    for (const table of SYNC_TABLES) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `user_id=eq.${user.id}` },
        scheduleRefetch
      );
    }
    channel.subscribe();
    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [user]);

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
    syncStatus,
    // view state
    timeframe, setTimeframe,
    refDate, setRefDate,
    categoryFilter, toggleCategoryFilter, clearCategoryFilter,
  };

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
}

export function useBudget() {
  const ctx = useContext(BudgetContext);
  if (!ctx) throw new Error('useBudget must be used within a BudgetProvider');
  return ctx;
}
