# Daybook

Your whole day, on one calm screen. A daily planner that puts *what's happening right now* on top, keeps tasks and check-ins one glance away, and works the same on desktop and phone.

No frameworks, no build step. Plain HTML, CSS and JavaScript — open `index.html` and it runs.

## Run it

```
# any static server works
npx serve .
# or
python3 -m http.server 8080
```

Then open `http://localhost:8080`. Opening `index.html` directly from disk also works in most browsers.

## Pages

| Route | What it is |
|---|---|
| `index.html` | Landing page with a live, scrubbable demo of the app |
| `login.html` / `signup.html` | Auth (mock — any valid email + password gets you in) |
| `onboarding.html` | Three-step setup: name, what to track, day hours |
| `app/index.html` | **Today** — live "Now" block, day ribbon, schedule, tasks, focus chart, check-ins |
| `app/schedule.html` | **Schedule** — week strip, hour-by-hour day view, add/edit events |
| `app/tasks.html` | **Tasks** — lists, search, grouping by day, task detail with notes |
| `app/insights.html` | **Insights** — focus, sleep, completion ring, generated observations |
| `app/settings.html` | **Settings** — profile, theme, day hours, check-ins, notifications, export/reset |

Try it without an account: `app/index.html?demo=1`.

## Structure

```
daybook/
├── index.html · login.html · signup.html · onboarding.html
├── app/            today, schedule, tasks, insights, settings
├── assets/
│   ├── css/
│   │   ├── tokens.css     design tokens, light/dark themes
│   │   ├── base.css       reset + shared components (buttons, inputs, cards, chips, sheet, palette, toast, ribbon)
│   │   ├── landing.css
│   │   ├── auth.css       auth + onboarding
│   │   └── app.css        app shell + page layouts
│   └── js/
│       ├── icons.js       inline SVG icon set
│       ├── store.js       state + localStorage persistence + seed data
│       ├── ui.js          formatting, ribbon renderer, toast, sheet, command palette
│       ├── shell.js       app chrome: sidebar/tab bar, auth guard, add-task sheet, shortcuts
│       ├── landing.js · auth.js · onboarding.js
│       └── pages/         today.js · schedule.js · tasks.js · insights.js · settings.js
└── README.md
```

## Keyboard

`⌘K` command palette · `N` new task · `T` toggle theme · `1–5` switch pages · `/` search (Tasks) · `Esc` close

## Design notes

- **Typeface:** Geist, one family for everything, tight tracking on display sizes.
- **Palette:** warm off-white canvas, white cards, near-black ink, a single electric-blue accent. Green is reserved for "done", coral for the live now-marker.
- **Signature element:** the day ribbon — a horizontal strip of the day with a moving now-line. It appears on the landing page (scrubbable), the auth panel (auto-playing), the Today hero (live), and the Schedule sidebar.
- **Responsive:** 248px sidebar on desktop, icon rail under 1100px, pill tab bar + floating "+" under 720px.
- Respects `prefers-reduced-motion` and `prefers-color-scheme`; visible focus rings throughout.

## Making it yours

- Sample data lives in `assets/js/store.js` (`WEEK`, `seedTasks`, `focus`, `sleep`).
- Tokens (colors, radii, shadows, type scale) are all in `assets/css/tokens.css`.
- To wire up a real backend, replace `Store.save()` / `load()` and the mock `finish()` in `auth.js`.
