(() => {
  const S = Store.state;
  const today = Store.today();
  const params = new URLSearchParams(location.search);
  let sel = today;
  const { dayStart, dayEnd } = S.prefs;
  const HOUR = 58; // px per hour, matches .tl .hrow

  Shell.mount('schedule', { title: 'Schedule', sub: 'This week' });

  // Dates for the strip: Monday of this week onwards
  const now = new Date();
  const monday = new Date(now); monday.setDate(now.getDate() - today);
  const dateOf = i => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d; };
  const evts = day => S.events.filter(e => e.day === day).sort((a, b) => a.t - b.t);

  /* ---------- Week strip ---------- */
  function renderWeek() {
    $('#week').innerHTML = UI.DAYS.map((d, i) => {
      const n = evts(i).length;
      return `<button class="wd ${i === today ? 'today' : ''}" aria-pressed="${i === sel}" data-d="${i}"><small>${d}</small><b>${dateOf(i).getDate()}</b><div class="dots">${Array.from({ length: Math.min(3, n) }, () => '<i></i>').join('')}</div></button>`;
    }).join('');
  }
  $('#week').addEventListener('click', e => { const b = e.target.closest('.wd'); if (b) { sel = +b.dataset.d; renderWeek(); renderDay(); } });

  /* ---------- Day timeline ---------- */
  function renderDay() {
    const ev = evts(sel);
    const d = dateOf(sel);
    $('#day-h').textContent = sel === today ? 'Today' : sel === (today + 1) ? 'Tomorrow' : UI.DAYS_LONG[sel];
    $('#day-sub').textContent = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

    let html = '';
    for (let hh = dayStart; hh <= dayEnd; hh++) html += `<div class="hrow"><b>${UI.fmtShort(hh * 60)}</b></div>`;
    ev.forEach(e => {
      const n = UI.nowMin();
      const past = sel === today && e.t + e.d <= n;
      const top = (e.t - dayStart * 60) / 60 * HOUR;
      const h = Math.max(30, e.d / 60 * HOUR - 4);
      html += `<div class="blk ${past ? 'done' : e.kind}" data-id="${e.id}" style="top:${top}px;height:${h}px"><div class="bt">${UI.esc(e.title)}</div><div class="bm">${UI.fmt(e.t)} – ${UI.fmt(e.t + e.d)} · ${UI.esc(e.tag)}</div></div>`;
    });
    if (sel === today) {
      const n = UI.nowMin();
      if (n >= dayStart * 60 && n <= dayEnd * 60) html += `<div class="now-line" style="top:${(n - dayStart * 60) / 60 * HOUR}px"></div>`;
    }
    $('#tl').innerHTML = html;
    if (sel === today) { const nl = $('#tl .now-line'); nl && setTimeout(() => nl.scrollIntoView({ block: 'center', behavior: 'smooth' }), 100); }

    // Glance
    const mins = ev.reduce((a, e) => a + e.d, 0);
    const focus = ev.filter(e => e.kind === 'focus').reduce((a, e) => a + e.d, 0);
    let gap = 0; for (let i = 1; i < ev.length; i++) gap = Math.max(gap, ev[i].t - (ev[i - 1].t + ev[i - 1].d));
    $('#g-count').textContent = ev.length;
    $('#g-planned').textContent = `${Math.round(mins / 6) / 10}h`;
    $('#g-focus').textContent = `${Math.round(focus / 6) / 10}h`;
    $('#g-gap').textContent = gap ? (gap >= 60 ? `${Math.floor(gap / 60)}h ${gap % 60}m` : `${gap}m`) : '—';
    $('#g-span').textContent = ev.length ? `${UI.fmtShort(ev[0].t)} – ${UI.fmtShort(ev[ev.length - 1].t + ev[ev.length - 1].d)}` : '—';
    UI.renderRibbon($('#mini-ribbon'), ev, sel === today ? UI.nowMin() : null, { start: dayStart, end: dayEnd });

    // Tasks that day
    const ts = S.tasks.filter(t => t.day === sel).sort((a, b) => (a.time ?? 9e9) - (b.time ?? 9e9));
    $('#day-tasks').innerHTML = ts.length ? ts.map(t => Shell.taskRow(t)).join('') : `<li class="empty" style="padding:18px 8px"><b>No tasks</b>Press N to add one for this day.</li>`;
  }
  $('#tl').addEventListener('click', e => { const b = e.target.closest('.blk'); if (b) eventSheet(S.events.find(x => x.id === +b.dataset.id)); });
  $('#day-tasks').addEventListener('click', e => {
    const li = e.target.closest('.task'); if (!li) return;
    const t = S.tasks.find(x => x.id === +li.dataset.id);
    if (e.target.closest('.check')) { Shell.cycleTask(t); renderDay(); }
    else if (e.target.closest('.flag')) { t.flag = !t.flag; Store.save(); renderDay(); }
    else Shell.taskDetailSheet(t, renderDay);
  });
  document.addEventListener('tasks:changed', renderDay);
  document.addEventListener('store:synced', () => { renderWeek(); renderDay(); });

  /* ---------- Event sheet ---------- */
  const toHM = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  function eventSheet(e) {
    const isNew = !e;
    e = e || { title: '', t: Math.max(dayStart * 60, Math.round(UI.nowMin() / 30) * 30), d: 60, kind: 'plan', tag: 'Plan', day: sel };
    UI.openSheet({
      title: isNew ? 'New event' : 'Edit event',
      body: `
        <div class="field"><label for="e-title">Title</label><input class="input" id="e-title" value="${UI.esc(e.title)}" placeholder="e.g. Stand-up"></div>
        <div class="row2">
          <div class="field"><label for="e-start">Starts</label><input class="input" id="e-start" type="time" value="${toHM(e.t)}"></div>
          <div class="field"><label for="e-dur">Duration</label><select class="select" id="e-dur">${[15, 30, 45, 60, 90, 120, 150, 180, 240].map(m => `<option value="${m}" ${m === e.d ? 'selected' : ''}>${m >= 60 ? `${m / 60}h${m % 60 ? ` ${m % 60}m` : ''}` : `${m} min`}</option>`).join('')}</select></div>
        </div>
        <div class="row2">
          <div class="field"><label for="e-day">Day</label><select class="select" id="e-day">${UI.DAYS_LONG.map((d, i) => `<option value="${i}" ${i === e.day ? 'selected' : ''}>${i === today ? 'Today' : d}</option>`).join('')}</select></div>
          <div class="field"><label>Kind</label><div class="seg" id="e-kind">${[['plan', 'Plan'], ['focus', 'Focus'], ['body', 'Body']].map(([k, l]) => `<button type="button" data-k="${k}" aria-pressed="${e.kind === k}">${l}</button>`).join('')}</div></div>
        </div>
        <div class="field"><label for="e-tag">Label</label><input class="input" id="e-tag" value="${UI.esc(e.tag)}" placeholder="Team, Health, Focus…"></div>`,
      onOpen: el => {
        let kind = e.kind;
        $('#e-kind', el).addEventListener('click', ev => { const b = ev.target.closest('button'); if (!b) return; kind = b.dataset.k; $$('#e-kind button', el).forEach(x => x.setAttribute('aria-pressed', String(x === b))); });
        el._kind = () => kind;
      },
      primary: { label: isNew ? 'Add event' : 'Save', onClick: el => {
        const title = $('#e-title', el).value.trim(); if (!title) { $('#e-title', el).focus(); return; }
        const [hh, mm] = $('#e-start', el).value.split(':').map(Number);
        Object.assign(e, { title, t: hh * 60 + mm, d: +$('#e-dur', el).value, day: +$('#e-day', el).value, kind: el._kind(), tag: $('#e-tag', el).value.trim() || 'Plan' });
        if (isNew) { e.id = Store.nextId(); S.events.push(e); }
        Store.save(); UI.closeSheet(); UI.toast(isNew ? 'Event added' : 'Saved'); sel = e.day; renderWeek(); renderDay();
      } },
      secondary: isNew ? { label: 'Cancel', onClick: UI.closeSheet } : { label: 'Delete', cls: 'danger', onClick: () => { S.events = S.events.filter(x => x.id !== e.id); Store.save(); UI.closeSheet(); UI.toast('Event deleted', 'trash'); renderWeek(); renderDay(); } },
    });
  }
  window.addEventSheet = () => eventSheet(null);
  $('#add-event').addEventListener('click', () => eventSheet(null));

  renderWeek(); renderDay();
  setInterval(renderDay, 30000);
  if (params.get('new') === '1') setTimeout(() => eventSheet(null), 450);
  if (params.get('event')) { const e = S.events.find(x => x.id === +params.get('event')); if (e) { sel = e.day; renderWeek(); renderDay(); setTimeout(() => eventSheet(e), 450); } }
})();
