# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PhaseDo — a local-first daily task tracker for phase-based execution. Tasks repeat every day within a fixed start-to-end date range. All data persists in `localStorage`; no backend. Chinese-language UI.

## Commands

```bash
npm run dev            # Vite dev server (http://localhost:5173)
npm run build          # Production build → dist/
npm run electron:dev   # Vite + Electron simultaneously (desktop dev)
npm run dist:win       # Build + package Windows NSIS installer → release/
```

No test runner or linter is configured. TypeScript strict mode is enabled with `noUnusedLocals` and `noUnusedParameters`.

## Tech Stack

- React 19, Vite 6, Tailwind CSS 4 (via `@tailwindcss/vite` plugin), TypeScript 6
- @dnd-kit for drag-and-drop sortable task cards
- Electron 41 with `contextIsolation: true` and `sandbox: true`
- electron-builder for Windows NSIS packaging

## Architecture

Single-page app: `App.tsx` → `TodayPage.tsx` (the only page).

**TodayPage** owns all state via `useLocalStorage` hooks:
- `timetrackr_tasks` — Task[] (the core data)
- `timetrackr_historical_tags` — string[] (autocomplete for tag names)
- `timetrackr_historical_groups` — string[] (group section headers)

All CRUD, check-in (`toggleTask`/`toggleTag`), drag reorder, and search logic lives in TodayPage. Child components are presentational.

**Data flow**: TodayPage → SortableTaskItem (dnd-kit wrapper) → TaskItem | UpcomingTaskItem. TaskModal handles create/edit/view modes.

**Task states** (computed by `getStatus` in `taskUtils.ts`):
- `upcoming`: today < start
- `ongoing`: start ≤ today ≤ end (or no end)
- `finished`: today > end (hidden from UI, kept in storage)

**Check-in semantics** (critical to get right):
- Tag-less tasks: `logs[today] = true`
- Tagged tasks: `logs[today] = { tagName: count }` — task is "done" when every tag's count ≥ its `max`
- Whole-card toggle fills all tags to max at once; single-tag toggle increments/decrements individually
- When a `true` log exists for a tagged task, it's treated as all-tags-maxed

**Date handling**: `getToday()` subtracts 2 hours before formatting to avoid midnight boundary issues, using `Intl.DateTimeFormat` with system timezone.

**Group ordering**: Groups are rendered from `historicalGroups` sorted alphabetically, with ungrouped tasks last. Dragging a task onto another task in a different group reassigns its `groupId`.

## Electron

`electron/main.js` — single-instance lock, loads Vite dev server URL in dev or `dist/index.html` in production. No IPC; the renderer is a pure web app.

## CI

`.github/workflows/build-windows-installer.yml` — triggers on push to main/master. Runs `npm ci` and `npm run dist:win` on `windows-latest`, uploads `.exe` artifact.
