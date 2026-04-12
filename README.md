# PhaseDo

A lightweight, local-first daily task tracker designed for **phase-based execution** — tasks that repeat every day within a fixed start-to-end date range.

PhaseDo is neither a traditional to-do list nor an infinite habit tracker. It tracks whether you completed every step of a task *each day*, across a defined time window.

---

## Features

- **Time-bounded tasks** — every task has a `start` and optional `end` date
- **Three task states** — `upcoming`, `ongoing`, `finished`; only active tasks are shown
- **Grouped view** — organize tasks into named groups displayed as sections on the main page
- **Sub-tag check-ins** — tasks can be split into named sub-tags, each with a daily count target (`max`); the task is only marked complete when all tags reach their target
- **Simple check-in** — tag-less tasks are toggled complete with a single click
- **Smart sort** — within each group, incomplete tasks are shown first, then sorted by today's completion rate and days remaining
- **Upcoming section** — tasks not yet started are listed separately, sorted by start date
- **Task modal** — create, edit, or view tasks; supports group creation inline and historical tag autocomplete
- **Global tag deletion** — remove a tag name from all tasks and logs at once
- **Group management** — delete a group and choose to move its tasks to another group or delete them together
- **Local storage** — all data persists in the browser's `localStorage`; no backend, no account required
- **Desktop app** — ships as an Electron wrapper with a Windows installer built via GitHub Actions

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI | React 19 |
| Build | Vite 6 |
| Styling | Tailwind CSS 4 (Vite plugin) |
| Desktop | Electron 41 |
| Packaging | electron-builder (Windows NSIS) |

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- npm

### Install dependencies

```bash
npm install
```

### Run in browser (dev)

```bash
npm run dev
```

Opens at `http://localhost:5173`.

### Run as desktop app (dev)

```bash
npm run electron:dev
```

Starts the Vite dev server and launches Electron simultaneously.

### Build for production

```bash
npm run build
```

Output goes to `dist/`.

### Package Windows installer

```bash
npm run dist:win
```

Produces `release/PhaseDo-Setup-<version>.exe` via electron-builder.

---

## Project Structure

```
timeline-driven/
├── electron/
│   └── main.js              # Electron main process
├── src/
│   ├── main.jsx             # React entry point
│   ├── App.jsx              # Root component (renders TodayPage)
│   ├── index.css            # Tailwind import
│   ├── TodayPage.jsx        # Main page: ongoing + upcoming tasks
│   ├── components/
│   │   ├── TaskItem.jsx         # Ongoing task card with check-in
│   │   ├── UpcomingTaskItem.jsx # Upcoming task card (read-only check-in)
│   │   └── TaskModal.jsx        # Create / edit / view modal
│   ├── hooks/
│   │   └── useLocalStorage.js   # Synced localStorage + useState hook
│   └── utils/
│       └── taskUtils.js         # Date helpers, status logic, completion math
├── docs/
│   └── 产品文档.md           # Product specification (Chinese)
├── index.html
├── vite.config.js
└── package.json
```

---

## Data Model

### Task

```json
{
  "id": 1712620800000,
  "name": "Task Name",
  "group": "Group Name",
  "start": "2026-03-24",
  "end": "2026-04-24",
  "tags": [
    { "name": "step-a", "max": 1 },
    { "name": "step-b", "max": 3 }
  ],
  "remark": "Optional notes",
  "logs": {
    "2026-04-09": {
      "step-a": 1,
      "step-b": 2
    }
  }
}
```

### `logs` format

| Scenario | Format |
|----------|--------|
| No tags | `{ "2026-04-09": true }` |
| With tags | `{ "2026-04-09": { "step-a": 1, "step-b": 3 } }` |

A tagged task is considered complete for the day only when every tag's count equals or exceeds its `max`.

---

## Task States

```
upcoming  →  today < start
ongoing   →  start ≤ today ≤ end  (or no end date)
finished  →  today > end
```

`finished` tasks are hidden from the UI but remain in `localStorage`.

---

## localStorage Keys

| Key | Contents |
|-----|----------|
| `timetrackr_groups` | Ordered array of group name strings |
| `timetrackr_tasks` | Array of task objects |
| `timetrackr_historical_tags` | Array of previously used tag name strings (for autocomplete) |

---

## Date Handling

`getToday()` uses `Intl.DateTimeFormat` with the system's local timezone (via `Intl.DateTimeFormat().resolvedOptions().timeZone`) to produce a `YYYY-MM-DD` string. This avoids UTC-offset issues that occur when using `new Date().toISOString().slice(0, 10)`.

---

## CI / Releases

The `.github/workflows/build-windows-installer.yml` workflow triggers on pushes to `main` or `master` and on manual dispatch. It runs `npm ci` and `npm run dist:win` on a `windows-latest` runner, then uploads the resulting `.exe` as a GitHub Actions artifact.

---

## Roadmap

The following capabilities are **not yet implemented**:

- Finished task history / archive view
- Completion rate statistics across days
- Streak tracking
- Notifications / reminders
- Weekly or custom-period recurring tasks
- Multi-user collaboration
- Cloud sync / backend

---

## License

Private project. All rights reserved.
