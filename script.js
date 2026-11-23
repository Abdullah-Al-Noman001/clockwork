/* Clockwork — vanilla JS, no build step. Sections: storage, state, timer, tasks, stats, audio, UI wiring. */
(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  /* ---------- storage ---------- */
  const store = {
    get(k, d) {
      try {
        const key = 'clockwork:' + k;
        let value = localStorage.getItem(key);
        if (value === null) {
          value = localStorage.getItem('hf:' + k);
          if (value !== null) localStorage.setItem(key, value);
        }
        return value === null ? d : JSON.parse(value);
      } catch { return d; }
    },
    set(k, v) { try { localStorage.setItem('clockwork:' + k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  };
  const defaults = { focus: 25, short: 5, long: 15, cycles: 4, autoBreak: false, autoFocus: false, chime: true, notify: false, goal: 6 };
  let settings = { ...defaults, ...store.get('settings', {}) };
  let tasks = store.get('tasks', []);          // {id, text, est, done, count}
  let history = store.get('history', {});      // {'YYYY-MM-DD': {sessions, minutes}}
  let activeTask = store.get('activeTask', null);

  /* ---------- timer state ---------- */
  const LABELS = { focus: 'Stay on the work', short: 'Breathe', long: 'Step away from the forge' };
  const state = { mode: 'focus', running: false, remaining: settings.focus * 60, endAt: 0, completed: 0, raf: 0 };
  const C = 2 * Math.PI * 150;
  const dur = (m = state.mode) => settings[m] * 60;
  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const today = () => new Date().toLocaleDateString('en-CA');

  function render() {
    const secs = Math.max(0, Math.ceil(state.remaining));
    $('#time').textContent = fmt(secs);
    $('#progress').style.strokeDashoffset = C * (1 - state.remaining / dur());
    $('#label').textContent = state.running ? LABELS[state.mode] : (state.remaining === dur() ? 'Ready when you are' : 'Paused');
    $('#startBtn').textContent = state.running ? 'Pause' : 'Start';
    document.title = `${fmt(secs)} · ${state.mode === 'focus' ? 'Focus' : 'Break'}`;
    document.body.classList.toggle('running', state.running);
    store.set('run', { mode: state.mode, running: state.running, endAt: state.endAt, remaining: state.remaining, completed: state.completed });
    document.body.dataset.mode = state.mode;
    $$('.modes button').forEach((b) => b.setAttribute('aria-selected', b.dataset.mode === state.mode));
    $('#cycle').innerHTML = Array.from({ length: settings.cycles }, (_, i) => `<i class="${i < state.completed % settings.cycles ? 'done' : ''}"></i>`).join('');
  }

  function tick() {
    state.remaining = (state.endAt - Date.now()) / 1000;   // timestamp-based: survives tab throttling
    if (state.remaining <= 0) return complete();
    render();
    state.raf = setTimeout(tick, 250);
  }
  function start() {
    if (state.running) return;
    audio.unlock();
    state.running = true;
    state.endAt = Date.now() + state.remaining * 1000;
    tick();
  }
  function pause() { state.running = false; clearTimeout(state.raf); render(); }
  function setMode(mode) {
    pause(); state.mode = mode; state.remaining = dur(); render();
  }
  function complete() {
    clearTimeout(state.raf); state.running = false;
    const wasFocus = state.mode === 'focus';
    if (wasFocus) { state.completed++; logSession(); }
    if (settings.chime) audio.chime();
    notify(wasFocus ? 'Session complete. Take a break.' : 'Break over. Back to it.');
    const next = wasFocus ? (state.completed % settings.cycles === 0 ? 'long' : 'short') : 'focus';
    setMode(next);
    if ((wasFocus && settings.autoBreak) || (!wasFocus && settings.autoFocus)) start();
  }
  function skip() { state.mode === 'focus' ? setMode(state.completed % settings.cycles === settings.cycles - 1 ? 'long' : 'short') : setMode('focus'); }

  /* ---------- tasks ---------- */
  function saveTasks() { store.set('tasks', tasks); store.set('activeTask', activeTask); renderTasks(); }
  function renderTasks() {
    $('#taskEmpty').hidden = tasks.length > 0;
    $('#taskList').innerHTML = tasks.map((t) => `
      <li class="${t.id === activeTask ? 'active' : ''} ${t.done ? 'done' : ''}" data-id="${t.id}">
        <input type="checkbox" ${t.done ? 'checked' : ''} aria-label="Mark done">
        <span>${t.text.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]))}</span>
        <small>${t.count}/${t.est}</small>
        <button class="x" aria-label="Delete task">✕</button>
      </li>`).join('');
  }
  $('#taskForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const text = $('#taskInput').value.trim();
    if (!text) return;
    const t = { id: Date.now(), text, est: +$('#taskEst').value || 1, done: false, count: 0 };
    tasks.push(t); activeTask ??= t.id;
    $('#taskInput').value = ''; saveTasks();
  });
  $('#taskList').addEventListener('click', (e) => {
    const li = e.target.closest('li'); if (!li) return;
    const id = +li.dataset.id, t = tasks.find((x) => x.id === id);
    if (e.target.matches('.x')) { tasks = tasks.filter((x) => x.id !== id); if (activeTask === id) activeTask = tasks[0]?.id ?? null; }
    else if (e.target.matches('input')) t.done = e.target.checked;
    else activeTask = id;
    saveTasks();
  });

  /* ---------- stats ---------- */
  function logSession() {
    const d = (history[today()] ??= { sessions: 0, minutes: 0 });
    d.sessions++; d.minutes += settings.focus;
    store.set('history', history);
    const t = tasks.find((x) => x.id === activeTask);
    if (t) { t.count++; saveTasks(); }
    renderStats();
  }
  function renderStats() {
    const d = history[today()] ?? { sessions: 0, minutes: 0 };
    $('#statToday').textContent = d.sessions;
    $('#statMinutes').textContent = d.minutes >= 60 ? `${Math.floor(d.minutes / 60)}h ${d.minutes % 60}m` : `${d.minutes}m`;
    let streak = 0; const day = new Date();
    if (!history[today()]) day.setDate(day.getDate() - 1);
    while (history[day.toLocaleDateString('en-CA')]?.sessions) { streak++; day.setDate(day.getDate() - 1); }
    $('#statStreak').textContent = streak;
    $('#goalBar').style.width = Math.min(100, (d.sessions / settings.goal) * 100) + '%';
    $('#goalText').textContent = `${d.sessions} of ${settings.goal} sessions`;
    const days = Array.from({ length: 7 }, (_, i) => { const x = new Date(); x.setDate(x.getDate() - (6 - i)); return history[x.toLocaleDateString('en-CA')]?.sessions ?? 0; });
    const max = Math.max(4, ...days);
    $('#week').innerHTML = days.map((n) => `<div style="height:${(n / max) * 100}%" title="${n} sessions"></div>`).join('');
  }

  /* ---------- audio (generated with WebAudio: no asset files) ---------- */
  const audio = (() => {
    let ctx, master, node, current = 'off';
    const unlock = () => {
      if (ctx) return ctx.state === 'suspended' && ctx.resume();
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = $('#volume').value / 100; master.connect(ctx.destination);
    };
    const noise = () => {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; return s;
    };
    function play(kind) {
      unlock(); node?.forEach((n) => n.stop?.()); node = null; current = kind;
      if (kind === 'off') return;
      const g = ctx.createGain(); g.connect(master); const src = [];
      {
        const n = noise(), f = ctx.createBiquadFilter();
        f.type = kind === 'rain' ? 'highpass' : 'lowpass'; f.frequency.value = kind === 'rain' ? 1800 : 500;
        g.gain.value = kind === 'rain' ? .5 : .8; n.connect(f).connect(g); n.start(); src.push(n);
      }
      node = src;
    }
    function chime() {
      unlock(); [660, 880, 1320].forEach((f, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + i * .18;
        o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(.0001, t);
        g.gain.exponentialRampToValueAtTime(.3, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + 1.2);
        o.connect(g).connect(master); o.start(t); o.stop(t + 1.3);
      });
    }
    return { unlock, play, chime, volume: (v) => master && (master.gain.value = v) };
  })();

  window.hfAudio = audio; // used by media.js for custom ambience files

  function notify(msg) {
    if (settings.notify && 'Notification' in window && Notification.permission === 'granted') new Notification('Clockwork', { body: msg });
  }

  /* ---------- UI wiring ---------- */
  $('#startBtn').onclick = () => (state.running ? pause() : start());
  $('#resetBtn').onclick = () => { pause(); state.remaining = dur(); render(); };
  $('#skipBtn').onclick = skip;
  $$('.modes button').forEach((b) => (b.onclick = () => setMode(b.dataset.mode)));
  $$('#sounds button').forEach((b) => (b.onclick = () => {
    $$('#sounds button').forEach((x) => x.setAttribute('aria-pressed', x === b)); audio.play(b.dataset.sound);
  }));
  $('#volume').oninput = (e) => audio.volume(e.target.value / 100);

  const THEMES = ['brass', 'acid', 'ember', 'violet', 'azure', 'crimson', 'ash'];
  const applyTheme = (t) => { if (!THEMES.includes(t)) t = 'brass'; document.documentElement.dataset.theme = t; $('#themeSel').value = t; store.set('theme', t); };
  $('#themeSel').onchange = (e) => applyTheme(e.target.value);
  applyTheme(store.get('theme', 'brass'));
  const applyFinish = (f) => { f = f === 'glow' ? 'glow' : 'matte'; document.documentElement.dataset.finish = f; $('#finishSel').value = f; store.set('finish', f); };
  $('#finishSel').onchange = (e) => applyFinish(e.target.value);
  applyFinish(store.get('finish', 'matte'));

  const toggleZen = () => { const z = document.body.classList.toggle('zen'); $('#zenBtn').setAttribute('aria-pressed', z); };
  $('#zenBtn').onclick = toggleZen;

  const dlg = $('#settings'), form = $('#settingsForm');
  $('#settingsBtn').onclick = () => {
    for (const [k, v] of Object.entries(settings)) { const el = form.elements[k]; if (el) el.type === 'checkbox' ? (el.checked = v) : (el.value = v); }
    dlg.showModal();
  };
  dlg.addEventListener('close', async () => {
    if (dlg.returnValue !== 'save') return;
    for (const k of Object.keys(defaults)) { const el = form.elements[k]; settings[k] = el.type === 'checkbox' ? el.checked : Math.max(1, +el.value || defaults[k]); }
    if (settings.notify && 'Notification' in window && Notification.permission === 'default') await Notification.requestPermission();
    store.set('settings', settings); if (!state.running) state.remaining = dur(); render();
  });

  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, select') || dlg.open) return;
    const k = e.key.toLowerCase();
    if (k === ' ') { e.preventDefault(); $('#startBtn').click(); }
    else if (k === 'r') $('#resetBtn').click();
    else if (k === 's') skip();
    else if (k === 'f') toggleZen();
    else if (k === 'p') { e.preventDefault(); $('#parkInput').focus(); }
    else if (k === '1') setMode('focus'); else if (k === '2') setMode('short'); else if (k === '3') setMode('long');
  });

  // decorative gear ticks around the dial
  $('#gear').innerHTML = '<circle cx="200" cy="200" r="190"/><circle cx="200" cy="200" r="172"/>' +
    Array.from({ length: 60 }, (_, i) => { const a = (i / 60) * 2 * Math.PI, r1 = 172, r2 = i % 5 ? 180 : 190;
      return `<line class="tick" x1="${200 + r1 * Math.sin(a)}" y1="${200 - r1 * Math.cos(a)}" x2="${200 + r2 * Math.sin(a)}" y2="${200 - r2 * Math.cos(a)}"/>`; }).join('');

  // parked thoughts
  let thoughts = store.get('thoughts', []);
  const esc = (s) => s.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
  function renderThoughts() {
    $('#thoughtEmpty').hidden = thoughts.length > 0;
    $('#thoughtList').innerHTML = thoughts.map((t, i) => `<li data-i="${i}"><span>${esc(t)}</span><button class="x" aria-label="Remove thought">✕</button></li>`).join('');
  }
  $('#parkForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = $('#parkInput').value.trim(); if (!v) return;
    thoughts.unshift(v); store.set('thoughts', thoughts); $('#parkInput').value = ''; $('#parkInput').blur(); renderThoughts();
  });
  $('#thoughtList').addEventListener('click', (e) => {
    const li = e.target.closest('li'); if (!li || !e.target.matches('.x')) return;
    thoughts.splice(+li.dataset.i, 1); store.set('thoughts', thoughts); renderThoughts();
  });

  // resume a running or paused timer after reload
  const run = store.get('run', null);
  if (run) {
    state.mode = run.mode; state.completed = run.completed || 0; state.remaining = run.remaining;
    if (run.running) {
      const left = (run.endAt - Date.now()) / 1000;
      if (left > 0) { state.remaining = left; state.endAt = run.endAt; state.running = true; } else state.remaining = dur();
    }
  }
  render(); renderTasks(); renderStats(); renderThoughts();
  if (state.running) tick();
})();
