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

  /* ---------- Session check ---------- */
  if (S.user) {
    const card = $('.auth-card');
    if (card) {
      const banner = document.createElement('div');
      banner.className = 'card';
      banner.style.cssText = 'padding:14px 18px;margin-bottom:20px;background:var(--surface-2);border-radius:14px;display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:13px;';
      banner.innerHTML = `
        <div>Signed in as <b>${UI.esc(S.user.name)}</b></div>
        <a class="btn primary sm" href="app/index.html">Open Daybook →</a>`;
      card.insertBefore(banner, card.firstChild);
    }
  }

  /* ---------- Form & Password Toggle ---------- */
  const form = $('#form');
  const isSignup = form.dataset.mode === 'signup';
  const eye = $('#eye'), pw = $('#pw');
  if (eye) {
    eye.innerHTML = `<svg class="icon" viewBox="0 0 24 24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>`;
    eye.addEventListener('click', () => {
      const show = pw.type === 'password';
      pw.type = show ? 'text' : 'password';
      eye.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    });
  }

  const strength = $('#strength');
  if (strength) pw.addEventListener('input', () => {
    const v = pw.value;
    let s = 0;
    if (v.length >= 8) s++;
    if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++;
    if (/\d/.test(v)) s++;
    if (/[^\w]/.test(v)) s++;
    strength.dataset.s = v.length ? String(Math.max(1, s)) : '0';
  });

  const setInvalid = (key, bad) => {
    const field = $(`.field[data-f="${key}"]`);
    if (field) field.classList.toggle('invalid', bad);
  };
  $$('.input', form).forEach(i => i.addEventListener('input', () => i.closest('.field')?.classList.remove('invalid')));

  function finish(name, email, provider = 'email') {
    Store.signIn(name, email, provider);
    const btn = $('#submit');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `${icon('refresh')} ${isSignup ? 'Creating…' : 'Signing in…'}`;
    }
    UI.sound.playChime();
    setTimeout(() => {
      location.href = isSignup || !S.onboarded ? 'onboarding.html' : 'app/index.html';
    }, 550);
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const email = $('#email').value.trim();
    const okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const okPw = isSignup ? pw.value.length >= 8 : pw.value.length > 0;
    let okName = true, name = '';
    if (isSignup) {
      name = $('#name').value.trim();
      okName = name.length > 0;
      setInvalid('name', !okName);
    }
    setInvalid('email', !okEmail);
    setInvalid('pw', !okPw);
    if (!okEmail || !okPw || !okName) {
      $('.field.invalid .input')?.focus();
      return;
    }
    if (!isSignup) {
      name = S.user?.name || email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
    finish(name, email, 'email');
  });

  /* ---------- Google Sign-In Sheet ---------- */
  function openGoogleAuth() {
    const defaultEmail = S.user?.email || 'saidixitn@gmail.com';
    const defaultName = S.user?.name || 'Sai Dixit Naidu';
    UI.openSheet({
      title: 'Sign in with Google',
      body: `
        <div style="display:flex;flex-direction:column;gap:14px">
          <div style="display:flex;align-items:center;gap:12px;padding:12px;border:1px solid var(--line);border-radius:14px;background:var(--surface-2);cursor:pointer;" id="google-quick-acc">
            <span class="avatar sm" style="background:linear-gradient(135deg,#4285F4,#34A853)">${defaultName[0].toUpperCase()}</span>
            <div style="flex:1">
              <b style="font-size:14px;display:block">${UI.esc(defaultName)}</b>
              <span class="small muted">${UI.esc(defaultEmail)}</span>
            </div>
            ${icon('chevronR')}
          </div>
          <div style="position:relative;text-align:center;font-size:12px;color:var(--ink-3);margin:4px 0">
            <span style="background:var(--surface);padding:0 8px;position:relative;z-index:1">or continue with a different Google account</span>
          </div>
          <div class="field">
            <label for="g-name">Your name</label>
            <input class="input" id="g-name" value="${UI.esc(defaultName)}" placeholder="e.g. Alex Rivers">
          </div>
          <div class="field">
            <label for="g-email">Google Email</label>
            <input class="input" id="g-email" type="email" value="${UI.esc(defaultEmail)}" placeholder="you@gmail.com">
          </div>
        </div>`,
      primary: {
        label: 'Continue with Google',
        onClick: el => {
          const name = $('#g-name', el).value.trim() || defaultName;
          const email = $('#g-email', el).value.trim() || defaultEmail;
          UI.closeSheet();
          UI.toast(`Signed in as ${name}`, 'google');
          finish(name, email, 'google');
        }
      },
      secondary: { label: 'Cancel', onClick: UI.closeSheet },
      onOpen: el => {
        $('#google-quick-acc', el)?.addEventListener('click', () => {
          UI.closeSheet();
          UI.toast(`Signed in as ${defaultName}`, 'google');
          finish(defaultName, defaultEmail, 'google');
        });
      }
    });
  }

  /* ---------- Apple Sign-In Sheet ---------- */
  function openAppleAuth() {
    const defaultEmail = S.user?.email || 'sam.apple@privaterelay.appleid.com';
    const defaultName = S.user?.name || 'Sam Apple';
    let hideEmail = true;

    UI.openSheet({
      title: 'Sign in with Apple ID',
      body: `
        <div style="display:flex;flex-direction:column;gap:14px">
          <div style="display:flex;align-items:center;gap:12px;padding:14px;background:var(--surface-2);border-radius:14px;">
            <span class="avatar sm" style="background:#000;color:#fff">${icon('apple')}</span>
            <div style="flex:1">
              <b style="font-size:14px;display:block">Daybook via Apple ID</b>
              <span class="small muted">Private on-device authentication</span>
            </div>
          </div>
          <div class="field">
            <label>Email privacy</label>
            <div class="seg" id="apple-privacy-seg" style="width:100%">
              <button type="button" class="btn" data-v="hide" aria-pressed="true" style="flex:1;height:38px">Hide My Email</button>
              <button type="button" class="btn" data-v="share" aria-pressed="false" style="flex:1;height:38px">Share My Email</button>
            </div>
            <div class="small muted" id="apple-email-preview" style="margin-top:4px">Relay: user${Math.floor(1000 + Math.random()*9000)}@privaterelay.appleid.com</div>
          </div>
          <div class="field">
            <label for="apple-name">Name</label>
            <input class="input" id="apple-name" value="${UI.esc(defaultName)}" placeholder="Your Name">
          </div>
        </div>`,
      primary: {
        label: 'Authenticate with Apple',
        onClick: el => {
          const name = $('#apple-name', el).value.trim() || 'Apple User';
          const email = hideEmail ? `relay.${Date.now()}@privaterelay.appleid.com` : (S.user?.email || 'user@icloud.com');
          UI.closeSheet();
          UI.toast(`Authenticated with Apple ID`, 'apple');
          finish(name, email, 'apple');
        }
      },
      secondary: { label: 'Cancel', onClick: UI.closeSheet },
      onOpen: el => {
        const seg = $('#apple-privacy-seg', el);
        const preview = $('#apple-email-preview', el);
        seg.addEventListener('click', e => {
          const b = e.target.closest('button');
          if (!b) return;
          hideEmail = b.dataset.v === 'hide';
          $$('button', seg).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
          preview.textContent = hideEmail ? `Relay: user${Math.floor(1000 + Math.random()*9000)}@privaterelay.appleid.com` : (S.user?.email || 'user@icloud.com');
        });
      }
    });
  }

  // Social button click handlers
  $$('[data-social="Google"]').forEach(b => b.addEventListener('click', (e) => {
    e.preventDefault();
    openGoogleAuth();
  }));

  $$('[data-social="Apple"]').forEach(b => b.addEventListener('click', (e) => {
    e.preventDefault();
    openAppleAuth();
  }));

  // Legal and recovery links
  $('#forgot-link')?.addEventListener('click', (e) => { e.preventDefault(); UI.showForgotPassword(); });
  $('#terms-link')?.addEventListener('click', (e) => { e.preventDefault(); UI.showTerms(); });
  $('#privacy-link')?.addEventListener('click', (e) => { e.preventDefault(); UI.showPrivacy(); });
})();
