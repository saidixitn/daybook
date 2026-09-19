// Sync script: copies web source files into www/ (Capacitor) and public/ (Vercel),
// creating app.html and directory backups for universal clean URL support.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const targets = [
  path.resolve(root, 'www'),
  path.resolve(root, 'public')
];

const itemsToCopy = [
  'index.html',
  'login.html',
  'signup.html',
  'onboarding.html',
  'manifest.json',
  'sw.js',
  'app',
  'assets'
];

function copyRecursive(src, dst) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dst)) fs.mkdirSync(dst, { recursive: true });
    for (const file of fs.readdirSync(src)) {
      copyRecursive(path.join(src, file), path.join(dst, file));
    }
  } else {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
  }
}

for (const dest of targets) {
  const name = path.basename(dest);
  console.log(`Syncing web files to ${name}/...`);
  for (const item of itemsToCopy) {
    copyRecursive(path.join(root, item), path.join(dest, item));
  }

  // Create root app.html (mirrors app/index.html) so /app matches app.html directly on Vercel
  const appIndex = path.join(root, 'app', 'index.html');
  const appRootHtml = path.join(dest, 'app.html');
  if (fs.existsSync(appIndex)) {
    fs.copyFileSync(appIndex, appRootHtml);
  }

  console.log(`✓ Successfully synced to ${name}/ with clean URL app.html`);
}
