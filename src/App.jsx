// App shell: header + profile tabs + timeframe toolbar, then the panels.
// Wrapped in BudgetProvider (see main.jsx).

import { useState } from 'react';
import { useBudget } from './context/BudgetContext.jsx';
import { useTheme } from './hooks/useTheme.js';
import BudgetTabs from './components/BudgetTabs.jsx';
import Toolbar from './components/Toolbar.jsx';
import SummaryCards from './components/SummaryCards.jsx';
import CategoryFilter from './components/CategoryFilter.jsx';
import ExpenseList from './components/ExpenseList.jsx';
import CategoryPieChart from './components/CategoryPieChart.jsx';
import MonthlyBarChart from './components/MonthlyBarChart.jsx';
import CategoryBudgets from './components/CategoryBudgets.jsx';
import Goals from './components/Goals.jsx';
import ExportImport from './components/ExportImport.jsx';
import CategoryManager from './components/CategoryManager.jsx';
import RecurringManager from './components/RecurringManager.jsx';
import ExpenseFormModal from './components/ExpenseFormModal.jsx';

export default function App() {
  const { activeBudget } = useBudget();
  const { theme, toggle } = useTheme();
  const [addOpen, setAddOpen] = useState(false);
  const [manageCats, setManageCats] = useState(false);
  const [manageRecurring, setManageRecurring] = useState(false);

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">
          <span className="heart">🌸</span> Bloom Budget
        </h1>
        <div className="section-actions">
          <button
            className="btn btn-sm btn-icon"
            onClick={toggle}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle light/dark theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button className="btn btn-sm" onClick={() => setManageCats(true)}>🏷️ Categories</button>
          <button className="btn btn-sm" onClick={() => setManageRecurring(true)}>🔁 Recurring</button>
          <ExportImport />
        </div>
      </header>

      <BudgetTabs />

      <Toolbar />

      <SummaryCards />

      <div style={{ height: 16 }} />
      <CategoryFilter />

      <div className="grid grid-2">
        <div className="grid" style={{ alignContent: 'start' }}>
          <ExpenseList />
        </div>
        <div className="grid" style={{ alignContent: 'start' }}>
          <CategoryPieChart />
          <MonthlyBarChart />
        </div>
      </div>

      <div style={{ height: 16 }} />
      <div className="grid grid-2">
        <CategoryBudgets />
        <Goals />
      </div>

      <p className="footer-note">
        💾 Saved on this device ({activeBudget.name}). Export a backup to keep it safe or move it between devices.
      </p>

      <button className="fab" onClick={() => setAddOpen(true)}>
        <span className="plus">＋</span> Add
      </button>

      {addOpen && <ExpenseFormModal onClose={() => setAddOpen(false)} />}
      {manageCats && <CategoryManager onClose={() => setManageCats(false)} />}
      {manageRecurring && <RecurringManager onClose={() => setManageRecurring(false)} />}
    </div>
  );
}
