// Simple 1x1 base64 transparent PNG buffer generator for default icons
const fs = require('fs');
const path = require('path');

const iconBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const iconBuffer = Buffer.from(iconBase64, 'base64');

const iconsDir = path.join(__dirname, 'apps', 'extension', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

fs.writeFileSync(path.join(iconsDir, 'icon16.png'), iconBuffer);
fs.writeFileSync(path.join(iconsDir, 'icon48.png'), iconBuffer);
fs.writeFileSync(path.join(iconsDir, 'icon128.png'), iconBuffer);

console.log('Extension placeholder icons created successfully.');
