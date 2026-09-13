// Shared app chrome for every page under /app.
window.Shell = (() => {
  const S = Store.state;
  const params = new URLSearchParams(location.search);

  // Demo mode: create a guest so the app works without signing up.
  if (params.get('demo') === '1' && !S.user) { Store.signIn('Guest', 'guest@daybook.so'); S.onboarded = true; Store.save(); }
  if (!S.user) { location.replace('../login.html'); }

  const PAGES = [
    { id: 'today', label: 'Today', icon: 'home', href: 'index.html', key: '1' },
    { id: 'schedule', label: 'Schedule', icon: 'calendar', href: 'schedule.html', key: '2' },
    { id: 'tasks', label: 'Tasks', icon: 'tasks', href: 'tasks.html', key: '3' },
    { id: 'insights', label: 'Insights', icon: 'chart', href: 'insights.html', key: '4' },
    { id: 'settings', label: 'Settings', icon: 'settings', href: 'settings.html', key: '5' },
  ];

  const openTasks = () => S.tasks.filter(t => t.status !== 'done' && t.day === Store.today()).length;

  function mount(active, opts = {}) {
    const app = $('#app');
    const initial = (S.user?.name || 'G')[0].toUpperCase();
    const side = `
      <aside class="side">
        <a class="logo" href="index.html"><span class="logo-mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h9M5 7h14M5 17h5"/></svg></span><span>Daybook</span></a>
        <nav class="side-nav" aria-label="Main">
          ${PAGES.map(p => `<a href="${p.href}" ${p.id === active ? 'aria-current="page"' : ''}>${icon(p.icon)}<span>${p.label}</span>${p.id === 'tasks' ? `<span class="n">${openTasks()}</span>` : ''}<span class="tip">${p.label}</span></a>`).join('')}
        </nav>
        <button class="btn primary new-task" id="side-new">${icon('plus')}<span>New task</span><span class="kbd">N</span></button>
        <div class="bottom">
          <button class="user" id="theme-btn" aria-label="Toggle theme">${icon('moon')}<div><b>Theme</b><span>Switch light / dark</span></div></button>
          <a class="user" href="settings.html"><span class="avatar">${initial}</span><div><b>${UI.esc(S.user?.name || '')}</b><span>${UI.esc(S.user?.email || '')}</span></div></a>
        </div>
      </aside>`;
    const tabbar = `
      <nav class="tabbar" aria-label="Main">
        <div class="tabs">${PAGES.filter(p => p.id !== 'settings').map(p => `<a class="tab" href="${p.href}" ${p.id === active ? 'aria-current="page"' : ''}>${icon(p.icon)}<span>${p.label}</span></a>`).join('')}</div>
        <button class="fab" id="fab" aria-label="New task">${icon('plus')}</button>
      </nav>`;
    app.insertAdjacentHTML('afterbegin', side);
    document.body.insertAdjacentHTML('beforeend', tabbar);

    const top = $('#topbar');
    if (top) top.innerHTML = `
      <div><h1 id="page-title">${UI.esc(opts.title || '')}</h1><div class="sub" id="page-sub">${UI.esc(opts.sub || '')}</div></div>
      <span class="spacer"></span>
      <button class="search" id="open-palette">${icon('search')}<span>Jump to or do anything</span><span class="kbd">⌘K</span></button>
      <a class="avatar" href="settings.html" aria-label="Settings">${initial}</a>`;

    $('#side-new').addEventListener('click', () => addTaskSheet());
    $('#fab').addEventListener('click', () => addTaskSheet());
    $('#open-palette')?.addEventListener('click', UI.openPalette);
    $('#theme-btn').addEventListener('click', toggleTheme);

    UI.initPalette([
      { group: 'Actions', label: 'New task', icon: 'plus', hint: 'N', run: () => { UI.closePalette(); addTaskSheet(); } },
      { group: 'Actions', label: 'New event', icon: 'calendar', hint: '', run: () => { UI.closePalette(); if (window.addEventSheet) addEventSheet(); else location.href = 'schedule.html?new=1'; } },
      { group: 'Actions', label: 'Toggle dark theme', icon: 'moon', hint: 'T', run: () => { UI.closePalette(); toggleTheme(); } },
      { group: 'Actions', label: 'Sign out', icon: 'logout', run: () => { Store.signOut(); location.href = '../login.html'; } },
      ...PAGES.map(p => ({ group: 'Go to', label: p.label, icon: p.icon, hint: p.key, run: () => location.href = p.href })),
      { group: 'Go to', label: 'Landing page', icon: 'layers', run: () => location.href = '../index.html' },
    ], q => S.tasks.filter(t => t.title.toLowerCase().includes(q)).slice(0, 6).map(t => ({
      group: 'Tasks', label: t.title, icon: t.status === 'done' ? 'check' : 'tasks', hint: t.time != null ? UI.fmt(t.time) : '', run: () => location.href = `tasks.html?task=${t.id}`,
    })));

    document.addEventListener('keydown', e => {
      if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || e.metaKey || e.ctrlKey) return;
      const k = e.key.toLowerCase();
      if (k === 'n') { e.preventDefault(); addTaskSheet(); }
      if (k === 't') toggleTheme();
      const p = PAGES.find(x => x.key === e.key); if (p) location.href = p.href;
    });

    // Skeleton then content
    setTimeout(() => document.body.classList.remove('loading'), 380);
  }

  function toggleTheme() {
    const dark = document.documentElement.dataset.theme === 'dark';
    Store.setTheme(dark ? 'light' : 'dark');
    UI.toast(dark ? 'Light theme' : 'Dark theme', dark ? 'sun' : 'moon');
  }

  function addTaskSheet(presetDay) {
    UI.openSheet({
      title: 'New task',
      body: `
        <div class="field"><label for="t-title">What needs doing?</label><input class="input" id="t-title" placeholder="e.g. Send the invoice" autocomplete="off"></div>
        <div class="row2">
          <div class="field"><label for="t-time">Time</label><input class="input" id="t-time" type="time"></div>
          <div class="field"><label for="t-day">Day</label><select class="select" id="t-day">${UI.DAYS_LONG.map((d, i) => `<option value="${i}" ${i === (presetDay ?? Store.today()) ? 'selected' : ''}>${i === Store.today() ? 'Today' : i === (Store.today() + 1) % 7 ? 'Tomorrow' : d}</option>`).join('')}</select></div>
        </div>
        <div class="row2">
          <div class="field"><label for="t-list">List</label><select class="select" id="t-list"><option value="inbox">Inbox</option><option value="work">Work</option><option value="personal">Personal</option></select></div>
          <div class="field"><label for="t-status">Status</label><select class="select" id="t-status"><option value="todo">To do</option><option value="doing">In progress</option></select></div>
        </div>`,
      primary: { label: 'Add task', onClick: el => {
        const title = $('#t-title', el).value.trim();
        if (!title) { $('#t-title', el).focus(); return; }
        const tv = $('#t-time', el).value;
        const time = tv ? (+tv.split(':')[0]) * 60 + (+tv.split(':')[1]) : null;
        S.tasks.unshift({ id: Store.nextId(), title, time, day: +$('#t-day', el).value, list: $('#t-list', el).value, status: $('#t-status', el).value, flag: false, notes: '' });
        Store.save(); UI.closeSheet(); UI.toast('Task added');
        document.dispatchEvent(new CustomEvent('tasks:changed'));
      } },
      secondary: { label: 'Cancel', onClick: UI.closeSheet },
    });
  }

  // Shared task rendering + state cycle, used by Today and Tasks pages
  function taskRow(t, showList) {
    return `<li class="task ${t.status}" data-id="${t.id}">
      <button class="check" aria-label="${t.status === 'done' ? 'Mark not done' : 'Mark done'}"><svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg></button>
      <div class="body"><div class="name">${UI.esc(t.title)}</div>
        <div class="when">${t.time != null ? `${icon('clock')}${UI.fmt(t.time)}` : `<span>Anytime</span>`}${showList ? `<span class="list-tag">· ${{ inbox: 'Inbox', work: 'Work', personal: 'Personal' }[t.list]}</span>` : ''}${t.status === 'doing' ? `<span class="tag accent">In progress</span>` : ''}</div></div>
      <button class="flag" aria-pressed="${t.flag}" aria-label="Flag task">${icon('flag')}</button></li>`;
  }
  function cycleTask(t) {
    t.status = { todo: 'doing', doing: 'done', done: 'todo' }[t.status];
    Store.save();
    if (t.status === 'done') UI.toast(`Done: ${t.title}`);
    document.dispatchEvent(new CustomEvent('tasks:changed'));
  }

  function taskDetailSheet(t, onChange) {
    UI.openSheet({
      title: 'Task',
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
        <div class="field"><label for="d-notes">Notes</label><textarea class="textarea" id="d-notes" placeholder="Anything useful for future you">${UI.esc(t.notes || '')}</textarea></div>`,
      onOpen: el => {
        let status = t.status, flag = t.flag;
        $('#d-status', el).addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; status = b.dataset.s; $$('#d-status button', el).forEach(x => x.setAttribute('aria-pressed', String(x === b))); });
        $('#d-flag', el).addEventListener('click', () => { flag = !flag; $('#d-flag span', el).textContent = flag ? 'Flagged' : 'Not flagged'; });
        el._get = () => ({ status, flag });
      },
      primary: { label: 'Save', onClick: el => {
        const g = el._get();
        t.title = $('#d-title', el).value.trim() || t.title;
        const tv = $('#d-time', el).value; t.time = tv ? (+tv.split(':')[0]) * 60 + (+tv.split(':')[1]) : null;
        t.day = +$('#d-day', el).value; t.list = $('#d-list', el).value; t.status = g.status; t.flag = g.flag; t.notes = $('#d-notes', el).value;
        Store.save(); UI.closeSheet(); UI.toast('Saved'); onChange && onChange();
        document.dispatchEvent(new CustomEvent('tasks:changed'));
      } },
      secondary: { label: 'Delete', cls: 'danger', onClick: () => {
        S.tasks = S.tasks.filter(x => x.id !== t.id); Store.save(); UI.closeSheet(); UI.toast('Task deleted', 'trash'); onChange && onChange();
        document.dispatchEvent(new CustomEvent('tasks:changed'));
      } },
    });
  }

  return { mount, addTaskSheet, taskRow, cycleTask, taskDetailSheet, toggleTheme, PAGES };
})();
