(() => {
  const S = Store.state;
  const today = Store.today();
  const params = new URLSearchParams(location.search);
  let list = 'all', scope = 'open', q = '';

  Shell.mount('tasks', { title: 'Tasks', sub: '' });

  const LISTS = [
    { id: 'all', label: 'All tasks', icon: 'layers' },
    { id: 'today', label: 'Today', icon: 'sun' },
    { id: 'flagged', label: 'Flagged', icon: 'flag' },
    { id: 'inbox', label: 'Inbox', icon: 'inbox', h: 'Lists' },
    { id: 'work', label: 'Work', icon: 'briefcase' },
    { id: 'personal', label: 'Personal', icon: 'heart' },
  ];
  const inList = t => list === 'all' ? true : list === 'today' ? t.day === today : list === 'flagged' ? t.flag : t.list === list;

  function renderLists() {
    $('#lists').innerHTML = LISTS.map(l => `${l.h ? `<div class="h">${l.h}</div>` : ''}<button aria-pressed="${l.id === list}" data-l="${l.id}">${icon(l.icon)}${l.label}<span class="n">${S.tasks.filter(t => t.status !== 'done' && (l.id === 'all' ? true : l.id === 'today' ? t.day === today : l.id === 'flagged' ? t.flag : t.list === l.id)).length}</span></button>`).join('');
  }
  $('#lists').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { list = b.dataset.l; renderLists(); render(); } });

  function dayLabel(d) {
    if (d === today) return 'Today';
    if (d === (today + 1) % 7) return 'Tomorrow';
    return UI.DAYS_LONG[d] || 'Upcoming';
  }

  function render() {
    const all = S.tasks.filter(inList);
    const done = all.filter(t => t.status === 'done').length;
    $('#progress-text').textContent = all.length ? `${done} of ${all.length} done in ${LISTS.find(l => l.id === list).label.toLowerCase()}` : 'Nothing here yet';
    $('#progress-bar').style.width = all.length ? (done / all.length * 100) + '%' : '0%';
    $('#page-sub').textContent = `${S.tasks.filter(t => t.status !== 'done').length} open across all lists`;

    let items = all.filter(t => scope === 'all' ? true : scope === 'done' ? t.status === 'done' : t.status !== 'done');
    if (q) items = items.filter(t => t.title.toLowerCase().includes(q) || (t.notes || '').toLowerCase().includes(q));
    // group by day distance from today
    const groups = new Map();
    items.sort((a, b) => ((a.day - today + 7) % 7) - ((b.day - today + 7) % 7) || (a.time ?? 9e9) - (b.time ?? 9e9)).forEach(t => {
      const k = dayLabel(t.day); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(t);
    });
    const g = $('#groups');
    if (!items.length) {
      g.innerHTML = `<div class="empty"><b>${q ? 'No matches' : scope === 'done' ? 'Nothing finished yet' : 'All clear'}</b>${q ? 'Try another word.' : scope === 'done' ? 'Finished tasks land here.' : 'Add a task and it shows up here.'}</div>`;
      return;
    }
    g.innerHTML = [...groups].map(([k, ts]) => `<div class="group-h">${k}<span class="n">${ts.length}</span></div><ul class="tasks">${ts.map(t => Shell.taskRow(t, list === 'all' || list === 'today' || list === 'flagged')).join('')}</ul>`).join('');
  }

  $('#groups').addEventListener('click', e => {
    const li = e.target.closest('.task'); if (!li) return;
    const t = S.tasks.find(x => x.id === +li.dataset.id);
    if (e.target.closest('.check')) {
      Shell.cycleTask(t);
      const leaving = (scope === 'open' && t.status === 'done') || (scope === 'done' && t.status !== 'done');
      if (leaving) { li.classList.add('leaving'); setTimeout(() => { renderLists(); render(); }, 220); } else { renderLists(); render(); }
    } else if (e.target.closest('.flag')) { t.flag = !t.flag; Store.save(); renderLists(); render(); }
    else if (e.target.closest('.body')) Shell.taskDetailSheet(t, () => { renderLists(); render(); });
  });
  $('#scope').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; scope = b.dataset.s; $$('#scope button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); render(); });
  $('#q').addEventListener('input', e => { q = e.target.value.trim().toLowerCase(); render(); });
  $('#clear-done').addEventListener('click', () => {
    const n = S.tasks.filter(t => t.status === 'done').length;
    if (!n) return UI.toast('Nothing to clear', 'trash');
    S.tasks = S.tasks.filter(t => t.status !== 'done'); Store.save(); renderLists(); render(); UI.toast(`Cleared ${n} completed`, 'trash');
  });
  $('#add-inline').addEventListener('click', () => Shell.addTaskSheet(list === 'today' ? today : undefined));
  document.addEventListener('tasks:changed', () => { renderLists(); render(); });
  document.addEventListener('store:synced', () => { renderLists(); render(); });
  document.addEventListener('keydown', e => { if (e.key === '/' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); $('#q').focus(); } });

  renderLists(); render();
  if (params.get('task')) { const t = S.tasks.find(x => x.id === +params.get('task')); if (t) setTimeout(() => Shell.taskDetailSheet(t, () => { renderLists(); render(); }), 450); }
})();
