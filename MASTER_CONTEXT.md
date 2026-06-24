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

## Completed Milestones (Phase 1 & Recent Updates)
- **UI/UX Polish:** Deep dark mode and pure light mode implemented. Zebra-striping in tables works flawlessly. The Project Dashboard features dynamic project cards with premium teal/orange gradient badges that only show when projects actually contain Schedule or Shotlist data.
- **Database & Telemetry Redesign:** App leverages Firestore with `users` and `activity_logs` collections for analytics tracking. Includes a robust backward-compatibility layer for legacy JSON structures.
- **User Onboarding:** Added a premium 2-click Onboarding Modal tracking "Primary Role" and "Usage Goal" for new authenticated users.
- **Guest-to-User Sync:** Implemented a sophisticated authentication listener that flawlessly syncs locally created guest projects to a Firebase user profile upon sign-in, with instant UI updates and no page refresh required.
- **Hierarchical Cast Sync & Dropdown UI:** Split cast fields into scene-level (`sceneCast`) and shot-level (`cast`) with a strict top-down hierarchy. Scene-level edits propagate, and shot-level selections are restricted to scene cast. Upgraded React-Select to render custom dark chips (`useChips`) with red-accented hover delete buttons.
- **Linked Scene-Level Fields (Location, Props, Costume):** Linked `location`, `props`, and `costume` across all shots sharing the same `sceneNumber`. Modified shot `sceneNumber` changes to automatically inherit these scene-level properties. Disabled the `location` input in Shot View (desktop/mobile) and styled it as static read-only text.
- **Sticky Table Gap Fix:** Resolved horizontal scroll gaps ("peep holes") between sticky table columns (`.col-drag`, `.col-scene`, `.col-shot`) by enforcing strict matching widths and borders.
- **PDF Layout & Spacing Enhancements:** Enabled repeating table headers (`fixed`) on multi-page schedule exports. Refined page margins, increased row height, centered cell contents, and expanded horizontal padding to `10pt` on both Schedule and Call Sheet PDFs to ensure text does not crowd or touch table edges.

## Current State & Next Steps
- **Platform stability is excellent.** The app compiles cleanly, all scene-linking logic, dropdown restrictions, horizontal scroll freezes, and PDF formatting work as intended.
- **Next Steps:** We are ready for the next phase of requirements or new session goals.
