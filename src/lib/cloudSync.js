// Cloud sync layer: translates between the app's nested state tree
// ({ budgets: [ { categories, entries, goals, recurring } ] }) and the
// normalized Supabase tables (one row per entity), and computes minimal
// row-level writes by diffing the previous synced snapshot against the next.
//
// Why diff instead of mapping each reducer action to a query: the reducer
// already produces a fresh full state on every action, so diffing catches
// every change (including multi-row ones like adding a budget with its default
// categories, or recurring catch-up) in one generic place, and issues only the
// rows that actually changed — which is what makes concurrent edits from two
// devices safe (each edit touches only its own rows).

import { SCHEMA_VERSION } from './storage.js';

export const SYNC_TABLES = ['budgets', 'categories', 'entries', 'goals', 'recurring'];

const num = (v) => (v == null ? null : Number(v));

// --- Nested state  ->  flat rows (snake_case, with user_id + FKs) ------------

export function flattenState(state, userId) {
  const flat = { budgets: [], categories: [], entries: [], goals: [], recurring: [] };
  for (const b of state.budgets) {
    flat.budgets.push({ id: b.id, user_id: userId, name: b.name, emoji: b.emoji ?? null });

    for (const c of b.categories || []) {
      flat.categories.push({
        id: c.id, user_id: userId, budget_id: b.id,
        name: c.name, emoji: c.emoji ?? null, color: c.color ?? null,
        monthly_budget: c.monthlyBudget ?? null, is_savings: !!c.isSavings,
      });
    }
    for (const e of b.entries || []) {
      flat.entries.push({
        id: e.id, user_id: userId, budget_id: b.id,
        category_id: e.categoryId ?? null, name: e.name, amount: e.amount,
        type: e.type, date: e.date,
        goal_id: e.goalId ?? null, recurring_id: e.recurringId ?? null,
      });
    }
    for (const g of b.goals || []) {
      flat.goals.push({
        id: g.id, user_id: userId, budget_id: b.id,
        name: g.name, emoji: g.emoji ?? null, target_amount: g.targetAmount ?? null,
      });
    }
    for (const r of b.recurring || []) {
      flat.recurring.push({
        id: r.id, user_id: userId, budget_id: b.id,
        name: r.name, category_id: r.categoryId ?? null, amount: r.amount,
        type: r.type, frequency: r.frequency, day_of_month: r.dayOfMonth ?? null,
        start_date: r.startDate ?? null, last_generated_date: r.lastGeneratedDate ?? null,
      });
    }
  }
  return flat;
}

// --- Flat DB rows  ->  nested state ------------------------------------------

function groupBy(rows, key) {
  const m = new Map();
  for (const r of rows) {
    if (!m.has(r[key])) m.set(r[key], []);
    m.get(r[key]).push(r);
  }
  return m;
}

// preferredActiveId keeps the device's current budget selection if it still
// exists after a remote refresh; otherwise falls back to the first budget.
export function assembleState(rows, preferredActiveId) {
  const cats = groupBy(rows.categories || [], 'budget_id');
  const ents = groupBy(rows.entries || [], 'budget_id');
  const gls = groupBy(rows.goals || [], 'budget_id');
  const recs = groupBy(rows.recurring || [], 'budget_id');

  const budgets = (rows.budgets || []).map((b) => ({
    id: b.id,
    name: b.name,
    emoji: b.emoji,
    categories: (cats.get(b.id) || []).map((c) => ({
      id: c.id, name: c.name, emoji: c.emoji, color: c.color,
      monthlyBudget: c.monthly_budget == null ? null : num(c.monthly_budget),
      isSavings: !!c.is_savings,
    })),
    entries: (ents.get(b.id) || []).map((e) => ({
      id: e.id, name: e.name, categoryId: e.category_id, amount: num(e.amount),
      type: e.type, date: e.date,
      ...(e.goal_id ? { goalId: e.goal_id } : {}),
      ...(e.recurring_id ? { recurringId: e.recurring_id } : {}),
    })),
    goals: (gls.get(b.id) || []).map((g) => ({
      id: g.id, name: g.name, emoji: g.emoji,
      targetAmount: g.target_amount == null ? null : num(g.target_amount),
      contributions: [],
    })),
    recurring: (recs.get(b.id) || []).map((r) => ({
      id: r.id, name: r.name, categoryId: r.category_id, amount: num(r.amount),
      type: r.type, frequency: r.frequency,
      ...(r.day_of_month == null ? {} : { dayOfMonth: r.day_of_month }),
      startDate: r.start_date, lastGeneratedDate: r.last_generated_date,
    })),
  }));

  const activeBudgetId = budgets.some((b) => b.id === preferredActiveId)
    ? preferredActiveId
    : budgets[0]?.id ?? null;

  return { schemaVersion: SCHEMA_VERSION, activeBudgetId, budgets };
}

