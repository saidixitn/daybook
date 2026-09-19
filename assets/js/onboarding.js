(() => {
  const S = Store.state;
  let step = 0;
  const steps = $$('.ob-step');
  const next = $('#next'), back = $('#back'), count = $('#count');
  const nameIn = $('#ob-name');
  if (S.user?.name) nameIn.value = S.user.name;

  // Hour pickers
  let start = S.prefs.dayStart, end = S.prefs.dayEnd;
  $$('[data-adj]').forEach(b => { b.innerHTML = icon(b.dataset.d === '1' ? 'plus' : 'chevronD'); if (b.dataset.d !== '1') b.innerHTML = `<svg class="icon" viewBox="0 0 24 24"><path d="M5 12h14"/></svg>`; });
  const events = S.events.filter(e => e.day === 0);
  function paintHours() {
    $('#start-val').textContent = UI.fmt(start * 60);
    $('#end-val').textContent = UI.fmt(end * 60);
    UI.renderRibbon($('#ob-ribbon'), events, null, { start, end });
  }
  $$('[data-adj]').forEach(b => b.addEventListener('click', () => {
    const d = +b.dataset.d;
    if (b.dataset.adj === 'start') start = Math.min(end - 6, Math.max(4, start + d));
    else end = Math.max(start + 6, Math.min(24, end + d));
    paintHours();
  }));
  paintHours();

  // Interests
  const interests = $('#interests');
  $$('.chip', interests).forEach(c => c.setAttribute('aria-pressed', String(S.prefs.interests.includes(c.dataset.k))));
  interests.addEventListener('click', e => {
    const c = e.target.closest('.chip'); if (!c) return;
    c.setAttribute('aria-pressed', String(c.getAttribute('aria-pressed') !== 'true'));
    paintCount();
  });
  const selected = () => $$('.chip[aria-pressed="true"]', interests).map(c => c.dataset.k);
  function paintCount() { count.textContent = step === 1 ? `${selected().length} selected` : step === 0 ? 'Step 1 of 3' : 'Step 3 of 3'; }

  function show(i) {
    step = i;
    steps.forEach((s, j) => s.classList.toggle('active', j === i));
    $$('#progress i').forEach((p, j) => p.classList.toggle('on', j <= i));
    back.style.display = i ? '' : 'none';
    next.textContent = i === 2 ? 'Open my day' : 'Continue';
    paintCount();
    setTimeout(() => steps[i].querySelector('input,button')?.focus(), 80);
  }

  next.addEventListener('click', () => {
    if (step === 0) {
      const n = nameIn.value.trim();
      if (!n) {
        nameIn.focus();
        nameIn.classList.remove('shake');
        void nameIn.offsetWidth;
        nameIn.classList.add('shake');
        return;
      }
      Store.signIn(n, S.user?.email || '');
    }
    if (step === 1) { S.prefs.interests = selected(); Store.save(); }
    if (step === 2) {
      S.prefs.dayStart = start; S.prefs.dayEnd = end; S.onboarded = true; Store.save();
      next.disabled = true; next.textContent = 'Opening…';
      setTimeout(() => location.href = 'app/index.html', 450);
      return;
    }
    show(step + 1);
  });
  back.addEventListener('click', () => show(step - 1));
  nameIn.addEventListener('keydown', e => { if (e.key === 'Enter') next.click(); });
  show(0);
})();
