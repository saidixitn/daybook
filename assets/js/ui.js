// Shared helpers used by every page.
window.$ = (s, r = document) => r.querySelector(s);
window.$$ = (s, r = document) => [...r.querySelectorAll(s)];

window.UI = (() => {
  const pad = n => String(n).padStart(2, '0');
  const fmt = m => {
    m = Math.round(m);
    const hh = Math.floor(m / 60), mm = m % 60;
    return `${((hh + 11) % 12) + 1}:${pad(mm)} ${hh >= 12 ? 'PM' : 'AM'}`;
  };
  const fmtShort = m => { const hh = Math.floor(m / 60); return `${((hh + 11) % 12) + 1}${hh >= 12 ? 'pm' : 'am'}`; };
  const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60; };
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const DAYS_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const greeting = (name) => {
    const hh = new Date().getHours();
    const g = hh < 5 ? 'Still up' : hh < 12 ? 'Good morning' : hh < 17 ? 'Good afternoon' : hh < 21 ? 'Good evening' : 'Winding down';
    return name ? `${g}, ${name}` : g;
  };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- Sound synthesizer (Web Audio API) ---------- */
  let audioCtx = null;
  let rainSource = null;
  let rainGain = null;

  function getAudioContext() {
    if (!audioCtx && typeof window.AudioContext !== 'undefined') {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  const sound = {
    playTick() {
      if (!Store.state.prefs.sound) return;
      try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.04);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      } catch (e) { /* ignore */ }
    },
    playChime() {
      if (!Store.state.prefs.sound) return;
      try {
        const ctx = getAudioContext();
        if (!ctx) return;
        [523.25, 659.25, 783.99].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
          gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.08);
          gain.gain.linearRampToValueAtTime(0.09, ctx.currentTime + idx * 0.08 + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.6);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.08);
          osc.stop(ctx.currentTime + idx * 0.08 + 0.65);
        });
      } catch (e) { /* ignore */ }
    },
    startRain() {
      try {
        const ctx = getAudioContext();
        if (!ctx || rainSource) return;
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          data[i] = (lastOut + (0.02 * white)) / 1.02; // pinkish filter
          lastOut = data[i];
          data[i] *= 0.7;
        }
        rainSource = ctx.createBufferSource();
        rainSource.buffer = buffer;
        rainSource.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(850, ctx.currentTime);

        rainGain = ctx.createGain();
        rainGain.gain.setValueAtTime(0.001, ctx.currentTime);
        rainGain.gain.linearRampToValueAtTime(0.07, ctx.currentTime + 1.2);

        rainSource.connect(filter);
        filter.connect(rainGain);
        rainGain.connect(ctx.destination);
        rainSource.start();
      } catch (e) { /* ignore */ }
    },
    stopRain() {
      try {
        if (rainGain && audioCtx) {
          rainGain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
          setTimeout(() => {
            if (rainSource) { rainSource.stop(); rainSource.disconnect(); rainSource = null; }
            rainGain = null;
          }, 650);
        }
      } catch (e) { /* ignore */ }
    }
  };

  /* ---------- Day ribbon ---------- */
  function renderRibbon(track, events, now, opts = {}) {
    const start = (opts.start ?? 6) * 60, end = (opts.end ?? 23) * 60, span = end - start;
    const pct = m => Math.min(100, Math.max(0, (m - start) / span * 100));
    let html = '';
    for (let hh = Math.ceil(start / 60 / 2) * 2 + 2; hh < end / 60; hh += 2) {
      html += `<div class="hour" style="left:${pct(hh * 60)}%"><b>${fmtShort(hh * 60)}</b></div>`;
    }
    events.forEach(e => {
      const past = now != null && e.t + e.d <= now;
      const live = now != null && now >= e.t && now < e.t + e.d;
      html += `<div class="ribbon-block ${past ? 'done' : e.kind} ${live ? 'live' : ''}" style="left:${pct(e.t)}%;width:${e.d / span * 100}%" title="${esc(e.title)} · ${fmt(e.t)} – ${fmt(e.t + e.d)}">${esc(e.title)}</div>`;
    });
    if (now != null && now >= start && now <= end) html += `<div class="ribbon-now" style="left:${pct(now)}%"></div>`;
    track.innerHTML = html;
  }

  /* ---------- "Now" summary ---------- */
  function nowSummary(events, now) {
    const live = events.find(e => now >= e.t && now < e.t + e.d);
    const next = events.find(e => e.t > now);
    if (live) {
      const left = Math.ceil(live.t + live.d - now);
      return { state: 'live', label: 'Happening now', title: live.title, meta: `${fmt(live.t)} – ${fmt(live.t + live.d)}`, pct: (now - live.t) / live.d * 100, left: `${left} min left`, next: next ? `Next: ${next.title} at ${fmt(next.t)}` : 'Last event of the day' };
    }
    if (next) {
      const gap = Math.ceil(next.t - now);
      return { state: 'free', label: 'Free until', title: fmt(next.t), meta: gap >= 60 ? `${Math.floor(gap / 60)}h ${gap % 60}m of open time` : `${gap} min of open time`, pct: 0, left: 'Nothing scheduled', next: `Next: ${next.title}` };
    }
    return { state: 'done', label: 'Day complete', title: 'That\u2019s a wrap', meta: `${events.length} events, all behind you`, pct: 100, left: 'Rest up', next: 'Nothing left today' };
  }
  function paintNow(root, s) {
    if (!root) return;
    const l = $('.label span:last-child', root); if (l) l.textContent = s.label;
    const dot = $('.dot', root); if (dot) dot.style.display = s.state === 'live' ? '' : 'none';
    const t = $('.title', root); if (t) t.textContent = s.title;
    const m = $('.meta', root); if (m) m.textContent = s.meta;
    const bar = $('.bar i', root); if (bar) bar.style.width = s.pct + '%';
    const fl = $('.foot span:first-child', root); if (fl) fl.textContent = s.left;
    const fr = $('.foot span:last-child', root); if (fr) fr.textContent = s.next;
  }

  /* ---------- Toast ---------- */
  let toastEl, toastT;
  function toast(msg, ic = 'check') {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; document.body.appendChild(toastEl); }
    toastEl.innerHTML = `${icon(ic)}<span>${esc(msg)}</span>`;
    toastEl.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  /* ---------- Scrim / sheet ---------- */
  let scrim;
  function getScrim() {
    if (!scrim) { scrim = document.createElement('div'); scrim.className = 'scrim'; document.body.appendChild(scrim); scrim.addEventListener('click', closeAll); }
    return scrim;
  }
  const openStack = new Set();
  function openLayer(el) { getScrim().classList.add('open'); el.classList.add('open'); openStack.add(el); }
  function closeLayer(el) { el.classList.remove('open'); openStack.delete(el); if (!openStack.size) getScrim().classList.remove('open'); }
  function closeAll() {
    [...openStack].forEach(closeLayer);
    sound.stopRain();
  }

  let sheetEl;
  function openSheet(cfg) {
    if (!sheetEl) { sheetEl = document.createElement('div'); sheetEl.className = 'sheet'; sheetEl.setAttribute('role', 'dialog'); document.body.appendChild(sheetEl); }
    sheetEl.innerHTML = `<div class="grab"></div><h3>${esc(cfg.title)}</h3><div class="form">${cfg.body}</div>
      <div class="actions">${cfg.secondary ? `<button class="btn ${cfg.secondary.cls || 'ghost'}" data-act="secondary">${esc(cfg.secondary.label)}</button>` : ''}<button class="btn primary" data-act="primary">${esc(cfg.primary.label)}</button></div>`;
    $('[data-act="primary"]', sheetEl).onclick = () => cfg.primary.onClick(sheetEl);
    if (cfg.secondary) $('[data-act="secondary"]', sheetEl).onclick = () => cfg.secondary.onClick(sheetEl);
    sheetEl.querySelectorAll('input').forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') cfg.primary.onClick(sheetEl); }));
    openLayer(sheetEl);
    cfg.onOpen && cfg.onOpen(sheetEl);
    setTimeout(() => { const f = sheetEl.querySelector('input,textarea,select'); f && f.focus(); }, 180);
  }
  function closeSheet() { sheetEl && closeLayer(sheetEl); }

  /* ---------- Info Sheets ---------- */
  function showPrivacy() {
    openSheet({
      title: 'Privacy by Design',
      body: `
        <div style="font-size:14px;line-height:1.6;color:var(--ink-2);display:flex;flex-direction:column;gap:12px">
          <p><b style="color:var(--ink)">Zero tracking. Zero remote database.</b> Daybook operates 100% on your device using browser local storage.</p>
          <p>Your tasks, focus history, check-in journals, and schedule never touch external servers or advertising trackers. You own your data completely.</p>
          <p>You can export or purge your data at any time from <b>Settings &gt; Data</b>.</p>
        </div>`,
      primary: { label: 'Understood', onClick: closeSheet }
    });
  }

  function showTerms() {
    openSheet({
      title: 'Terms of Quiet Software',
      body: `
        <div style="font-size:14px;line-height:1.6;color:var(--ink-2);display:flex;flex-direction:column;gap:12px">
          <p><b style="color:var(--ink)">A calm tool that respects your attention.</b> Daybook is built to answer "what now?" and get out of the way.</p>
          <p>We do not sell attention, send dark-pattern spam, or push unsolicited notifications. By using Daybook, you agree to treat your own time with care.</p>
        </div>`,
      primary: { label: 'Got it', onClick: closeSheet }
    });
  }

  function showAbout() {
    openSheet({
      title: 'About Daybook',
      body: `
        <div style="font-size:14px;line-height:1.6;color:var(--ink-2);display:flex;flex-direction:column;gap:12px">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
            <span class="logo-mark" style="width:36px;height:36px">${icon('logo')}</span>
            <div><b style="color:var(--ink);font-size:16px">Daybook v1.2</b><div class="small muted">Your whole day, on one calm screen.</div></div>
          </div>
          <p>Designed for people who want quiet tools. Works seamlessly on desktop, iPad, and phone, offline or online.</p>
          <div style="background:var(--surface-2);border-radius:12px;padding:12px;display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px">
            <div><span class="kbd">⌘K</span> Command palette</div>
            <div><span class="kbd">N</span> Quick task</div>
            <div><span class="kbd">T</span> Toggle theme</div>
            <div><span class="kbd">1–5</span> Switch views</div>
          </div>
        </div>`,
      primary: { label: 'Close', onClick: closeSheet }
    });
  }

  function showForgotPassword() {
    openSheet({
      title: 'Account Recovery',
      body: `
        <div style="font-size:14px;line-height:1.6;color:var(--ink-2);display:flex;flex-direction:column;gap:12px">
          <p><b style="color:var(--ink)">Daybook is private to your device.</b> We don't store passwords on remote databases.</p>
          <p>You can sign in directly using any email address or via Google to continue your calm day.</p>
        </div>`,
      primary: { label: 'Continue as Guest', onClick: () => { Store.signIn('Guest', 'guest@daybook.so'); Store.state.onboarded = true; Store.save(); closeSheet(); location.href = '/app'; } },
      secondary: { label: 'Close', onClick: closeSheet }
    });
  }

  /* ---------- Command palette ---------- */
  let pal, palItems = [], palIdx = 0, palCommands = [], palSearch = null;
  function initPalette(commands, search) {
    palCommands = commands; palSearch = search;
    if (pal) return;
    pal = document.createElement('div'); pal.className = 'palette'; pal.setAttribute('role', 'dialog');
    pal.innerHTML = `<input placeholder="Type a command or search…" autocomplete="off" aria-label="Command"><ul class="cmds"></ul><div class="foot"><span><span class="kbd">↑↓</span> navigate</span><span><span class="kbd">↵</span> run</span><span><span class="kbd">esc</span> close</span></div>`;
    document.body.appendChild(pal);
    const input = $('input', pal);
    input.addEventListener('input', () => renderPalette(input.value));
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!palItems.length) return;
        palIdx = (palIdx + (e.key === 'ArrowDown' ? 1 : -1) + palItems.length) % palItems.length;
        $$('.cmd', pal).forEach(b => b.setAttribute('aria-selected', String(+b.dataset.i === palIdx)));
        $$('.cmd', pal)[palIdx]?.scrollIntoView({ block: 'nearest' });
      }
      if (e.key === 'Enter' && palItems[palIdx]) palItems[palIdx].run();
    });
    $('.cmds', pal).addEventListener('click', e => { const b = e.target.closest('.cmd'); if (b) palItems[+b.dataset.i].run(); });
  }
  function renderPalette(q) {
    q = q.trim().toLowerCase();
    const cmds = palCommands.filter(c => c.label.toLowerCase().includes(q) || (c.keywords || '').includes(q));
    const extra = q && palSearch ? palSearch(q) : [];
    palItems = [...cmds, ...extra]; palIdx = 0;
    let html = '', last = '';
    palItems.forEach((c, i) => {
      if (c.group !== last) { html += `<li class="group">${esc(c.group)}</li>`; last = c.group; }
      html += `<li><button class="cmd" data-i="${i}" aria-selected="${i === 0}"><span class="ic">${icon(c.icon || 'sparkle')}</span>${esc(c.label)}<small>${esc(c.hint || '')}</small></button></li>`;
    });
    $('.cmds', pal).innerHTML = html || `<li class="empty"><b>No matches</b>Try a different word.</li>`;
  }
  function openPalette() { if (!pal) return; const i = $('input', pal); i.value = ''; renderPalette(''); openLayer(pal); setTimeout(() => i.focus(), 40); }
  function closePalette() { pal && closeLayer(pal); }
  function togglePalette() { pal && pal.classList.contains('open') ? closePalette() : openPalette(); }

  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); togglePalette(); return; }
    if (e.key === 'Escape') closeAll();
  });

  return {
    fmt, fmtShort, nowMin, DAYS, DAYS_LONG, greeting, esc,
    renderRibbon, nowSummary, paintNow, toast, sound,
    openSheet, closeSheet, showPrivacy, showTerms, showAbout, showForgotPassword,
    initPalette, openPalette, closePalette, closeAll
  };
})();
