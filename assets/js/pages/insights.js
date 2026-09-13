(() => {
  const S = Store.state;
  const today = Store.today();
  Shell.mount('insights', { title: 'Insights', sub: 'Your week in a few numbers' });

  const LEVELS = { Rough: 1, Okay: 2, Good: 3, Great: 4 };
  const focusTotal = Math.round(S.focus.reduce((a, b) => a + b, 0) * 10) / 10;
  const done = S.tasks.filter(t => t.status === 'done').length, doing = S.tasks.filter(t => t.status === 'doing').length, todo = S.tasks.filter(t => t.status === 'todo').length;
  const rated = S.sleep.filter(Boolean);
  const avg = rated.length ? rated.reduce((a, v) => a + LEVELS[v], 0) / rated.length : 0;
  const avgLabel = avg ? Object.keys(LEVELS).reduce((best, k) => Math.abs(LEVELS[k] - avg) < Math.abs(LEVELS[best] - avg) ? k : best, 'Okay') : '—';
  const streak = S.streak.filter(Boolean).length;
  const bestDay = S.focus.indexOf(Math.max(...S.focus));

  /* ---------- Tiles ---------- */
  $('#tiles').innerHTML = [
    { k: 'Focus this week', icon: 'zap', v: `${focusTotal}<small>h</small>`, d: `Best day ${UI.DAYS_LONG[bestDay]} (${S.focus[bestDay]}h)` },
    { k: 'Tasks done', icon: 'check', v: `${done}<small>of ${S.tasks.length}</small>`, d: `${doing} in progress · ${todo} open` },
    { k: 'Sleep average', icon: 'moon', v: avgLabel, d: `${rated.length} nights rated` },
    { k: 'Check-in streak', icon: 'sparkle', v: `${streak}<small>days</small>`, d: streak >= 5 ? 'Keep it going' : 'Log today to extend it' },
  ].map(t => `<div class="tile"><div class="k">${icon(t.icon)}${t.k}</div><div class="v">${t.v}</div><div class="d">${t.d}</div></div>`).join('');

  /* ---------- Focus bars ---------- */
  const fc = $('#focus-chart'); const W = 400, H = 150, base = 128, gap = 14, bw = (W - gap * 6) / 7, max = Math.max(6, ...S.focus);
  fc.innerHTML = S.focus.map((v, i) => { const h = Math.max(4, v / max * (base - 24)), x = i * (bw + gap); return `<g><rect class="b ${i === today ? 'today' : ''}" x="${x}" y="${base - h}" width="${bw}" height="${h}" rx="8"></rect><text class="val" x="${x + bw / 2}" y="${base - h - 8}" text-anchor="middle">${v}h</text><text x="${x + bw / 2}" y="${H - 2}" text-anchor="middle">${UI.DAYS[i]}</text></g>`; }).join('');
  $('#focus-total').textContent = focusTotal;

  /* ---------- Sleep line ---------- */
  const sc = $('#sleep-chart'); const pad = 44, top = 14, bot = 118;
  const x = i => pad + i * ((W - pad * 2) / 6), y = v => bot - (v - 1) / 3 * (bot - top);
  const pts = S.sleep.map((v, i) => v ? [x(i), y(LEVELS[v])] : null);
  const segs = []; let cur = [];
  pts.forEach(p => { if (p) cur.push(p); else { if (cur.length) segs.push(cur); cur = []; } }); if (cur.length) segs.push(cur);
  const path = segs.map(seg => seg.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ')).join(' ');
  const area = segs.filter(s => s.length > 1).map(seg => `M${seg[0][0]},${bot} ` + seg.map(p => `L${p[0]},${p[1]}`).join(' ') + ` L${seg[seg.length - 1][0]},${bot} Z`).join(' ');
  sc.innerHTML = `
    ${[1, 2, 3, 4].map(l => `<line class="lvl" x1="${pad}" x2="${W - pad}" y1="${y(l)}" y2="${y(l)}"/><text x="${pad - 6}" y="${y(l) + 4}" text-anchor="end">${['', 'Rough', 'Okay', 'Good', 'Great'][l]}</text>`).join('')}
    <path class="area" d="${area}"/><path d="${path}"/>
    ${pts.map((p, i) => p ? `<circle class="${i === today ? 'today' : ''}" cx="${p[0]}" cy="${p[1]}" r="4"><title>${UI.DAYS_LONG[i]}: ${S.sleep[i]}</title></circle>` : '').join('')}
    ${S.sleep.map((_, i) => `<text x="${x(i)}" y="${H - 2}" text-anchor="middle">${UI.DAYS[i]}</text>`).join('')}`;
  $('#sleep-avg').textContent = avgLabel;

  /* ---------- Ring ---------- */
  const pct = S.tasks.length ? done / S.tasks.length : 0;
  setTimeout(() => $('#ring').setAttribute('stroke-dasharray', `${pct * 314} 314`), 50);
  $('#ring-text').textContent = `${Math.round(pct * 100)}%`;
  $('#ring-meta').innerHTML = [['Done', done, 'var(--good)'], ['In progress', doing, 'var(--accent)'], ['To do', todo, 'var(--sunk)']].map(([l, n, c]) => `<div><i style="background:${c}"></i>${l}<b>${n}</b></div>`).join('');

  /* ---------- Observations ---------- */
  const obs = [];
  const worst = S.focus.indexOf(Math.min(...S.focus.slice(0, 5)));
  obs.push({ icon: 'zap', text: `Your deepest work happens on <b>${UI.DAYS_LONG[bestDay]}</b>. Protect that morning — it carries the week.` });
  if (rated.length >= 3) {
    const roughIdx = S.sleep.findIndex(v => v === 'Rough');
    if (roughIdx >= 0 && S.focus[roughIdx] < focusTotal / 7) obs.push({ icon: 'moon', text: `A rough night on <b>${UI.DAYS_LONG[roughIdx]}</b> lined up with your lowest focus day. Sleep is showing up in the work.` });
    else obs.push({ icon: 'moon', text: `Sleep has been mostly <b>${avgLabel.toLowerCase()}</b> this week. That’s a steady base to build on.` });
  }
  obs.push({ icon: 'tasks', text: pct >= .5 ? `You’ve cleared <b>${Math.round(pct * 100)}%</b> of everything on your lists. Consider clearing the done column to keep the view light.` : `Most of your tasks are still open. Try dragging two into “In progress” and ignoring the rest until they’re done.` });
  if (S.focus[worst] < 2) obs.push({ icon: 'calendar', text: `<b>${UI.DAYS_LONG[worst]}</b> has almost no focus time. If meetings are the reason, block one 90-minute slot before noon.` });
  $('#insights').innerHTML = obs.map(o => `<div class="insight"><span class="ic">${icon(o.icon)}</span><div>${o.text}</div></div>`).join('');
})();
