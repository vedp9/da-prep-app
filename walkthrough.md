# Walkthrough - Data Analyst Interview Prep PWA

I have successfully built and verified the Mobile-First Progressive Web App (PWA) interview preparation tool for Data Analysts. The application contains interactive multiple-choice questions, Duolingo-style coding exercises, and a live WebAssembly SQLite database execution engine.

## Changes Made

### 1. Project Initialization & Infrastructure
- Initialized a Vite-based React application in `da-prep-app/` subdirectory.
- Integrated **Tailwind CSS v3** with PostCSS and Autoprefixer for fluid utility styling.
- Installed **Lucide React** for icons, **sql.js** for SQLite execution, and **Vite PWA Plugin** (`vite-plugin-pwa`) for progressive offline installation support.

### 2. PWA Assets Generator & Configurations
- **[vite.config.js](file:///Users/ved/Desktop/DA/da-prep-app/vite.config.js)**: Configured workbox precaching, auto-updating, start URL, and offline metadata. Set maximum precache sizes to 6MB to fit the WebAssembly database file safely.
- **[generate-icons.js](file:///Users/ved/Desktop/DA/da-prep-app/generate-icons.js)**: A custom Node script that uses the `sharp` library to generate:
  - `pwa-192x192.png` (app icon)
  - `pwa-512x512.png` (maskable app icon)
  - `favicon.ico` (32x32 page tab icon)
  all rendered from a custom SVG logo designed for Data Analysts.
- **[index.html](file:///Users/ved/Desktop/DA/da-prep-app/index.html)**: Custom mobile head configurations to disable zooming on focus on iOS/Android, lock screen orientation, support status-bar colors, and pull the "Outfit" Google Font.

### 3. Utilities & Services
- **[src/utils/audio.js](file:///Users/ved/Desktop/DA/da-prep-app/src/utils/audio.js)**: Real-time Audio context synthesizer generating click ticks, chimes for correct answers, low buzzes for errors, and ascending arpeggios on completing quizzes. Requires zero external audio assets.
- **[src/utils/db.js](file:///Users/ved/Desktop/DA/da-prep-app/src/utils/db.js)**: SQLite driver that loads the WebAssembly binary `/sql-wasm.wasm`, seeds standard mock tables (`orders`, `customers`, `products`, `employees`, `monthly_revenue`) with 6-10 rows of data, and registers custom Postgres syntax compatibility overrides like `DATE_TRUNC`.

### 4. Interactive Coding Engine & Core App
- **[src/App.jsx](file:///Users/ved/Desktop/DA/da-prep-app/src/App.jsx)**: Core React codebase. Implements:
  - **Dashboard**: Circular indicators showing completion percentage for SQL, Python, Stats, Excel, PowerBI, and Tableau. Tracks total XP, streaks, level titles, and completion rates. Syncs to browser `localStorage` on change.
  - **MCQ Interface**: Clickable choices with distinct colors indicating selected/correct/incorrect states.
  - **Coding Word Bank**: A Duolingo-style grid. Tapping a code block moves it to the solution builder area while leaving a grayed-out placeholder slot in the word bank (preventing layout shifts).
  - **SQL Live Playground**: Instantly executes queries inside the WebAssembly SQLite instance as the user shapes their code blocks. Renders the query results as structured HTML tables, showing columns, rows, and handling syntax compiling errors on the fly.
  - **Summary**: Celebration screen showing XP earned in the quiz session, daily streaks, correct answer ratios, and custom high-performance canvas-rendered confetti showers.

---

## Verification & Build Results

The application compiles, processes CSS post-actions, and registers service workers cleanly. Run `npm run build` inside `da-prep-app` to compile:

```bash
vite v8.1.4 building client environment for production...
transforming...✓ 1777 modules transformed.
rendering chunks...
computing gzip size...
dist/manifest.webmanifest         0.49 kB
dist/index.html                   1.78 kB │ gzip:  0.88 kB
dist/assets/index-B86eebqd.css   27.60 kB │ gzip:  5.97 kB
dist/assets/index-Dwbt9Nmr.js   326.13 kB │ gzip: 99.25 kB

✓ built in 823ms

PWA v1.3.0
mode      generateSW
precache  13 entries (1059.77 KiB)
files generated
  dist/sw.js
  dist/workbox-2fbc6a65.js
```

---

## Project Setup Instructions

Follow these instructions to run the application locally or run audits:

### Prerequisites
Make sure you have [Node.js](https://nodejs.org) (v18 or higher recommended) installed.

### Setup and Start Dev Server

1. Navigate to the project directory:
   ```bash
   cd da-prep-app
   ```

2. Install all dependencies:
   ```bash
   npm install
   ```

3. Generate the high-res PWA icon assets and favicons:
   ```bash
   node generate-icons.js
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```
   *This starts the local web server, usually at `http://localhost:5173`. Open this URL in your mobile browser or Chrome DevTools mobile emulator.*

### Production Build & PWA Testing

1. Compile the production bundle:
   ```bash
   npm run build
   ```

2. Preview the production build locally:
   ```bash
   npm run preview
   ```
   *Vite will spin up a preview server. You can audit it using Google Lighthouse or Chrome DevTools to verify PWA installability, service worker precaching, and offline capability.*
