(() => {
  const S = Store.state;
  Shell.mount('settings', { title: 'Settings', sub: 'Make Daybook yours' });

  /* Profile */
  $('#s-name').value = S.user?.name || '';
  $('#s-email').value = S.user?.email || '';
  $('#save-profile').addEventListener('click', () => {
    const name = $('#s-name').value.trim();
    if (!name) { $('#s-name').focus(); return; }
    Store.signIn(name, $('#s-email').value.trim(), S.user?.provider || 'email', S.user?.avatar);
    UI.toast('Profile saved');
    UI.sound.playTick();
    setTimeout(() => location.reload(), 450);
  });

  /* Theme */
  const paintTheme = () => $$('#s-theme button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.t === S.prefs.theme)));
  paintTheme();
  $('#s-theme').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    Store.setTheme(b.dataset.t);
    paintTheme();
  });

  /* Sound & Switches */
  $$('.switch').forEach(sw => {
    const prop = sw.dataset.p;
    sw.setAttribute('aria-checked', String(!!S.prefs[prop]));
    sw.addEventListener('click', () => {
      S.prefs[prop] = !S.prefs[prop];
      sw.setAttribute('aria-checked', String(S.prefs[prop]));
      Store.save();
      UI.toast(`${prop === 'sound' ? 'Sound' : 'Notification'} updated`);
      if (prop === 'sound' && S.prefs.sound) UI.sound.playTick();

      // If notification turned on, request browser permission
      if (prop.startsWith('notify') && S.prefs[prop] && 'Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(perm => {
          if (perm === 'granted') UI.toast('Browser notifications enabled', 'bell');
        });
      }
    });
  });

  /* Day hours */
  const opts = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i).map(h => `<option value="${h}">${UI.fmt(h * 60)}</option>`).join('');
  $('#s-start').innerHTML = opts(4, 12);
  $('#s-end').innerHTML = opts(16, 24);
  $('#s-start').value = S.prefs.dayStart;
  $('#s-end').value = S.prefs.dayEnd;
  $('#s-start').addEventListener('change', e => { S.prefs.dayStart = +e.target.value; Store.save(); UI.toast('Day start updated'); });
  $('#s-end').addEventListener('change', e => { S.prefs.dayEnd = +e.target.value; Store.save(); UI.toast('Day end updated'); });

  /* Interests */
  const paintInterests = () => $$('#s-interests .chip').forEach(c => c.setAttribute('aria-pressed', String(S.prefs.interests.includes(c.dataset.k))));
  paintInterests();
  $('#s-interests').addEventListener('click', e => {
    const c = e.target.closest('.chip');
    if (!c) return;
    const k = c.dataset.k;
    S.prefs.interests = S.prefs.interests.includes(k) ? S.prefs.interests.filter(x => x !== k) : [...S.prefs.interests, k];
    Store.save();
    paintInterests();
  });

  /* Test Notification */
  $('#test-notify')?.addEventListener('click', () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Daybook Gentle Nudge', {
        body: 'Upcoming: Deep work block in 5 minutes.',
        icon: '../assets/favicon.svg'
      });
      UI.sound.playChime();
      UI.toast('Test nudge sent!', 'bell');
    } else if ('Notification' in window) {
      Notification.requestPermission().then(perm => {
        if (perm === 'granted') {
          new Notification('Daybook Gentle Nudge', {
            body: 'Upcoming: Deep work block in 5 minutes.',
            icon: '../assets/favicon.svg'
          });
          UI.sound.playChime();
          UI.toast('Test nudge sent!', 'bell');
        } else {
          UI.toast('Notification permission was blocked in browser settings', 'bell');
        }
      });
    } else {
      UI.toast('Browser does not support notifications', 'bell');
    }
  });

  /* Data Export & Import */
  $('#export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `daybook-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    UI.sound.playTick();
    UI.toast('Export downloaded', 'download');
  });

  const importFile = $('#import-file');
  $('#import-btn')?.addEventListener('click', () => importFile.click());
  importFile?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const res = Store.importData(ev.target.result);
      if (res.success) {
        UI.sound.playChime();
        UI.toast('Data imported successfully!', 'check');
        setTimeout(() => location.reload(), 500);
      } else {
        UI.toast(`Import failed: ${res.error}`, 'x');
      }
    };
    reader.readAsText(file);
  });

  $('#reset').addEventListener('click', () => {
    UI.openSheet({
      title: 'Reset all data?',
      body: `<p class="muted">This restores original sample tasks, events and check-ins. Your name and theme stay.</p>`,
      primary: {
        label: 'Reset',
        onClick: () => {
          const u = S.user, t = S.prefs.theme;
          Store.reset();
          Store.state.user = u;
          Store.state.prefs.theme = t;
          Store.state.onboarded = true;
          Store.save();
          UI.closeSheet();
          UI.toast('Data reset', 'refresh');
          setTimeout(() => location.reload(), 450);
        }
      },
      secondary: { label: 'Keep my data', onClick: UI.closeSheet },
    });
  });

  /* Account & Provider */
  const provider = S.user?.provider || 'email';
  const badge = $('#auth-provider-badge');
  if (badge) {
    if (provider === 'google') {
      badge.innerHTML = `<span class="provider-badge">${icon('google')} Signed in with Google</span>`;
    } else if (provider === 'apple') {
      badge.innerHTML = `<span class="provider-badge">${icon('apple')} Signed in with Apple ID</span>`;
    } else {
      badge.innerHTML = `<span class="provider-badge">${icon('mail')} Signed in with Email</span>`;
    }
  }

  $('#signout').addEventListener('click', () => {
    Store.signOut();
    location.href = '/login';
  });
})();
