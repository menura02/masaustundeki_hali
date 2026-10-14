const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
if (process.platform !== 'darwin') { console.log('macOS desktop layer builds on macOS only.'); process.exit(0); }
const root = path.resolve(__dirname, '..');
fs.mkdirSync(path.join(root, 'native/build'), { recursive: true });
execFileSync('xcrun', ['clang++', '-bundle', '-undefined', 'dynamic_lookup', '-fobjc-arc',
  '-arch', 'arm64', '-arch', 'x86_64', '-mmacosx-version-min=12.0',
  '-framework', 'Cocoa', '-framework', 'CoreGraphics',
  path.join(root, 'native/mac.mm'), '-o', path.join(root, 'native/build/desktop.node')], { stdio: 'inherit' });
