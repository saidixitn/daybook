// Sync script: copies web source files into www/ (for Capacitor) and public/ (for Vercel),
// and creates directory index fallbacks for universal clean URL support.
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

const cleanRoutes = [
  { src: 'login.html', outDir: 'login' },
  { src: 'signup.html', outDir: 'signup' },
  { src: 'onboarding.html', outDir: 'onboarding' },
  { src: path.join('app', 'schedule.html'), outDir: path.join('app', 'schedule') },
  { src: path.join('app', 'tasks.html'), outDir: path.join('app', 'tasks') },
  { src: path.join('app', 'insights.html'), outDir: path.join('app', 'insights') },
  { src: path.join('app', 'settings.html'), outDir: path.join('app', 'settings') },
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

  // Generate directory index fallbacks for clean URLs
  for (const route of cleanRoutes) {
    const srcFile = path.join(root, route.src);
    const targetDir = path.join(dest, route.outDir);
    const targetIndex = path.join(targetDir, 'index.html');
    if (fs.existsSync(srcFile)) {
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
      fs.copyFileSync(srcFile, targetIndex);
    }
  }
  console.log(`✓ Successfully synced to ${name}/ (with clean URL routes)`);
}
