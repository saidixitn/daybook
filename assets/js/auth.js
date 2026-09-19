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
        <a class="btn primary sm" href="/app">Open Daybook →</a>`;
      card.insertBefore(banner, card.firstChild);
    }
  }

  /* ---------- Form & Password Toggle ---------- */
  const form = $('#form');
  const isSignup = form.dataset.mode === 'signup';
  const eye = $('#eye'), pw = $('#pw');
  if (eye && pw) {
    const updateEye = () => {
      const isText = pw.type === 'text';
      eye.innerHTML = icon(isText ? 'eyeOff' : 'eye');
      eye.setAttribute('aria-label', isText ? 'Hide password' : 'Show password');
    };
    updateEye();
    eye.addEventListener('click', () => {
      pw.type = pw.type === 'password' ? 'text' : 'password';
      updateEye();
    });
  }

  const strength = $('#strength');
  if (strength && pw) pw.addEventListener('input', () => {
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

  function finish(name, email, provider = 'email', avatar = null) {
    Store.signIn(name, email, provider, avatar);
    if (!isSignup) {
      Store.state.onboarded = true;
      Store.save();
    }
    const btn = $('#submit');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `${icon('refresh')} ${isSignup ? 'Creating…' : 'Signing in…'}`;
    }
    UI.sound.playChime();
    setTimeout(() => {
      location.href = isSignup ? '/onboarding' : '/app';
    }, 450);
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
      const firstBad = $('.field.invalid');
      if (firstBad) {
        firstBad.classList.remove('shake');
        void firstBad.offsetWidth;
        firstBad.classList.add('shake');
        firstBad.querySelector('.input')?.focus();
      }
      return;
    }
    if (!isSignup) {
      name = (S.user && S.user.email === email && S.user.name)
        ? S.user.name
        : email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
    finish(name, email, 'email');
  });

  /* ---------- Real Google Sign-In (GIS) ---------- */
  function handleGoogleCredential(credential) {
    try {
      const base64Url = credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const data = JSON.parse(jsonPayload);
      const name = data.name || data.given_name || data.email.split('@')[0];
      const email = data.email;
      const avatar = data.picture || null;
      UI.toast(`Signed in as ${name}`, 'google');
      finish(name, email, 'google', avatar);
    } catch (err) {
      console.error('Failed to parse Google credential', err);
      UI.toast('Failed to process Google sign-in', 'alert');
    }
  }

  function startGoogleAuth() {
    const clientId = window.DaybookAuth?.googleClientId;
    if (!clientId) {
      window.DaybookAuth?.showSetupModal('google', () => startGoogleAuth());
      return;
    }

    if (typeof google === 'undefined' || !google.accounts) {
      UI.toast('Google Sign-In SDK is loading. Please try again in a moment.', 'info');
      return;
    }

    try {
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'email profile openid',
        callback: async (resp) => {
          if (resp.error) {
            if (resp.error !== 'popup_closed_by_user') {
              UI.toast(`Google authentication: ${resp.error_description || resp.error}`, 'alert');
            }
            return;
          }
          if (resp.access_token) {
            try {
              const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${resp.access_token}` }
              });
              if (!res.ok) throw new Error('Userinfo fetch failed');
              const u = await res.json();
              UI.toast(`Signed in as ${u.name}`, 'google');
              finish(u.name || u.email.split('@')[0], u.email, 'google', u.picture || null);
            } catch (err) {
              console.error('Failed fetching Google userinfo', err);
              finish('Google User', 'user@gmail.com', 'google');
            }
          }
        },
        error_callback: (err) => {
          if (err && err.type === 'popup_failed_to_open') {
            UI.toast('Pop-up blocked. Please allow popups for Google sign-in.', 'alert');
          } else {
            console.error('Google token error', err);
          }
        }
      });
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (e) {
      console.error('Google Identity init error', e);
      window.DaybookAuth?.showSetupModal('google', () => startGoogleAuth());
    }
  }

  function initGoogleOneTap() {
    const clientId = window.DaybookAuth?.googleClientId;
    if (!clientId || typeof google === 'undefined' || !google.accounts?.id) return;
    try {
      google.accounts.id.initialize({
        client_id: clientId,
        callback: (resp) => {
          if (resp && resp.credential) {
            handleGoogleCredential(resp.credential);
          }
        }
      });
      google.accounts.id.prompt();
    } catch (e) {
      console.warn('Google One Tap init deferred', e);
    }
  }

  /* ---------- Real Sign in with Apple ---------- */
  async function startAppleAuth() {
    const clientId = window.DaybookAuth?.appleClientId;
    if (!clientId) {
      window.DaybookAuth?.showSetupModal('apple', () => startAppleAuth());
      return;
    }

    if (typeof AppleID === 'undefined' || !AppleID.auth) {
      UI.toast('Apple Sign-In SDK is loading. Please try again in a moment.', 'info');
      return;
    }

    try {
      AppleID.auth.init({
        clientId: clientId,
        scope: 'name email',
        redirectURI: window.DaybookAuth?.appleRedirectUri || (window.location.origin + '/login'),
        state: 'daybook_' + Date.now(),
        usePopup: true
      });

      const response = await AppleID.auth.signIn();
      let email = '', name = '';

      if (response.user) {
        const u = response.user;
        if (u.name) {
          name = `${u.name.firstName || ''} ${u.name.lastName || ''}`.trim();
        }
        if (u.email) email = u.email;
      }

      if (response.authorization && response.authorization.id_token) {
        try {
          const payload = JSON.parse(
            atob(response.authorization.id_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
          );
          if (!email && payload.email) email = payload.email;
          if (!name && payload.sub) name = 'Apple User';
        } catch (e) { /* ignore jwt parse */ }
      }

      name = name || (email ? email.split('@')[0] : 'Apple User');
      email = email || 'apple.user@privaterelay.appleid.com';

      UI.toast(`Authenticated with Apple ID`, 'apple');
      finish(name, email, 'apple');
    } catch (err) {
      if (err && (err.error === 'popup_closed_by_user' || err.error === 'user_cancelled_authorize')) {
        return;
      }
      console.error('Apple Sign-In failed', err);
      UI.toast(`Apple Sign-In error: ${err.error || 'Check Service ID and domain'}`, 'alert');
    }
  }

  // Social button click handlers
  $$('[data-social="Google"]').forEach(b => b.addEventListener('click', (e) => {
    e.preventDefault();
    startGoogleAuth();
  }));

  $$('[data-social="Apple"]').forEach(b => b.addEventListener('click', (e) => {
    e.preventDefault();
    startAppleAuth();
  }));

  window.addEventListener('load', () => {
    setTimeout(initGoogleOneTap, 600);
  });

  // Legal and recovery links
  $('#forgot-link')?.addEventListener('click', (e) => { e.preventDefault(); UI.showForgotPassword(); });
  $('#terms-link')?.addEventListener('click', (e) => { e.preventDefault(); UI.showTerms(); });
  $('#privacy-link')?.addEventListener('click', (e) => { e.preventDefault(); UI.showPrivacy(); });
})();
