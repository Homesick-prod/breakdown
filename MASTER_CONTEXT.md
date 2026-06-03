# MentalBreakdown - Master Context

## Overview
"MentalBreakdown" is a premium Film Production Suite web application designed to help Assistant Directors (1st ADs) and Directors create robust Shooting Schedules and visual Shotlists.

## Tech Stack
- **Framework:** Next.js (App Router, heavily utilizing client-side rendering `'use client'`)
- **Styling:** Vanilla CSS (`globals.css`) with CSS Variables for theming (Dark/Light mode). Premium glassmorphism and modern UI design.
- **State Management:** React Hooks, featuring a custom `useUndoRedo` hook for global state history.
- **Backend/Storage:** 
  - Dual-mode architecture: Defaults to `LocalStorage` and IndexedDB for pure offline use.
  - Can securely connect to Firebase (Firestore, Storage, Auth) if `.env` is configured.
- **Key Libraries:**
  - `@dnd-kit/core` & `@dnd-kit/sortable` (for drag-and-drop table rows)
  - `lucide-react` (for icons)

## Core Components
- `src/app/page.tsx`: The main router that switches between the Dashboard, Schedule Editor, and Shotlist Editor.
- `src/components/ProjectDashboard.tsx`: The home screen. Manages projects (Create, Duplicate, Export/Import JSON, Firebase Sharing).
- `src/components/ShootingScheduleEditor.tsx`: The core breakdown board. A complex table with drag-and-drop rows representing 'Scenes' and 'Breaks' (Lunch, Wrap). Includes OpenStreetMap API integration for Location autocomplete.
- `src/components/ShotlistEditor.tsx`: A visual shotlist manager with image upload capabilities for references.
- `src/utils/pdf.ts` & `src/utils/shotpdf.ts`: Custom PDF exporters that generate printable HTML documents styled like professional Thai film production call sheets.
- `src/components/DarkSelect.tsx` & `src/components/DarkDatePicker.tsx`: Fully custom UI components built to match the sleek aesthetic.

## Completed Milestones (Phase 1)
- **UI/UX Polish:** Deep dark mode and pure light mode implemented. Zebra-striping in tables works flawlessly, with input fields set to `background: transparent` to inherit row colors correctly. Focus/Hover states refined.
- **Global Undo/Redo:** `Ctrl+Z` and `Ctrl+Shift+Z` are globally bound and accurately track changes across all inputs (text, dropdowns, date pickers) in the editors without breaking focus.
- **Export/Import:** Projects can be exported as JSON files and re-imported locally.
- **PDF Generation:** Schedule and Shotlist can be exported to professional, production-ready PDFs.

## Current State & Next Steps
- **Phase 1 is officially DONE.** The app is stable, beautiful, and fully functional for standard manual data entry.
- **Phase 2 Planning:** We were discussing adding a "Killer Feature" / Unique Selling Point. We debated a Heuristic "Auto-Scheduler" (Magic Sort) but realized it relies too heavily on perfect manual data entry and doesn't handle geographic route optimization. 
- **Next up:** Deciding on and implementing the next major feature (e.g., Fountain Script parsing, Storyboard sketching, etc.).
