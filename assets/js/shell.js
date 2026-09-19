// Shared app chrome for every page under /app.
window.Shell = (() => {
  const S = Store.state;
  const params = new URLSearchParams(location.search);

  // Demo mode: create a guest so the app works without signing up.
  if (params.get('demo') === '1' && !S.user) {
    Store.signIn('Guest', 'guest@daybook.so', 'email');
    S.onboarded = true;
    Store.save();
  }
  if (!S.user) {
    location.replace('/login');
  }

  const PAGES = [
    { id: 'today', label: 'Today', icon: 'home', href: '/app', key: '1' },
    { id: 'schedule', label: 'Schedule', icon: 'calendar', href: '/app/schedule', key: '2' },
    { id: 'tasks', label: 'Tasks', icon: 'tasks', href: '/app/tasks', key: '3' },
    { id: 'insights', label: 'Insights', icon: 'chart', href: '/app/insights', key: '4' },
    { id: 'settings', label: 'Settings', icon: 'settings', href: '/app/settings', key: '5' },
  ];

  const openTasksCount = () => S.tasks.filter(t => t.status !== 'done' && t.day === Store.today()).length;

  function updateSidebarBadges() {
    const badge = $('.side-nav a[href="/app/tasks"] .n, .side-nav a[href="tasks.html"] .n');
    if (badge) badge.textContent = openTasksCount();
  }

  function updateThemeButton() {
    const btn = $('#theme-btn');
    if (!btn) return;
    const isDark = document.documentElement.dataset.theme === 'dark';
    btn.innerHTML = `${icon(isDark ? 'sun' : 'moon')}<div><b>Theme</b><span>${isDark ? 'Switch to light' : 'Switch to dark'}</span></div>`;
  }

  function mount(active, opts = {}) {
    const app = $('#app');
    const initial = (S.user?.name || 'G')[0].toUpperCase();
    const isDark = document.documentElement.dataset.theme === 'dark';

    const side = `
      <aside class="side">
        <a class="logo" href="/app" aria-label="Daybook home">
          <span class="logo-mark">${icon('logo')}</span>
          <span>Daybook</span>
        </a>
        <nav class="side-nav" aria-label="Main">
          ${PAGES.map(p => `
            <a href="${p.href}" ${p.id === active ? 'aria-current="page"' : ''}>
              ${icon(p.icon)}
              <span>${p.label}</span>
              ${p.id === 'tasks' ? `<span class="n">${openTasksCount()}</span>` : ''}
              <span class="tip">${p.label}</span>
            </a>`).join('')}
        </nav>
        <button class="btn primary new-task" id="side-new">${icon('plus')}<span>New task</span><span class="kbd">N</span></button>
        <button class="btn secondary sm" id="side-focus" style="margin-bottom:8px;justify-content:flex-start;padding:0 12px;border-radius:12px">${icon('zap')}<span>Focus mode</span></button>
        <div class="bottom">
          <button class="user" id="theme-btn" aria-label="Toggle theme">
            ${icon(isDark ? 'sun' : 'moon')}
            <div><b>Theme</b><span>${isDark ? 'Switch to light' : 'Switch to dark'}</span></div>
          </button>
          <a class="user" href="/app/settings">
            <span class="avatar">${initial}</span>
            <div><b>${UI.esc(S.user?.name || '')}</b><span>${UI.esc(S.user?.email || '')}</span></div>
          </a>
        </div>
      </aside>`;

    const tabbar = `
      <nav class="tabbar" aria-label="Main">
        <div class="tabs">
          ${PAGES.filter(p => p.id !== 'settings').map(p => `
            <a class="tab" href="${p.href}" ${p.id === active ? 'aria-current="page"' : ''}>
              ${icon(p.icon)}<span>${p.label}</span>
            </a>`).join('')}
        </div>
        <button class="fab" id="fab" aria-label="New task">${icon('plus')}</button>
      </nav>`;

    app.insertAdjacentHTML('afterbegin', side);
    document.body.insertAdjacentHTML('beforeend', tabbar);

    const top = $('#topbar');
    if (top) {
      top.innerHTML = `
        <div>
          <h1 id="page-title">${UI.esc(opts.title || '')}</h1>
          <div class="sub" id="page-sub">${UI.esc(opts.sub || '')}</div>
        </div>
        <button class="live-status" id="live-header-pill" title="Jump to what's happening now">
          <span class="pulse-dot"></span>
          <span id="live-topbar-clock">--:--</span>
          <span class="muted">·</span>
          <span id="live-topbar-what">Daybook</span>
        </button>
        <span class="spacer"></span>
        <button class="search" id="open-palette">${icon('search')}<span>Jump to or do anything</span><span class="kbd">⌘K</span></button>
        <a class="avatar" href="settings.html" aria-label="Settings">${initial}</a>`;
    }

    $('#side-new')?.addEventListener('click', () => addTaskSheet());
    $('#side-focus')?.addEventListener('click', () => openFocusMode());
    $('#fab')?.addEventListener('click', () => addTaskSheet());
    $('#open-palette')?.addEventListener('click', UI.openPalette);
    $('#theme-btn')?.addEventListener('click', toggleTheme);
    $('#live-header-pill')?.addEventListener('click', () => {
      if (active !== 'today') location.href = 'index.html';
      else $('#now')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    // Live clock ticker in topbar
    function updateLiveHeader() {
      const clock = $('#live-topbar-clock');
      const what = $('#live-topbar-what');
      if (!clock || !what) return;
      const d = new Date();
      const hh = d.getHours(), mm = String(d.getMinutes()).padStart(2, '0');
      clock.textContent = `${((hh + 11) % 12) + 1}:${mm} ${hh >= 12 ? 'PM' : 'AM'}`;

      const today = Store.today();
      const evts = S.events.filter(e => e.day === today);
      const nowMin = d.getHours() * 60 + d.getMinutes();
      const current = evts.find(e => nowMin >= e.t && nowMin < e.t + e.d);
      const next = evts.find(e => e.t > nowMin);

      if (current) {
        what.textContent = current.title;
      } else if (next) {
        const gap = next.t - nowMin;
        what.textContent = gap >= 60 ? `Free (${Math.floor(gap / 60)}h)` : `Free (${gap}m)`;
      } else {
        what.textContent = 'Evening wrap';
      }
    }
    updateLiveHeader();
    setInterval(updateLiveHeader, 1000);

    // Sync listeners
    document.addEventListener('tasks:changed', updateSidebarBadges);
    document.addEventListener('store:synced', () => {
      updateSidebarBadges();
      updateThemeButton();
      updateLiveHeader();
    });
    document.addEventListener('theme:changed', updateThemeButton);

    UI.initPalette([
      { group: 'Actions', label: 'New task', icon: 'plus', hint: 'N', run: () => { UI.closePalette(); addTaskSheet(); } },
      { group: 'Actions', label: 'Start focus session', icon: 'zap', hint: '', run: () => { UI.closePalette(); openFocusMode(); } },
      { group: 'Actions', label: 'New event', icon: 'calendar', hint: '', run: () => { UI.closePalette(); if (window.addEventSheet) addEventSheet(); else location.href = '/app/schedule?new=1'; } },
      { group: 'Actions', label: 'Toggle dark theme', icon: 'moon', hint: 'T', run: () => { UI.closePalette(); toggleTheme(); } },
      { group: 'Actions', label: 'Sign out', icon: 'logout', run: () => { Store.signOut(); location.href = '/login'; } },
      ...PAGES.map(p => ({ group: 'Go to', label: p.label, icon: p.icon, hint: p.key, run: () => location.href = p.href })),
      { group: 'Go to', label: 'Landing page', icon: 'layers', run: () => location.href = '/' },
    ], q => S.tasks.filter(t => t.title.toLowerCase().includes(q)).slice(0, 6).map(t => ({
      group: 'Tasks', label: t.title, icon: t.status === 'done' ? 'check' : 'tasks', hint: t.time != null ? UI.fmt(t.time) : '', run: () => location.href = `/app/tasks?task=${t.id}`,
    })));

    document.addEventListener('keydown', e => {
      if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || e.metaKey || e.ctrlKey) return;
      const k = e.key.toLowerCase();
      if (k === 'n') { e.preventDefault(); addTaskSheet(); }
      if (k === 't') toggleTheme();
      const p = PAGES.find(x => x.key === e.key); if (p) location.href = p.href;
    });

    // Skeleton transition
    setTimeout(() => document.body.classList.remove('loading'), 300);
  }

  function toggleTheme() {
    const dark = document.documentElement.dataset.theme === 'dark';
    Store.setTheme(dark ? 'light' : 'dark');
    UI.toast(dark ? 'Light theme' : 'Dark theme', dark ? 'sun' : 'moon');
    updateThemeButton();
  }

  // Smart Natural Language Task parser
  function parseTaskInput(text) {
    let title = text.trim();
    let time = null;
    let day = null;
    let list = 'inbox';

    // check hashtags #work #personal #inbox
    const hashMatch = title.match(/#(work|personal|inbox)\b/i);
    if (hashMatch) {
      list = hashMatch[1].toLowerCase();
      title = title.replace(hashMatch[0], '').trim();
    }

    // check day: tomorrow, today, monday..sunday
    const today = Store.today();
    if (/\btomorrow\b/i.test(title)) {
      day = (today + 1) % 7;
      title = title.replace(/\btomorrow\b/i, '').trim();
    } else if (/\btoday\b/i.test(title)) {
      day = today;
      title = title.replace(/\btoday\b/i, '').trim();
    }

    // check time: at 3pm, at 3:30pm, at 14:00, 9am
    const timeMatch = title.match(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i) || title.match(/\b(?:at\s+)?(\d{1,2}):(\d{2})\b/);
    if (timeMatch) {
      let hh = parseInt(timeMatch[1], 10);
      const mm = parseInt(timeMatch[2] || '0', 10);
      const meridian = timeMatch[3] ? timeMatch[3].toLowerCase() : null;
      if (meridian === 'pm' && hh < 12) hh += 12;
      if (meridian === 'am' && hh === 12) hh = 0;
      if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
        time = hh * 60 + mm;
        title = title.replace(timeMatch[0], '').trim();
      }
    }

    return { title: title.replace(/\s+/g, ' '), time, day, list };
  }

  function addTaskSheet(presetDay) {
    UI.openSheet({
      title: 'New task',
      body: `
        <div class="field">
          <label for="t-title">What needs doing?</label>
          <input class="input" id="t-title" placeholder="e.g. Write launch notes at 3pm #work" autocomplete="off">
          <div class="hint">Type natural words like "tomorrow at 2pm #work" to pre-fill</div>
        </div>
        <div class="row2">
          <div class="field"><label for="t-time">Time</label><input class="input" id="t-time" type="time"></div>
          <div class="field">
            <label for="t-day">Day</label>
            <select class="select" id="t-day">
              ${UI.DAYS_LONG.map((d, i) => `
                <option value="${i}" ${i === (presetDay ?? Store.today()) ? 'selected' : ''}>
                  ${i === Store.today() ? 'Today' : i === (Store.today() + 1) % 7 ? 'Tomorrow' : d}
                </option>`).join('')}
            </select>
          </div>
        </div>
        <div class="row2">
          <div class="field"><label for="t-list">List</label><select class="select" id="t-list"><option value="inbox">Inbox</option><option value="work">Work</option><option value="personal">Personal</option></select></div>
          <div class="field"><label for="t-status">Status</label><select class="select" id="t-status"><option value="todo">To do</option><option value="doing">In progress</option></select></div>
        </div>`,
      onOpen: el => {
        const titleInput = $('#t-title', el);
        const timeInput = $('#t-time', el);
        const daySelect = $('#t-day', el);
        const listSelect = $('#t-list', el);

        titleInput.addEventListener('input', () => {
          const parsed = parseTaskInput(titleInput.value);
          if (parsed.time != null) {
            timeInput.value = `${String(Math.floor(parsed.time / 60)).padStart(2, '0')}:${String(parsed.time % 60).padStart(2, '0')}`;
          }
          if (parsed.day != null) {
            daySelect.value = parsed.day;
          }
          if (parsed.list) {
            listSelect.value = parsed.list;
          }
        });
      },
      primary: { label: 'Add task', onClick: el => {
        const rawTitle = $('#t-title', el).value.trim();
        if (!rawTitle) { $('#t-title', el).focus(); return; }
        const parsed = parseTaskInput(rawTitle);
        const finalTitle = parsed.title || rawTitle;

        const tv = $('#t-time', el).value;
        const time = tv ? (+tv.split(':')[0]) * 60 + (+tv.split(':')[1]) : null;
        S.tasks.unshift({
          id: Store.nextId(),
          title: finalTitle,
          time,
          day: +$('#t-day', el).value,
          list: $('#t-list', el).value,
          status: $('#t-status', el).value,
          flag: false,
          notes: ''
        });
        Store.save();
        UI.closeSheet();
        UI.toast('Task added');
        UI.sound.playTick();
        document.dispatchEvent(new CustomEvent('tasks:changed'));
      } },
      secondary: { label: 'Cancel', onClick: UI.closeSheet },
    });
  }

  function taskRow(t, showList) {
    const listLabels = { inbox: 'Inbox', work: 'Work', personal: 'Personal' };
    const listName = listLabels[t.list] || (t.list ? t.list[0].toUpperCase() + t.list.slice(1) : 'Inbox');
    return `
      <li class="task ${t.status}" data-id="${t.id}">
        <button class="check" aria-label="${t.status === 'done' ? 'Mark not done' : 'Mark done'}">
          <svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>
        </button>
        <div class="body">
          <div class="name">${UI.esc(t.title)}</div>
          <div class="when">
            ${t.time != null ? `${icon('clock')}${UI.fmt(t.time)}` : `<span>Anytime</span>`}
            ${showList ? `<span class="list-tag">· ${listName}</span>` : ''}
            ${t.status === 'doing' ? `<span class="tag accent">In progress</span>` : ''}
          </div>
        </div>
        <button class="flag" aria-pressed="${t.flag}" aria-label="Flag task">${icon('flag')}</button>
      </li>`;
  }

  function cycleTask(t) {
    t.status = { todo: 'doing', doing: 'done', done: 'todo' }[t.status] || 'todo';
    Store.save();
    if (t.status === 'done') {
      UI.toast(`Done: ${t.title}`);
      UI.sound.playChime();
    } else {
      UI.sound.playTick();
    }
    document.dispatchEvent(new CustomEvent('tasks:changed'));
  }

  function taskDetailSheet(t, onChange) {
    UI.openSheet({
      title: 'Task details',
      body: `
        <div class="field"><label for="d-title">Title</label><input class="input" id="d-title" value="${UI.esc(t.title)}"></div>
        <div class="field"><label>Status</label><div class="seg" id="d-status">${['todo', 'doing', 'done'].map(s => `<button type="button" data-s="${s}" aria-pressed="${t.status === s}">${{ todo: 'To do', doing: 'In progress', done: 'Done' }[s]}</button>`).join('')}</div></div>
        <div class="row2">
          <div class="field"><label for="d-time">Time</label><input class="input" id="d-time" type="time" value="${t.time != null ? `${String(Math.floor(t.time / 60)).padStart(2, '0')}:${String(t.time % 60).padStart(2, '0')}` : ''}"></div>
          <div class="field"><label for="d-day">Day</label><select class="select" id="d-day">${UI.DAYS_LONG.map((d, i) => `<option value="${i}" ${i === t.day ? 'selected' : ''}>${i === Store.today() ? 'Today' : d}</option>`).join('')}</select></div>
        </div>
        <div class="row2">
          <div class="field"><label for="d-list">List</label><select class="select" id="d-list">${['inbox', 'work', 'personal'].map(l => `<option value="${l}" ${t.list === l ? 'selected' : ''}>${l[0].toUpperCase() + l.slice(1)}</option>`).join('')}</select></div>
          <div class="field"><label>Flag</label><button type="button" class="btn secondary" id="d-flag" style="height:48px;justify-content:flex-start">${icon('flag')}<span>${t.flag ? 'Flagged' : 'Not flagged'}</span></button></div>
        </div>
        <div class="field"><label for="d-notes">Notes</label><textarea class="textarea" id="d-notes" placeholder="Notes for future you">${UI.esc(t.notes || '')}</textarea></div>`,
      onOpen: el => {
        let status = t.status, flag = t.flag;
        $('#d-status', el).addEventListener('click', e => {
          const b = e.target.closest('button');
          if (!b) return;
          status = b.dataset.s;
          $$('#d-status button', el).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
        });
        $('#d-flag', el).addEventListener('click', () => {
          flag = !flag;
          $('#d-flag span', el).textContent = flag ? 'Flagged' : 'Not flagged';
        });
        el._get = () => ({ status, flag });
      },
      primary: { label: 'Save', onClick: el => {
        const g = el._get();
        t.title = $('#d-title', el).value.trim() || t.title;
        const tv = $('#d-time', el).value;
        t.time = tv ? (+tv.split(':')[0]) * 60 + (+tv.split(':')[1]) : null;
        t.day = +$('#d-day', el).value;
        t.list = $('#d-list', el).value;
        t.status = g.status;
        t.flag = g.flag;
        t.notes = $('#d-notes', el).value;
        Store.save();
        UI.closeSheet();
        UI.toast('Saved');
        onChange && onChange();
        document.dispatchEvent(new CustomEvent('tasks:changed'));
      } },
      secondary: { label: 'Delete', cls: 'danger', onClick: () => {
        S.tasks = S.tasks.filter(x => x.id !== t.id);
        Store.save();
        UI.closeSheet();
        UI.toast('Task deleted', 'trash');
        onChange && onChange();
        document.dispatchEvent(new CustomEvent('tasks:changed'));
      } },
    });
  }

  /* ---------- Focus Mode Overlay ---------- */
  let focusOverlay, focusTimer = null, focusRemaining = 0, focusTotal = 0, focusRain = false;
  function openFocusMode(taskTitle = 'Deep work', minutes = 25) {
    focusTotal = minutes * 60;
    focusRemaining = focusTotal;

    if (!focusOverlay) {
      focusOverlay = document.createElement('div');
      focusOverlay.className = 'focus-overlay';
      document.body.appendChild(focusOverlay);
    }

    focusOverlay.innerHTML = `
      <div class="focus-box">
        <button class="icon-btn plain focus-close" id="focus-close" aria-label="Close focus">${icon('x')}</button>
        <div class="tag accent" style="margin-bottom:12px">${icon('zap')} Focus Session</div>
        <h2 class="focus-task-title">${UI.esc(taskTitle)}</h2>
        <div class="focus-ring-wrap">
          <svg class="focus-ring-svg" viewBox="0 0 100 100">
            <circle class="bg" cx="50" cy="50" r="42"></circle>
            <circle class="fg" id="focus-fg" cx="50" cy="50" r="42" stroke-dasharray="264" stroke-dashoffset="0"></circle>
          </svg>
          <div class="focus-center">
            <div class="focus-digits" id="focus-digits">25:00</div>
            <div class="focus-sublabel">remaining</div>
          </div>
        </div>
        <div class="focus-ctrls">
          <button class="btn secondary" id="focus-ambient-btn">${icon('volumeX')} <span>Rain: Off</span></button>
          <button class="btn primary lg" id="focus-play-btn">${icon('pause')} <span>Pause</span></button>
          <button class="btn secondary" id="focus-done-btn">${icon('check')} <span>Complete</span></button>
        </div>
      </div>`;

    focusOverlay.classList.add('open');

    const digits = $('#focus-digits', focusOverlay);
    const fg = $('#focus-fg', focusOverlay);
    const playBtn = $('#focus-play-btn', focusOverlay);
    const ambientBtn = $('#focus-ambient-btn', focusOverlay);
    let isRunning = true;

    function renderTimer() {
      const mm = Math.floor(focusRemaining / 60);
      const ss = focusRemaining % 60;
      digits.textContent = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
      const circumference = 2 * Math.PI * 42; // ~264
      const progress = (focusTotal - focusRemaining) / focusTotal;
      fg.style.strokeDashoffset = (circumference * progress);
    }

    function tick() {
      if (!isRunning) return;
      if (focusRemaining > 0) {
        focusRemaining--;
        renderTimer();
      } else {
        finishFocus();
      }
    }

    function finishFocus() {
      clearInterval(focusTimer);
      focusTimer = null;
      UI.sound.stopRain();
      const earnedHours = Math.round((focusTotal - focusRemaining) / 3600 * 10) / 10 || 0.4;
      const today = Store.today();
      S.focus[today] = Math.round((S.focus[today] + earnedHours) * 10) / 10;
      Store.save();
      UI.sound.playChime();
      UI.toast(`Focus session complete! +${earnedHours}h added`, 'sparkle');
      focusOverlay.classList.remove('open');
      document.dispatchEvent(new CustomEvent('store:synced'));
    }

    renderTimer();
    if (focusTimer) clearInterval(focusTimer);
    focusTimer = setInterval(tick, 1000);

    playBtn.onclick = () => {
      isRunning = !isRunning;
      playBtn.innerHTML = `${icon(isRunning ? 'pause' : 'play')} <span>${isRunning ? 'Pause' : 'Resume'}</span>`;
    };

    ambientBtn.onclick = () => {
      focusRain = !focusRain;
      if (focusRain) {
        UI.sound.startRain();
        ambientBtn.innerHTML = `${icon('volume')} <span>Rain: On</span>`;
      } else {
        UI.sound.stopRain();
        ambientBtn.innerHTML = `${icon('volumeX')} <span>Rain: Off</span>`;
      }
    };

    $('#focus-done-btn', focusOverlay).onclick = finishFocus;
    $('#focus-close', focusOverlay).onclick = () => {
      clearInterval(focusTimer);
      focusTimer = null;
      UI.sound.stopRain();
      focusOverlay.classList.remove('open');
    };
  }

  return {
    mount,
    addTaskSheet,
    taskRow,
    cycleTask,
    taskDetailSheet,
    toggleTheme,
    openFocusMode,
    PAGES
  };
})();
