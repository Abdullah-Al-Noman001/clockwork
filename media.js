/* Music playlists + custom ambience. Sources: config.js lists plus files added in the app (IndexedDB). */
(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const cfg = window.CLOCKWORK_CONFIG || {};
  const ls = (k, d) => {
    try {
      const key = 'clockwork:' + k;
      let value = localStorage.getItem(key);
      if (value === null) {
        value = localStorage.getItem('hf:' + k);
        if (value !== null) localStorage.setItem(key, value);
      }
      return value === null ? d : JSON.parse(value);
    } catch { return d; }
  };
  const lsSet = (k, v) => { try { localStorage.setItem('clockwork:' + k, JSON.stringify(v)); } catch { /* storage unavailable */ } };

  /* ---------- IndexedDB for user-added files ---------- */
  const db = new Promise((res) => {
    try {
      const r = indexedDB.open('clockwork', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('files', { keyPath: 'id', autoIncrement: true });
      r.onsuccess = () => res(r.result); r.onerror = () => res(null);
    } catch { res(null); }
  });
  const tx = async (mode, fn) => {
    const d = await db; if (!d) return [];
    return new Promise((res) => { const q = fn(d.transaction('files', mode).objectStore('files')); q.onsuccess = () => res(q.result); q.onerror = () => res([]); });
  };
  const all = async (kind) => (await tx('readonly', (s) => s.getAll())).filter((f) => f.kind === kind);
  const add = (kind, file, extra = {}) => tx('readwrite', (s) => s.add({ kind, name: file.name, blob: file, ...extra }));
  const del = (id) => tx('readwrite', (s) => s.delete(id));
  const clear = async (kind) => { for (const f of await all(kind)) await del(f.id); };

  /* ---------- music: named playlists ---------- */
  const a = new Audio(); a.volume = 0.5;
  const sel = $('#plSel');
  let lists = {}, tracks = [], ti = -1, shuffle = false;
  const rand = () => Math.floor(Math.random() * tracks.length);
  const norm = (t) => (typeof t === 'string' ? { name: t.split('/').pop().replace(/\.[^.]+$/, ''), src: t } : t);
  const isAudio = (f) => f.type.startsWith('audio/') || /\.(mp3|ogg|wav|m4a|flac|aac)$/i.test(f.name);

  async function loadTracks(keep = sel.value || ls('pl', '*')) {
    lists = {};
    const put = (l, t) => (lists[l] ||= []).push(t);
    (cfg.tracks || []).forEach((t) => put('Default', norm(t)));
    Object.entries(cfg.playlists || {}).forEach(([l, arr]) => arr.forEach((t) => put(l, norm(t))));
    for (const f of await all('track')) put(f.list || 'My tracks', { name: f.name.replace(/\.[^.]+$/, ''), src: URL.createObjectURL(f.blob) });
    for (const n of ls('pls', [])) lists[n] ||= [];
    sel.innerHTML = '';
    sel.add(new Option('All tracks', '*'));
    Object.keys(lists).forEach((n) => sel.add(new Option(n, n)));
    sel.value = [...sel.options].some((o) => o.value === keep) ? keep : '*';
    useList();
  }
  function useList() {
    tracks = sel.value === '*' ? Object.values(lists).flat() : lists[sel.value] || [];
    ti = -1; a.pause(); ui();
  }
  function load(i) { ti = i; a.src = tracks[i].src; ui(); }
  function play() { if (!tracks.length) return; if (ti < 0) load(shuffle ? rand() : 0); a.play().catch(() => {}); }
  function step(dir) {
    if (!tracks.length) return;
    load(shuffle ? rand() : (ti + dir + tracks.length) % tracks.length); a.play().catch(() => {});
  }
  function ui() {
    $('#nowPlaying').textContent = !tracks.length ? 'Empty. Add mp3 files or a folder.' : ti >= 0 ? tracks[ti].name : `${tracks.length} tracks ready`;
    $('#mPlay').textContent = a.paused ? 'Play' : 'Pause';
  }
  a.onended = () => step(1); a.onplay = a.onpause = ui;
  a.onerror = () => { if (tracks.length > 1) step(1); };
  $('#mPlay').onclick = () => (a.paused ? play() : a.pause());
  $('#mNext').onclick = () => step(1);
  $('#mPrev').onclick = () => step(-1);
  $('#mShuffle').onclick = (e) => { shuffle = !shuffle; e.currentTarget.setAttribute('aria-pressed', shuffle); };
  $('#musicVol').oninput = (e) => (a.volume = e.target.value / 100);
  sel.onchange = () => { lsSet('pl', sel.value); useList(); };

  $('#addTracks').onclick = () => $('#trackFiles').click();
  $('#addFolder').onclick = () => $('#folderFiles').click();
  $('#trackFiles').onchange = async (e) => {
    const list = sel.value === '*' ? 'My tracks' : sel.value;
    for (const f of e.target.files) if (isAudio(f)) await add('track', f, { list });
    e.target.value = ''; loadTracks(list);
  };
  $('#folderFiles').onchange = async (e) => {   // a folder becomes a playlist named after it
    const fs = [...e.target.files].filter(isAudio); if (!fs.length) return;
    const list = fs[0].webkitRelativePath.split('/')[0] || 'Folder';
    for (const f of fs) await add('track', f, { list });
    e.target.value = ''; lsSet('pl', list); loadTracks(list);
  };
  $('#plForm').onsubmit = (e) => {
    e.preventDefault();
    const n = $('#plName').value.trim(); if (!n) return;
    const l = ls('pls', []); if (!l.includes(n)) lsSet('pls', [...l, n]);
    $('#plName').value = ''; loadTracks(n);
  };
  $('#clearTracks').onclick = async () => {   // removes only files added in the app, from the selected playlist
    const cur = sel.value;
    for (const f of await all('track')) if (cur === '*' || (f.list || 'My tracks') === cur) await del(f.id);
    if (cur !== '*') lsSet('pls', ls('pls', []).filter((n) => n !== cur));
    loadTracks('*');
  };

  /* ---------- custom ambience (replaces rain / wind) ---------- */
  const SLOTS = ['rain', 'wind'];
  const amb = {}; let ambEl = null;
  async function loadAmb() {
    for (const k of SLOTS) {
      const up = (await all('amb:' + k)).pop();
      amb[k] = up ? URL.createObjectURL(up.blob) : (cfg.ambience || {})[k] || null;
    }
  }
  const stopAmb = () => { if (ambEl) { ambEl.onerror = null; ambEl.pause(); } ambEl = null; };
  $('#sounds').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    stopAmb();
    const kind = b.dataset.sound, src = amb[kind];
    if (!src) return; // nothing set: the built-in generated sound plays
    e.stopImmediatePropagation();
    window.hfAudio?.play('off');
    document.querySelectorAll('#sounds button').forEach((x) => x.setAttribute('aria-pressed', x === b));
    ambEl = new Audio(src); ambEl.loop = true; ambEl.volume = $('#volume').value / 100;
    ambEl.onerror = () => { ambEl = null; window.hfAudio?.play(kind); };   // file missing: fall back to the generated sound
    ambEl.play().catch(() => {});
  }, true);
  $('#volume').addEventListener('input', (e) => { if (ambEl) ambEl.volume = e.target.value / 100; });
  const refresh = async (slot) => {
    await loadAmb();
    const on = document.querySelector('#sounds [aria-pressed="true"]');
    if (on && on.dataset.sound === slot) on.click();
  };
  $('#ambChange').onclick = () => $('#ambFile').click();
  $('#ambFile').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    const slot = $('#ambSlot').value;
    await clear('amb:' + slot); await add('amb:' + slot, f); e.target.value = ''; refresh(slot);
  };
  $('#ambReset').onclick = async () => { const slot = $('#ambSlot').value; await clear('amb:' + slot); refresh(slot); };

  loadTracks(); loadAmb();
})();
