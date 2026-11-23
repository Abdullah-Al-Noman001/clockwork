# Clockwork

A feature-rich but calm focus timer. Black background, engraved Cinzel type, a gear dial and accent-edged panels. Fully offline: fonts are bundled, no network calls.

## Run
Serve the folder (`python3 -m http.server 8000`) and open `http://localhost:8000`, or open `index.html` directly.

## Look
- **Theme** dropdown: Brass, Acid, Ember, Violet, Azure, Crimson, Ash (accent colors only).
- **Finish** dropdown: **Matte** (flat, no glow; default) or **Glow** (soft light on the accent).
Both choices are remembered.

## Features
- Focus / short / long breaks (default 25 / 5 / 15, long break every 4), resumes after reload, countdown in the tab title
- Tasks with estimated sessions, daily stats, streak, 7-day bars, daily goal bar
- Parked thoughts: press P during focus to capture a stray idea
- Ambience: rain and wind
- Music: your own mp3s, folders and named playlists, shuffle, prev/next, volume
- Zen mode (F), notifications, auto-start options

Shortcuts: Space start/pause, R reset, S skip, F zen, P park a thought, 1/2/3 mode.

## Where to put your default rain and wind sounds
Copy them into the `sounds/` folder with these exact names:

```
sounds/rain.mp3
sounds/wind.mp3
```
Using .ogg or .wav? Change the names in `config.js` under `ambience`. If a file is missing, the app plays a built-in generated sound instead. Use loops that end where they begin (OGG loops more cleanly than MP3).

Users can override either sound inside the app: Ambience panel, pick Rain or Wind, "Use my file". "Restore default" goes back to your files.

## Music and playlists
**Users, inside the app (Your music panel):**
- **Add mp3 files**: pick one or many; they go into the selected playlist (or "My tracks").
- **Add folder**: every audio file in the folder becomes a playlist named after the folder.
- **New playlist**: type a name and Create, then add files to it.
- Pick a playlist from the dropdown; "All tracks" plays everything.
- **Remove mine** deletes files the user added from the selected playlist. Files from `config.js` are never deleted.
Added files are stored in the browser (IndexedDB) and survive reloads.

**You, as the developer (default music):** put files in `music/` and list them in `config.js` (`window.CLOCKWORK_CONFIG`):
```js
tracks: ['music/song.mp3'],                         // "Default" playlist
playlists: { 'Deep work': ['music/a.mp3', 'music/b.mp3'] },
```
Only use audio you have the rights to.

## Desktop app (Electron)
```bash
npm install
npm start        # run
npm run dist     # build installer into dist/ (build on the target OS)
```
Replace `build/icon.png` (512x512) with your own icon. Files in `music/` and `sounds/` are bundled.

## Files
`index.html`, `style.css`, `script.js` (timer, tasks, stats, generated audio), `media.js` (playlists, custom ambience), `config.js` (your media), `main.js` + `package.json` (desktop), `fonts/`, `sounds/`, `music/`, `DEVELOPMENT_PLAN.md`.
