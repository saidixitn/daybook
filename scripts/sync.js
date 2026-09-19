// Sync script: copies web source files into www/ for Capacitor and mobile packaging
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dest = path.resolve(root, 'www');

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

console.log('Syncing web files to www/...');
for (const item of itemsToCopy) {
  copyRecursive(path.join(root, item), path.join(dest, item));
}
console.log('✓ Successfully synced to www/');
