// Generate PWA icons - now handled by generate-favicon.js
// This script is kept for compatibility but no longer generates icons
// as they are now created by the updated generate-favicon.js script

const fs = require('fs');
const path = require('path');

const publicDir = path.join(process.cwd(), 'public');

// Check if our round favicon files exist
const favicon192 = path.join(publicDir, 'favicon-192.png');
const favicon512 = path.join(publicDir, 'favicon-512.png');

if (
	fs.existsSync(favicon192) &&
	fs.existsSync(favicon512) &&
	fs.statSync(favicon192).size > 0 &&
	fs.statSync(favicon512).size > 0
) {
	console.log('PWA icons already exist from favicon generation');
} else {
	console.log('PWA icons not found, please run: npm run generate-favicon');
}

console.log('Icon generation complete');
