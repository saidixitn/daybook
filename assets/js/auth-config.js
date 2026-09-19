// Daybook OAuth Configuration & Credentials Helper (Google OAuth)
(() => {
  const STORAGE_GOOGLE_KEY = 'daybook:google_client_id';

  // Live verified Google OAuth Web Client ID for daybook-test.vercel.app
  const DEFAULT_GOOGLE_CLIENT_ID = '554553161624-4ql4jjrr27l0o2m12a2cllhv95j82hlq.apps.googleusercontent.com';

  const DaybookAuth = {
    get googleClientId() {
      return (
        window.DAYBOOK_GOOGLE_CLIENT_ID ||
        localStorage.getItem(STORAGE_GOOGLE_KEY) ||
        DEFAULT_GOOGLE_CLIENT_ID
      );
    },

    setGoogleClientId(id) {
      if (id && id.trim()) {
        localStorage.setItem(STORAGE_GOOGLE_KEY, id.trim());
      } else {
        localStorage.removeItem(STORAGE_GOOGLE_KEY);
      }
    },

    /**
     * Shows a setup guide and client ID prompt if OAuth credentials
     * need to be reconfigured.
     */
    showSetupModal(onSuccess) {
      const origin = window.location.origin;
      const currentId = this.googleClientId;

      UI.openSheet({
        title: 'Google Sign-In Configuration',
        body: `
          <div style="display:flex;flex-direction:column;gap:12px;">
            <div style="font-size:13px;color:var(--ink-2);line-height:1.6;margin-bottom:14px;">
              To authenticate with Google, Daybook uses an <b>OAuth 2.0 Web Client ID</b>:
              <ol style="padding-left:18px;margin:8px 0;">
                <li>Visit <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener" style="color:var(--accent);text-decoration:underline;">Google Cloud Console &rarr; Credentials</a>.</li>
                <li>Ensure this domain is in <b>Authorized JavaScript origins</b>:
                  <code style="display:block;background:var(--surface-2);padding:6px 8px;border-radius:6px;margin:4px 0;word-break:break-all;font-family:monospace;font-size:12px;">${origin}</code>
                </li>
              </ol>
            </div>
            <div class="field" style="margin-bottom:6px;">
              <label for="oauth-client-id">Google Client ID</label>
              <input class="input" id="oauth-client-id" value="${UI.esc(currentId)}" placeholder="e.g. 1234567890-abcdefg.apps.googleusercontent.com" style="font-family:monospace;font-size:12px;" />
            </div>
            <div class="small muted" style="font-size:11px;">
              Tip: You can also set this globally by defining <code>window.DAYBOOK_GOOGLE_CLIENT_ID</code>.
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
            DaybookAuth.setGoogleClientId(val);
            UI.closeSheet();
            UI.toast('Google credentials saved');
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
