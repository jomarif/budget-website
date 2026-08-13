# 🌸 Bloom Budget

A cute, pink, browser-only budget app. No backend — all data lives in your
browser's `localStorage` and can be exported/imported as JSON for backup or to
move between devices.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build to dist/
```

> **Node note:** deps are pinned to **Vite 5 / React 18** because the local
> Node is 21.x, which Vite 7+/8 do not support. Bump these together only after
> moving to Node 20.19+ or 22.12+.

## Features

- **Profiles/tabs** — separate budgets per person (Person A, Person B, …).
- **Income + expenses** with custom categories (color + emoji; defaults seeded).
- **Add/edit/delete** entries via a popup modal; floating **＋ Add** button.
- **Filter by category** (chips + clickable pie slices).
- **Timeframe** grouping: month (default) / week / day, with period navigation.
- **Summaries:** income/spent/net cards, a category donut for the period, and a
  3-month income-vs-spending bar chart.
- **Monthly category budgets** with progress bars.
- **Goals/targets** (e.g. a hoodie) with a fill-up progress bar you contribute to.
- **Recurring** rules (monthly/weekly) auto-materialized into entries on load.
- **Export / Import JSON** backup.

## Architecture

- `src/lib/storage.js` — the single persistence boundary (localStorage). Swap
  this file to add a backend later; nothing else touches storage directly.
- `src/lib/{dates,money,recurring,defaults}.js` — pure helpers.
- `src/context/BudgetContext.jsx` — `useReducer` store + provider; persists on
  every change and runs recurring catch-up on load.
- `src/hooks/` — derived selectors (`usePeriod`) and theme-aware chart colors
  (`useThemeColors`, needed because Recharts sets colors as SVG attributes where
  `var(--x)` doesn't resolve).
- `src/components/` — UI, one component per feature.

Data model (one localStorage key, `budgetApp.v1`): a list of budgets, each with
`categories`, `entries`, `goals`, and `recurring`. See `src/lib/storage.js`.
