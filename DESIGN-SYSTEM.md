# S&S Journal · Workspace 68

## Visual language
Neutral, quiet surfaces; RTL first. Dark: #0B1017 background, #151C25 surface, #29313D border, #F5F6F8 text, #929BA8 secondary. Financial positive #21C78A, negative #EF6473. Light theme adjusts financial colors to #087D54 and #C33448 for contrast. No decorative financial colors on navigation or model choices.

Vazirmatn for Persian, Inter for financial labels and tabular figures. Existing fonts remain available for compatibility. Surface radii 12–16px; control radii 8–10px. Motion 180ms with reduced-motion support. Keyboard focus is neutral and visible.

## Structure
- Workspace header, active account selector, right sidebar.
- Dashboard: four range-scoped KPIs, existing interactive equity chart, account progress, closed-trade drawdown, recent trades, current-month mini calendar.
- Reports: all pre-existing detailed reports, R statistics and account statistics retained.
- Accounts: account cards, balances, commission and challenge rules.
- Settings: profile, synchronization, backup/import/export and sign-out.
- Journal, Calendar, Checklist, Roadmap and Backtest retain their original operations and data access.
- Mobile: dedicated five-control bottom navigation with centered add; secondary routes in native dialog; safe-area padding. Two-column KPIs and stacked chart/cards.

## Implementation boundaries
`design-system.css` owns tokens, responsive surfaces and control presentation. `workspace-ui.js` owns new view presentation and navigation shortcuts. `index.html` provides reorganized semantic structure. The original `app.js` adds one presentation event after dashboard rendering and redirects profile shortcuts to Settings. Original accounting/normalization/checklist logic remains unchanged. `ui-enhance.js` retains command palette and calendar enhancement while disabling obsolete glow/pill/count-up decoration. Service worker uses cache v68.

## Data semantics
KPI inputs use `computeAnnotated`, `perfStats`, `calcNet` and the existing result classification. Profit factor uses positive net sum / absolute negative net sum, matching `renderExpectancy`. Balance uses existing accountFigures, including cashflows. Additional drawdown is explicitly closed-trade balance drawdown and not a live-equity risk monitor. No new database schema or local data migration.

## Runtime
Static HTML/CSS/JS, no build step. Host website/ contents on the current GitHub Pages origin. Supabase configuration and external font/CDN dependencies remain as before. Public files never embed the private owner model. Do not distribute the backup's private SQL publicly.
