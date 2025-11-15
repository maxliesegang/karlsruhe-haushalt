# Karlsruhe Haushalt

Live demo → [https://maxliesegang.github.io/karlsruhe-haushalt/](https://maxliesegang.github.io/karlsruhe-haushalt/)

An interactive Vue 3 dashboard that lets you explore and combine the savings measures proposed for the Karlsruhe municipal budget. The tool highlights how close a chosen portfolio of Maßnahmen comes to the political savings goal for 2026/2027 and helps document compensations whenever a measure is removed.

## Key Features

- Budget hero section that visualizes progress toward the €80 M yearly goal and lets you switch between 2026, 2027 or both years at once.
- Search and filter controls (free-text, Dienststelle, min/max amounts) that work on the complete dataset contained in the JSON files under `public/massnahmen/`.
- Select/unselect measures to build a savings package; selections persist in `localStorage` and can be shared via the `#sel=` URL hash.
- Side panel that totals the currently selected measures, compares the result with the target, and allows quick “select all” or “clear” actions.
- Compensation modal that tracks how a removed measure is balanced by other sources before changes are accepted.
- Responsive Tailwind CSS 4 UI that works on desktop and mobile screens alike.

## Tech Stack

- [Vue 3](https://vuejs.org/) + [TypeScript](https://www.typescriptlang.org/) bootstrapped by [Vite](https://vite.dev/).
- [Pinia](https://pinia.vuejs.org/) for state management and sharing selections between components.
- [Vue Router](https://router.vuejs.org/) for the single-page application shell.
- [Tailwind CSS 4](https://tailwindcss.com/blog/tailwindcss-v4) (via `@tailwindcss/vite`) for utility-first styling.
- GitHub Pages–friendly build pipeline controlled through the `GITHUB_PAGES=1` environment variable (see `vite.config.ts`).

## Getting Started

Requirements: Node.js 20.19+ or 22.12+ and npm 10+.

```bash
npm install
npm run dev
```

Visit `http://localhost:5173` and the app will automatically fetch the bundled JSON files from `public/massnahmen/`.

## Project Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start Vite’s dev server with hot module replacement. |
| `npm run build` | Run `vue-tsc --build` followed by the production Vite build (uses `GITHUB_PAGES` base if set). |
| `npm run preview` | Serve the contents of `dist/` locally to smoke-test the production build. |
| `npm run type-check` | Run only the Vue-aware TypeScript checker. |
| `npm run lint` | Lint and auto-fix using ESLint + Vue/TS presets. |
| `npm run format` | Format the `src/` directory via Prettier. |

## Data & Domain Notes

- The authoritative dataset lives in `public/massnahmen/*.json` and is published verbatim with the app. Each entry includes identifiers, the responsible Dienststelle, and the projected savings for 2026 (`summe_2026`) and 2027 (`summe_2027`). The list of JSON files to load is defined in `public/massnahmen/index.json`, allowing the dataset to be organized across multiple files.
- Update the dataset by editing or regenerating that JSON file and re-running `npm run build`. When possible, keep IDs stable so persisted selections remain valid.
- The selection state is stored in `localStorage` (`ks_sparpaket_v1`). Clearing browser data resets the app back to the “all selected” default.
- The shareable URL hash follows the `#sel=1,2,3` pattern; copying the current URL captures the active selection for other viewers.

## Deployment

1. Build with the GitHub Pages base path: `GITHUB_PAGES=1 npm run build`.
2. Publish the contents of `dist/` to the `gh-pages` branch (or any static host). The repository’s GitHub Pages site is already configured at `https://maxliesegang.github.io/karlsruhe-haushalt/`.
3. Invalidate any external caches/CDNs if you are not using GitHub Pages.

Because the app is fully static, no server-side dependencies are required beyond a host that can serve plain HTML/CSS/JS assets.

## License

This project is licensed under the MIT License — see the `LICENSE` file for details.
