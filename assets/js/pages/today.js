(() => {
  const S = Store.state;
  const today = Store.today();
  const d = new Date();
  Shell.mount('today', { title: UI.greeting(S.user?.name), sub: d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) });

  const events = () => S.events.filter(e => e.day === today).sort((a, b) => a.t - b.t);
  const { dayStart, dayEnd } = S.prefs;
  $('#ribbon-span').textContent = `Today, ${UI.fmtShort(dayStart * 60)} to ${UI.fmtShort(dayEnd * 60)}`;

  /* ---------- Now + ribbon ---------- */
  function tick() {
    const n = UI.nowMin(), ev = events();
    UI.renderRibbon($('#ribbon'), ev, n, { start: dayStart, end: dayEnd });
    UI.paintNow($('#now'), UI.nowSummary(ev, n));
    $$('#timeline .ev').forEach(li => {
      const e = S.events.find(x => x.id === +li.dataset.id); if (!e) return;
      li.classList.toggle('past', e.t + e.d <= n);
      li.classList.toggle('live', n >= e.t && n < e.t + e.d);
    });
  }

  /* ---------- Schedule list ---------- */
  function renderSchedule() {
    const ev = events();
    $('#timeline').innerHTML = ev.length ? ev.map(e => `
      <li class="ev" data-id="${e.id}">
        <time>${UI.fmt(e.t)}</time>
        <div><div class="t">${UI.esc(e.title)}</div><div class="d">${e.d} min</div></div>
        <span class="tag">${UI.esc(e.tag)}</span>
      </li>`).join('') : `<li class="empty"><b>Nothing scheduled today</b>Add an event and it shows up on the ribbon.<br><a class="btn secondary sm" href="/app/schedule?new=1">Add event</a></li>`;
    const mins = ev.reduce((a, e) => a + e.d, 0);
    $('#sched-sub').textContent = `${ev.length} event${ev.length === 1 ? '' : 's'} · ${Math.round(mins / 6) / 10}h planned`;
    tick();
  }
  $('#timeline').addEventListener('click', e => { const li = e.target.closest('.ev'); if (li) location.href = `/app/schedule?event=${li.dataset.id}`; });

  /* ---------- Focus button on Today card ---------- */
  $('#today-start-focus')?.addEventListener('click', () => {
    const ev = events();
    const n = UI.nowMin();
    const live = ev.find(e => n >= e.t && n < e.t + e.d);
    Shell.openFocusMode(live ? live.title : 'Deep work', live ? Math.max(15, live.d) : 25);
  });

  /* ---------- Tasks ---------- */
  let filter = 'open';
  function renderTasks() {
    const mine = S.tasks.filter(t => t.day === today);
    const counts = { open: mine.filter(t => t.status !== 'done').length, doing: mine.filter(t => t.status === 'doing').length, done: mine.filter(t => t.status === 'done').length };
    $$('#chips button').forEach(b => { b.setAttribute('aria-pressed', String(b.dataset.f === filter)); $('.n', b).textContent = counts[b.dataset.f]; });
    $('#tasks-sub').textContent = `${counts.done} of ${mine.length} done`;
    const list = mine.filter(t => filter === 'open' ? t.status !== 'done' : t.status === filter).sort((a, b) => (a.time ?? 9e9) - (b.time ?? 9e9));
    const msg = { open: ['All clear', 'Nothing open for today. Nice.'], doing: ['Nothing in progress', 'Tap a circle once to start something.'], done: ['Nothing finished yet', 'Finished tasks land here.'] }[filter];
    $('#tasks').innerHTML = list.length ? list.map(t => Shell.taskRow(t)).join('') : `<li class="empty"><b>${msg[0]}</b>${msg[1]}</li>`;
  }
  $('#chips').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { filter = b.dataset.f; renderTasks(); } });
  $('#tasks').addEventListener('click', e => {
    const li = e.target.closest('.task'); if (!li) return;
    const t = S.tasks.find(x => x.id === +li.dataset.id);
    if (e.target.closest('.check')) {
      Shell.cycleTask(t);
      if ((filter === 'open' && t.status === 'done') || (filter !== 'open' && t.status !== filter)) { li.classList.add('leaving'); setTimeout(renderTasks, 220); } else renderTasks();
    } else if (e.target.closest('.flag')) { t.flag = !t.flag; Store.save(); renderTasks(); }
    else if (e.target.closest('.body')) Shell.taskDetailSheet(t, renderTasks);
  });
  $('#add-inline').addEventListener('click', () => Shell.addTaskSheet(today));
  document.addEventListener('tasks:changed', renderTasks);

  /* ---------- Focus chart ---------- */
  function renderChart() {
    const svg = $('#chart'); const W = 400, H = 150, base = 128, gap = 14, bw = (W - gap * 6) / 7, max = Math.max(6, ...S.focus);
    svg.innerHTML = S.focus.map((v, i) => {
      const h = Math.max(4, v / max * (base - 24)), x = i * (bw + gap);
      return `<g><rect class="b ${i === today ? 'today' : ''}" x="${x}" y="${base - h}" width="${bw}" height="${h}" rx="8"></rect><text class="val" x="${x + bw / 2}" y="${base - h - 8}" text-anchor="middle">${v}h</text><text x="${x + bw / 2}" y="${H - 2}" text-anchor="middle">${UI.DAYS[i]}</text></g>`;
    }).join('');
    const total = Math.round(S.focus.reduce((a, b) => a + b, 0) * 10) / 10;
    $('#focus-total').textContent = total;
    const delta = Math.round((total - 18.5) * 10) / 10;
    $('#focus-delta').className = 'delta' + (delta < 0 ? ' down' : '');
    $('#focus-delta').innerHTML = `${icon(delta < 0 ? 'chevronD' : 'arrowUp')}${delta >= 0 ? '+' : ''}${delta}h on last week`;
  }

  /* ---------- Check-ins ---------- */
  const interests = S.prefs.interests;
  $('#focus-card').style.display = interests.includes('focus') ? '' : 'none';
  $('#sleep-block').style.display = interests.includes('sleep') ? '' : 'none';
  function renderStreak() {
    $('#streak-days').innerHTML = S.streak.map(s => `<i class="${s ? 'on' : ''}"></i>`).join('');
    $('#streak-text').textContent = `${S.streak.filter(Boolean).length}-day check-in streak`;
    $$('#dials .dial').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.v === S.sleep[today])));
    $('#checkin-sub').textContent = S.sleep[today] ? `Sleep logged as “${S.sleep[today]}”` : 'One tap each. Takes ten seconds.';
  }
  $('#dials').addEventListener('click', e => {
    const b = e.target.closest('.dial'); if (!b) return;
    S.sleep[today] = b.dataset.v; S.streak[today] = 1; Store.save(); renderStreak();
    UI.toast(`Sleep logged: ${b.dataset.v}`, 'moon');
    UI.sound.playTick();
  });

  // Quick counters for the other interests (stored per day in prefs.quick)
  S.quick = S.quick || {}; const key = `${new Date().toISOString().slice(0, 10)}`; S.quick[key] = S.quick[key] || {};
  const Q = S.quick[key];
  const defs = {
    water: { label: 'Water', icon: 'zap', unit: 'glasses', max: 8, type: 'pips' },
    movement: { label: 'Movement', icon: 'heart', unit: 'min', step: 10, type: 'count' },
    reading: { label: 'Reading', icon: 'layers', unit: 'pages', step: 5, type: 'count' },
    meetings: { label: 'Meetings', icon: 'user', unit: 'today', step: 1, type: 'count' },
    mood: { label: 'Mood', icon: 'sun', type: 'mood' },
    money: { label: 'Spending', icon: 'briefcase', unit: 'spent', step: 5, type: 'count', prefix: '$' },
  };
  function renderQuick() {
    const keys = interests.filter(k => defs[k]);
    $('#quick').innerHTML = keys.map(k => {
      const def = defs[k], v = Q[k] || 0;
      let body = '';
      if (def.type === 'pips') body = `<div class="qv">${v}<small>of ${def.max} ${def.unit}</small></div><div class="pips">${Array.from({ length: def.max }, (_, i) => `<i class="${i < v ? 'on' : ''}"></i>`).join('')}</div><div class="qc"><button data-k="${k}" data-d="-1" aria-label="Less">${icon('chevronD')}</button><button data-k="${k}" data-d="1" aria-label="More">${icon('plus')}</button></div>`;
      else if (def.type === 'count') body = `<div class="qv">${def.prefix || ''}${v}<small>${def.unit}</small></div><div class="qc"><button data-k="${k}" data-d="-${def.step}" aria-label="Less">${icon('chevronD')}</button><button data-k="${k}" data-d="${def.step}" aria-label="More">${icon('plus')}</button></div>`;
      else body = `<div class="qv">${Q.mood || '—'}</div><div class="moods">${['Low', 'Meh', 'Okay', 'Good', 'Great'].map(m => `<button data-mood="${m}" aria-pressed="${Q.mood === m}">${m}</button>`).join('')}</div>`;
      return `<div class="q"><div class="qh">${icon(def.icon)}${def.label}</div>${body}</div>`;
    }).join('');
    $('#checkin-card').style.display = (keys.length || interests.includes('sleep')) ? '' : 'none';
  }
  $('#quick').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.mood) { Q.mood = b.dataset.mood; UI.toast(`Mood: ${Q.mood}`, 'sun'); UI.sound.playTick(); }
    else { const def = defs[b.dataset.k]; Q[b.dataset.k] = Math.max(0, Math.min(def.max || 9999, (Q[b.dataset.k] || 0) + +b.dataset.d)); UI.sound.playTick(); }
    Store.save(); renderQuick();
  });

  document.addEventListener('store:synced', () => {
    renderSchedule();
    renderTasks();
    renderChart();
    renderStreak();
    renderQuick();
  });

  renderSchedule(); renderTasks(); renderChart(); renderStreak(); renderQuick();
  setInterval(tick, 1000);
})();
