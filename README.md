# Clockwork

Clockwork is a local-first Pomodoro timer with a gear dial, task tracking, ambience, and playlists. The browser app is built with plain HTML, CSS, and JavaScript; the optional desktop app is packaged with Electron.

## Features

- Focus, short-break, and long-break timers with configurable durations and session cycles
- Tasks, daily statistics, streaks, a seven-day chart, and a daily goal
- Parked thoughts, notifications, auto-start options, and Zen mode
- Rain and wind ambience, plus user-managed music playlists
- Seven accent themes, matte and glow finishes, and keyboard shortcuts
- Locally stored settings and playlists; bundled fonts and ambience

## Run in a browser

Open `index.html` directly, or serve the project folder:

```sh
python -m http.server 8000
```

Then open <http://localhost:8000>.

## Run or build the desktop app

Install the locked dependencies and start Electron:

```sh
npm ci
npm start
```

Build an installer for the current operating system with `npm run dist`, or select a platform:

```sh
npm run dist:win
npm run dist:mac
npm run dist:linux
```

On Windows, the installer is written to `dist/Clockwork Setup <version>.exe`. Build each platform on that platform. Build output and installed dependencies are ignored by Git and can be recreated with these commands. Replace `build/icon.png` to use a custom app icon.

## Media

The default rain and wind files are in `sounds/` and are configured in `config.js`. If a default file is unavailable, the app generates ambience. To add default music, put audio files in `music/` and list their paths in `config.js`:

```js
tracks: ['music/song.mp3'],
playlists: {
  'Deep work': ['music/first.ogg', 'music/second.mp3'],
},
```

Users can also add audio files and folders from the app. Their playlists are stored locally in the browser. Only add music or other audio that you have permission to distribute.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| Space | Start or pause |
| R | Reset |
| S | Skip |
| F | Toggle Zen mode |
| P | Park a thought during focus |
| 1 / 2 / 3 | Select focus / short break / long break |

## Project files

- `index.html`, `style.css`, `script.js` — browser interface and timer
- `media.js`, `config.js` — playlists, ambience, and default media configuration
- `main.js`, `package.json`, `package-lock.json` — Electron entry point and build setup
- `build/`, `fonts/`, `sounds/` — app icon, licensed fonts, and bundled ambience; add `music/` when providing default tracks