// --- Diffing -----------------------------------------------------------------

function shallowEqual(a, b) {
  const ak = Object.keys(a);
  if (ak.length !== Object.keys(b).length) return false;
  return ak.every((k) => a[k] === b[k]);
}

function diffTable(prevRows, nextRows) {
  const prevById = new Map(prevRows.map((r) => [r.id, r]));
  const nextById = new Map(nextRows.map((r) => [r.id, r]));
  const upserts = [];
  const deletes = [];
  for (const [id, row] of nextById) {
    const prev = prevById.get(id);
    if (!prev || !shallowEqual(prev, row)) upserts.push(row);
  }
  for (const id of prevById.keys()) if (!nextById.has(id)) deletes.push(id);
  return { upserts, deletes };
}

// A stable string fingerprint of a flat snapshot, used to detect "the refetch
// we just got back is identical to what we already have" (i.e. the echo of our
// own write) so we can skip a redundant re-render.
export function flatSignature(flat) {
  return JSON.stringify(
    SYNC_TABLES.map((t) => [...flat[t]].sort((a, b) => (a.id < b.id ? -1 : 1)))
  );
}

// Issues the minimal set of writes to move the DB from prevFlat to nextFlat.
// Ordering respects the budget FK: parents upserted before children; deletes
// rely on ON DELETE CASCADE so child deletes are belt-and-suspenders.
export async function pushDiff(prevFlat, nextFlat, supabase) {
  const diffs = {};
  for (const t of SYNC_TABLES) diffs[t] = diffTable(prevFlat[t], nextFlat[t]);

  const children = ['categories', 'entries', 'goals', 'recurring'];

  // Upserts: budgets first (parent), then children in parallel.
  if (diffs.budgets.upserts.length) {
    const { error } = await supabase.from('budgets').upsert(diffs.budgets.upserts);
    if (error) throw error;
  }
  await Promise.all(
    children
      .filter((t) => diffs[t].upserts.length)
      .map((t) =>
        supabase.from(t).upsert(diffs[t].upserts).then(({ error }) => {
          if (error) throw error;
        })
      )
  );

  // Deletes: children first (parallel), then budgets.
  await Promise.all(
    children
      .filter((t) => diffs[t].deletes.length)
      .map((t) =>
        supabase.from(t).delete().in('id', diffs[t].deletes).then(({ error }) => {
          if (error) throw error;
        })
      )
  );
  if (diffs.budgets.deletes.length) {
    const { error } = await supabase.from('budgets').delete().in('id', diffs.budgets.deletes);
    if (error) throw error;
  }
}

// Fetches every row this user owns, across all tables, in parallel.
export async function fetchAllRows(supabase, userId) {
  const results = await Promise.all(
    SYNC_TABLES.map((t) => supabase.from(t).select('*').eq('user_id', userId))
  );
  const rows = {};
  results.forEach((res, i) => {
    if (res.error) throw res.error;
    rows[SYNC_TABLES[i]] = res.data;
  });
  return rows;
}
