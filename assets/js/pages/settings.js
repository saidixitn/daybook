(() => {
  const S = Store.state;
  Shell.mount('settings', { title: 'Settings', sub: 'Make Daybook yours' });

  /* Profile */
  $('#s-name').value = S.user?.name || '';
  $('#s-email').value = S.user?.email || '';
  $('#save-profile').addEventListener('click', () => {
    const name = $('#s-name').value.trim(); if (!name) { $('#s-name').focus(); return; }
    Store.signIn(name, $('#s-email').value.trim());
    UI.toast('Profile saved');
    setTimeout(() => location.reload(), 500);
  });

  /* Theme */
  const paintTheme = () => $$('#s-theme button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.t === S.prefs.theme)));
  paintTheme();
  $('#s-theme').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; Store.setTheme(b.dataset.t); paintTheme(); });

  /* Day hours */
  const opts = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i).map(h => `<option value="${h}">${UI.fmt(h * 60)}</option>`).join('');
  $('#s-start').innerHTML = opts(4, 12); $('#s-end').innerHTML = opts(16, 24);
  $('#s-start').value = S.prefs.dayStart; $('#s-end').value = S.prefs.dayEnd;
  $('#s-start').addEventListener('change', e => { S.prefs.dayStart = +e.target.value; Store.save(); UI.toast('Day start updated'); });
  $('#s-end').addEventListener('change', e => { S.prefs.dayEnd = +e.target.value; Store.save(); UI.toast('Day end updated'); });

  /* Interests */
  const paintInterests = () => $$('#s-interests .chip').forEach(c => c.setAttribute('aria-pressed', String(S.prefs.interests.includes(c.dataset.k))));
  paintInterests();
  $('#s-interests').addEventListener('click', e => {
    const c = e.target.closest('.chip'); if (!c) return;
    const k = c.dataset.k;
    S.prefs.interests = S.prefs.interests.includes(k) ? S.prefs.interests.filter(x => x !== k) : [...S.prefs.interests, k];
    Store.save(); paintInterests();
  });

  /* Notifications */
  $$('.switch').forEach(sw => {
    sw.setAttribute('aria-checked', String(!!S.prefs[sw.dataset.p]));
    sw.addEventListener('click', () => { S.prefs[sw.dataset.p] = !S.prefs[sw.dataset.p]; sw.setAttribute('aria-checked', String(S.prefs[sw.dataset.p])); Store.save(); });
  });

  /* Data */
  $('#export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'daybook-export.json'; a.click();
    UI.toast('Export started', 'download');
  });
  $('#reset').addEventListener('click', () => {
    UI.openSheet({
      title: 'Reset all data?',
      body: `<p class="muted">This restores the sample tasks, events and check-ins. Your name and theme stay.</p>`,
      primary: { label: 'Reset', onClick: () => { const u = S.user, t = S.prefs.theme; Store.reset(); Store.state.user = u; Store.state.prefs.theme = t; Store.state.onboarded = true; Store.save(); UI.closeSheet(); UI.toast('Data reset', 'refresh'); setTimeout(() => location.reload(), 500); } },
      secondary: { label: 'Keep my data', onClick: UI.closeSheet },
    });
  });

  /* Account */
  $('#signout').addEventListener('click', () => { Store.signOut(); location.href = '../login.html'; });
})();
