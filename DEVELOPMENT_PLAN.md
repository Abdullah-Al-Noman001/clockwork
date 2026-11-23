# Clockwork development plan

This document describes the current app and the remaining work. The project name is **Clockwork**. Use `clockwork:` for browser storage, `clockwork` for the IndexedDB database, and `CLOCKWORK_CONFIG` for user supplied media configuration. Existing `hf:` browser data is migrated on read.

## Product and technical direction

- A calm, multipurpose Pomodoro timer. Keep secondary features unobtrusive while a session runs.
- Vanilla HTML, CSS, and JavaScript; no framework, bundler, or runtime dependencies for the browser app.
- Browser app files are `index.html`, `style.css`, `script.js`, `media.js`, and `config.js`. `main.js` and `package.json` package the app with Electron.
- State is stored locally. Fonts are bundled; no network calls are made by the app.
- Timer calculations use end timestamps so tab throttling does not skew time.
- Colors come from CSS variables. Respect reduced motion, keyboard navigation, visible focus, and ARIA states.

## Current status

The core app and desktop packaging are implemented. Features include focus/short/long cycles, timer restoration after reload, auto-start options, tasks and session counts, daily stats and streak, a seven-day chart, daily goal, parked thoughts, generated rain/wind ambience with optional user audio, music playlists, notifications, Zen mode, keyboard shortcuts, seven accent themes, matte/glow finishes, and self-hosted fonts.

The app identity is Clockwork. Its visual direction is a matte black canvas with muted accent colors and optional glow. Keep that direction focused on the clock and avoid decorative background effects or distracting ambience.

## Remaining work

### Robustness and usability

- Pause ambience automatically during breaks (with a setting).
- Add a compact active-task picker beneath the clock.
- Allow inline editing of task text and estimates.
- Validate settings values and show inline errors instead of silently clamping invalid input.
- Improve timer recovery when a running focus session expires while the app is closed; current restore resets to the mode duration without recording completion.
- Verify browser storage migration from the former `hf:` keys and test the desktop build on each target OS.

### Productivity

- Add a 30-day heatmap, per-task totals, and best-day summary.
- Add JSON export/import with validation.
- Add an optional daily progress indicator setting.
- Add a quiet distraction capture flow that makes parked thoughts easy to review during breaks.

### Installable and offline web app

- Add a web app manifest and service worker for offline caching.
- Confirm the title countdown behavior when the tab is hidden.
- Check installability and offline behavior in supported browsers.

### Optional extras (ask the owner before starting)

- Custom timer presets.
- Ambient mixer with per-layer volume.
- User-configured sync backend.
- Additional locales.

## Project-specific rules

- Keep app state local and preserve existing user data when changing storage keys.
- Do not add dependencies or files outside the scope above without owner approval.
- Do not bundle copyrighted music or ambience. User-supplied files are supported; default rain and wind paths are configured in `config.js`.
- Update this plan and the README when a phase or substantial feature is completed.
