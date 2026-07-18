# Task T1 — Template Package Builder

## Summary
Built a complete multi-file HTML template package at `/home/z/my-project/public/template/` (12 HTML pages + 8 shared assets + README). All pages open standalone, no build step, CDN-only.

## Files created (22 total, 3,416 lines)
- 13 HTML pages: index, login, register, forgot-password, dashboard, chatbot, contacts, properties, orders, marketing, finance, users, settings
- 8 assets: shared.css, tailwind-config.js, data.js, rbac.js, auth.js, layout.js, ui-helpers.js, charts.js
- 1 README.md

## Key design decisions
- Split single-file ui.html into shared JS modules exposed on `window` (no ES modules — works with file://).
- Added two extra asset files beyond the spec:
  - `tailwind-config.js` — sets `tailwind.config` once after CDN loads (avoids repeating the long config block in each HTML head).
  - `ui-helpers.js` — centralizes badge meta maps (STAGE_META, TAG_META, ORDER_STATUS_META, etc.) used by 6+ pages.
- localStorage keys: `propertiku-auth` (user object) and `propertiku-theme` (light/dark) — matching the task spec exactly.
- Anti-flash: each page's `<head>` has a tiny inline script that applies the dark class before paint.
- Sidebar uses plain `<a href="dashboard.html">` for navigation; active item highlighted via `activeView` parameter passed to `renderLayoutShell`.
- requireAuth() and requireAccess(view) guard every dashboard page; RBAC denial redirects to dashboard.html with a toast.

## Verification (agent-browser)
- All 13 pages load with **zero console errors** (only the standard Tailwind CDN production warning).
- Charts render visibly: dashboard (revenue + lead donut), finance (revenue bar + invoice donut), marketing (campaign read/replied bar).
- Chatbot send message: outbound appended with ✓✓ ticks progressing sent→delivered→read; AI auto-reply appears after 1.2s.
- Theme toggle persists across page navigation AND reload (no flash).
- Mobile 390px viewport: hamburger sidebar opens, no horizontal scroll, chatbot swaps list/conversation properly.
- RBAC denial: marketing role trying `/template/users.html` → redirected to dashboard.html with toast.
- Login flow: form submit → redirect to dashboard.html; 6 quick-login buttons work.
- Register flow: form submit with terms checkbox → auth set as operator → redirect dashboard.
- Forgot password: submit → success state "Cek Email Anda" + back-to-login.
- Orders table↔kanban toggle works (8 rows ↔ 5 columns).
- Contacts card↔table toggle works; detail modal opens.
- Properties detail modal opens.
- Finance mark-as-paid: toast + invoice row updates.
- Users add user modal: form submit → row count increases from 9 to 10.
- Users edit user modal: role dropdown change updates live menu access preview.
- Settings 4 tabs (Profil/Integrasi/RBAC/Preferensi) all render correctly; theme toggle from Preferensi works.

## Issue found + fixed during verification
- Initial run: register.html / login.html / forgot-password.html / index.html were missing the `<script src="assets/layout.js">` tag, but their inline scripts called `refreshIcons()` (defined in layout.js) → ReferenceError killed the script before form submit handlers attached → forms GET-submitted instead of going through JS. Fixed by adding `<script src="assets/layout.js">` to all 4 pages.

## Lint
`bun run lint` → exit 0 (clean). Template files are not processed by ESLint anyway (only `src/`).
