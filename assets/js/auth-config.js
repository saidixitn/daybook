// Daybook OAuth Configuration & Credentials Helper
(() => {
  const STORAGE_GOOGLE_KEY = 'daybook:google_client_id';
  const STORAGE_APPLE_KEY = 'daybook:apple_client_id';

  const DEFAULT_GOOGLE_CLIENT_ID = '554553161624-4ql4jjrr27l0o2m12a2cllhv95j82hlq.apps.googleusercontent.com';

  const DaybookAuth = {
    get googleClientId() {
      return (
        window.DAYBOOK_GOOGLE_CLIENT_ID ||
        localStorage.getItem(STORAGE_GOOGLE_KEY) ||
        DEFAULT_GOOGLE_CLIENT_ID
      );
    },
    get appleClientId() {
      return (
        window.DAYBOOK_APPLE_CLIENT_ID ||
        localStorage.getItem(STORAGE_APPLE_KEY) ||
        ''
      );
    },
    get appleRedirectUri() {
      return window.location.origin + '/login';
    },

    setGoogleClientId(id) {
      if (id && id.trim()) {
        localStorage.setItem(STORAGE_GOOGLE_KEY, id.trim());
      } else {
        localStorage.removeItem(STORAGE_GOOGLE_KEY);
      }
    },

    setAppleClientId(id) {
      if (id && id.trim()) {
        localStorage.setItem(STORAGE_APPLE_KEY, id.trim());
      } else {
        localStorage.removeItem(STORAGE_APPLE_KEY);
      }
    },

    /**
     * Shows a setup guide and client ID prompt if OAuth credentials
     * haven't been provided yet.
     */
    showSetupModal(provider, onSuccess) {
      const isGoogle = provider === 'google';
      const title = isGoogle ? 'Configure Google Sign-In' : 'Configure Apple Sign-In';
      const origin = window.location.origin;
      const currentId = isGoogle ? this.googleClientId : this.appleClientId;

      const instructions = isGoogle
        ? `
          <div style="font-size:13px;color:var(--ink-2);line-height:1.6;margin-bottom:14px;">
            To open the real Google authentication popup, Daybook needs a <b>Google OAuth Web Client ID</b>:
            <ol style="padding-left:18px;margin:8px 0;">
              <li>Visit <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener" style="color:var(--accent);text-decoration:underline;">Google Cloud Console &rarr; Credentials</a>.</li>
              <li>Click <b>Create Credentials &rarr; OAuth Client ID</b> (Application type: <i>Web application</i>).</li>
              <li>Add this domain under <b>Authorized JavaScript origins</b>:
                <code style="display:block;background:var(--surface-2);padding:6px 8px;border-radius:6px;margin:4px 0;word-break:break-all;font-family:monospace;font-size:12px;">${origin}</code>
              </li>
              <li>Paste your Client ID below. It is saved in your browser immediately.</li>
            </ol>
          </div>
          <div class="field" style="margin-bottom:6px;">
            <label for="oauth-client-id">Google Client ID</label>
            <input class="input" id="oauth-client-id" value="${UI.esc(currentId)}" placeholder="e.g. 1234567890-abcdefg.apps.googleusercontent.com" style="font-family:monospace;font-size:12px;" />
          </div>`
        : `
          <div style="font-size:13px;color:var(--ink-2);line-height:1.6;margin-bottom:14px;">
            To open the real Sign in with Apple popup, Daybook needs an <b>Apple Service ID</b>:
            <ol style="padding-left:18px;margin:8px 0;">
              <li>Go to <a href="https://developer.apple.com/account/resources/identifiers/list/serviceId" target="_blank" rel="noopener" style="color:var(--accent);text-decoration:underline;">Apple Developer &rarr; Identifiers &rarr; Services IDs</a>.</li>
              <li>Create a Services ID with <b>Sign in with Apple</b> enabled.</li>
              <li>Configure primary App ID, Domain (<code>${window.location.hostname}</code>) and Return URL (<code>${origin}/login</code>).</li>
              <li>Paste your Service ID below:</li>
            </ol>
          </div>
          <div class="field" style="margin-bottom:6px;">
            <label for="oauth-client-id">Apple Service ID (Client ID)</label>
            <input class="input" id="oauth-client-id" value="${UI.esc(currentId)}" placeholder="e.g. com.yourname.daybook.web" style="font-family:monospace;font-size:12px;" />
          </div>`;

      UI.openSheet({
        title,
        body: `
          <div style="display:flex;flex-direction:column;gap:12px;">
            ${instructions}
            <div class="small muted" style="font-size:11px;">
              Tip: You can also set this globally by defining <code>window.DAYBOOK_${isGoogle ? 'GOOGLE' : 'APPLE'}_CLIENT_ID</code>.
            </div>
          </div>`,
        primary: {
          label: 'Save & Authenticate',
          onClick: (sheet) => {
            const input = $('#oauth-client-id', sheet);
            const val = input ? input.value.trim() : '';
            if (!val) {
              UI.toast('Please enter a valid Client ID', 'alert');
              return;
            }
            if (isGoogle) {
              DaybookAuth.setGoogleClientId(val);
            } else {
              DaybookAuth.setAppleClientId(val);
            }
            UI.closeSheet();
            UI.toast(`${isGoogle ? 'Google' : 'Apple'} credentials saved`);
            if (typeof onSuccess === 'function') {
              onSuccess();
            }
          }
        },
        secondary: { label: 'Cancel', onClick: UI.closeSheet }
      });
    }
  };

  window.DaybookAuth = DaybookAuth;
})();
