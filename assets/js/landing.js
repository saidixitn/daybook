(() => {
  const S = Store.state;
  const today = Store.today();
  const events = S.events.filter(e => e.day === (today === 6 ? 0 : today)); // weekends look sparse; show Monday on Sunday

  /* ---------- Session awareness ---------- */
  if (S.user) {
    const navActions = $('#nav-actions');
    if (navActions) {
      const loginBtn = $('#nav-login');
      const signupBtn = $('#nav-signup');
      if (loginBtn) loginBtn.style.display = 'none';
      if (signupBtn) {
        signupBtn.textContent = 'Open Daybook →';
        signupBtn.href = '/app';
      }
    }
    const heroStart = $('#hero-start');
    if (heroStart) {
      heroStart.textContent = 'Open Daybook →';
      heroStart.href = '/app';
    }
  }

  /* ---------- Theme toggle ---------- */
  const themeBtn = $('#theme-toggle');
  const paintTheme = () => themeBtn.innerHTML = icon(document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon');
  paintTheme();
  themeBtn.addEventListener('click', () => {
    Store.setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    paintTheme();
  });
  document.addEventListener('theme:changed', paintTheme);

  /* ---------- Nav border on scroll ---------- */
  const nav = $('#nav');
  addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 8), { passive: true });

  /* ---------- Demo: scrubber ---------- */
  const scrub = $('#scrub'), scrubTime = $('#scrub-time'), demoNow = $('#demo-now'), demoRibbon = $('#demo-ribbon');
  function paintDemo(min) {
    scrub.value = min;
    scrub.style.setProperty('--p', ((min - 360) / (1380 - 360) * 100) + '%');
    scrubTime.textContent = UI.fmt(min);
    UI.renderRibbon(demoRibbon, events, min);
    UI.paintNow(demoNow, UI.nowSummary(events, min));
  }
  scrub.addEventListener('input', () => paintDemo(+scrub.value));
  $('#scrub-live').addEventListener('click', () => {
    const n = Math.round(UI.nowMin());
    paintDemo(Math.min(1380, Math.max(360, n)));
    UI.sound.playTick();
  });

  // Start gentle auto-play until touched
  let auto = true, t = 8 * 60 + 40;
  paintDemo(t);
  const timer = setInterval(() => {
    if (!auto) return clearInterval(timer);
    t += 2;
    if (t > 1300) t = 400;
    paintDemo(t);
  }, 80);
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => scrub.addEventListener(ev, () => auto = false, { once: true }));
  $('#scrub-live').addEventListener('click', () => auto = false);

  /* ---------- Demo: tasks ---------- */
  const demoTasks = [
    { id: 1, title: 'Reply to emails', time: '9:00 AM', status: 'todo' },
    { id: 2, title: 'Prepare presentation', time: '11:30 AM', status: 'doing' },
    { id: 3, title: 'Review report', time: '3:30 PM', status: 'todo' },
    { id: 4, title: 'Morning run', time: '7:00 AM', status: 'done' },
  ];
  function taskRow(t) {
    return `<div class="task ${t.status}" data-id="${t.id}">
      <button class="check" aria-label="Toggle"><svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg></button>
      <div class="body"><div class="name">${UI.esc(t.title)}</div><div class="when">${icon('clock')}${t.time}</div></div>
      <span></span></div>`;
  }
  function mountTasks(el, list) {
    el.innerHTML = list.map(taskRow).join('');
    el.addEventListener('click', e => {
      const row = e.target.closest('.task');
      if (!row || !e.target.closest('.check')) return;
      const t = list.find(x => x.id === +row.dataset.id);
      t.status = { todo: 'doing', doing: 'done', done: 'todo' }[t.status];
      row.className = `task ${t.status}`;
      if (t.status === 'done') {
        UI.toast(`Done: ${t.title}`);
        UI.sound.playChime();
      } else {
        UI.sound.playTick();
      }
    });
  }
  mountTasks($('#demo-tasks'), demoTasks);
  mountTasks($('#feat-tasks'), [
    { id: 1, title: 'Send the invoice', time: '10:00 AM', status: 'todo' },
    { id: 2, title: 'Sketch onboarding', time: '2:00 PM', status: 'doing' },
    { id: 3, title: 'Water the plants', time: '6:00 PM', status: 'todo' },
  ]);

  /* ---------- Demo: dials ---------- */
  $('#demo-dials').addEventListener('click', e => {
    const d = e.target.closest('.dial');
    if (!d) return;
    $$('#demo-dials .dial').forEach(x => x.setAttribute('aria-pressed', String(x === d)));
    UI.toast(`Sleep logged: ${d.dataset.v}`, 'moon');
    UI.sound.playTick();
  });

  /* ---------- Feature: mini now ---------- */
  const featNow = $('#feat-now');
  let fp = 20;
  setInterval(() => {
    fp = fp >= 100 ? 5 : fp + 0.4;
    $('.bar i', featNow).style.width = fp + '%';
    $('.foot span:first-child', featNow).textContent = `${Math.ceil(60 - fp * .6)} min left`;
    $('.foot span:last-child', featNow).textContent = 'Next: Deep work at 10:30 AM';
  }, 80);

  /* ---------- Feature: typing palette ---------- */
  const typed = $('#typed');
  const phrases = ['new task', 'insights', 'dark theme', 'log sleep'];
  let pi = 0, ci = 0, del = false;
  setInterval(() => {
    const p = phrases[pi];
    if (!del) {
      ci++;
      if (ci > p.length + 12) del = true;
    } else {
      ci--;
      if (ci <= 0) {
        del = false;
        pi = (pi + 1) % phrases.length;
      }
    }
    typed.textContent = p.slice(0, Math.min(ci, p.length));
  }, 90);

  /* ---------- Feature: week bars ---------- */
  const week = $('#feat-week');
  const vals = [3.5, 4.2, 2.8, 5.1, 3.9, 1.5, 0.8];
  week.innerHTML = vals.map((v, i) => `<div class="${i === 3 ? 'hi' : ''}" style="height:${v / 5.1 * 100}%"></div>`).join('');
  setInterval(() => {
    $$('#feat-week div').forEach(b => {
      const v = 1 + Math.random() * 4;
      b.style.height = v / 5 * 100 + '%';
    });
  }, 2600);

  /* ---------- Pricing toggle ---------- */
  $('#billing').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    $$('#billing button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    const yearly = b.dataset.b === 'yearly';
    $$('.plan .price b[data-m]').forEach(el => el.textContent = yearly ? el.dataset.y : el.dataset.m);
    UI.sound.playTick();
  });

  /* ---------- Reveal ---------- */
  const io = new IntersectionObserver(es => es.forEach(en => {
    if (en.isIntersecting) {
      en.target.classList.add('in');
      io.unobserve(en.target);
    }
  }), { threshold: .15 });
  $$('.reveal').forEach(el => io.observe(el));

  /* ---------- Footer modals ---------- */
  $('#footer-about')?.addEventListener('click', (e) => { e.preventDefault(); UI.showAbout(); });
  $('#footer-privacy')?.addEventListener('click', (e) => { e.preventDefault(); UI.showPrivacy(); });
  $('#footer-terms')?.addEventListener('click', (e) => { e.preventDefault(); UI.showTerms(); });

  /* ---------- Palette on landing ---------- */
  UI.initPalette([
    { group: 'Go to', label: 'Get started', icon: 'sparkle', hint: '', run: () => location.href = 'signup.html' },
    { group: 'Go to', label: 'Log in', icon: 'user', run: () => location.href = 'login.html' },
    { group: 'Go to', label: 'Try the demo', icon: 'play', run: () => location.href = 'app/index.html?demo=1' },
    { group: 'Go to', label: 'Pricing', icon: 'layers', run: () => { UI.closePalette(); $('#pricing').scrollIntoView({ behavior: 'smooth' }); } },
    { group: 'Go to', label: 'How it works', icon: 'zap', run: () => { UI.closePalette(); $('#how').scrollIntoView({ behavior: 'smooth' }); } },
    { group: 'Actions', label: 'Toggle dark theme', icon: 'moon', hint: 'T', run: () => { UI.closePalette(); themeBtn.click(); } },
  ]);
  document.addEventListener('keydown', e => {
    if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
    if (e.key.toLowerCase() === 't') themeBtn.click();
  });

  /* ---------- PWA Service Worker Registration ---------- */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }
})();
