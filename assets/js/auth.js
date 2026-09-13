(() => {
  const S = Store.state;

  /* ---------- Visual panel: live ribbon ---------- */
  const vis = $('#vis-now'), rib = $('#vis-ribbon');
  if (vis && rib) {
    const day = Store.today();
    const events = S.events.filter(e => e.day === (day >= 5 ? 0 : day));
    let t = 8 * 60 + 30;
    const paint = () => { UI.renderRibbon(rib, events, t); UI.paintNow(vis, UI.nowSummary(events, t)); };
    paint();
    setInterval(() => { t += 4; if (t > 1320) t = 400; paint(); }, 70);
  }

  /* ---------- Form ---------- */
  const form = $('#form');
  const isSignup = form.dataset.mode === 'signup';
  const eye = $('#eye'), pw = $('#pw');
  eye.innerHTML = `<svg class="icon" viewBox="0 0 24 24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>`;
  eye.addEventListener('click', () => { const show = pw.type === 'password'; pw.type = show ? 'text' : 'password'; eye.setAttribute('aria-label', show ? 'Hide password' : 'Show password'); });

  const strength = $('#strength');
  if (strength) pw.addEventListener('input', () => {
    const v = pw.value; let s = 0;
    if (v.length >= 8) s++; if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++; if (/\d/.test(v)) s++; if (/[^\w]/.test(v)) s++;
    strength.dataset.s = v.length ? String(Math.max(1, s)) : '0';
  });

  const setInvalid = (key, bad) => $(`.field[data-f="${key}"]`).classList.toggle('invalid', bad);
  $$('.input', form).forEach(i => i.addEventListener('input', () => i.closest('.field').classList.remove('invalid')));

  function finish(name, email) {
    Store.signIn(name, email);
    const btn = $('#submit');
    btn.disabled = true; btn.innerHTML = `${icon('refresh')} ${isSignup ? 'Creating…' : 'Logging in…'}`;
    setTimeout(() => location.href = isSignup || !S.onboarded ? 'onboarding.html' : 'app/index.html', 650);
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const email = $('#email').value.trim();
    const okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const okPw = isSignup ? pw.value.length >= 8 : pw.value.length > 0;
    let okName = true, name = '';
    if (isSignup) { name = $('#name').value.trim(); okName = name.length > 0; setInvalid('name', !okName); }
    setInvalid('email', !okEmail); setInvalid('pw', !okPw);
    if (!okEmail || !okPw || !okName) { $('.field.invalid .input')?.focus(); return; }
    if (!isSignup) name = S.user?.name || email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    finish(name, email);
  });

  $$('[data-social]').forEach(b => b.addEventListener('click', () => {
    UI.toast(`${b.dataset.social} sign-in is a demo here`, 'lock');
    finish(S.user?.name || 'Sam', `sam@${b.dataset.social.toLowerCase()}.com`);
  }));
})();
