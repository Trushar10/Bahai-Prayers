const fs = require('fs');
const path = require('path');

function createBasicPngFromSvg() {
	const publicDir = path.join(__dirname, '../public');
	const svgPath = path.join(publicDir, 'favicon.svg');

	if (!fs.existsSync(svgPath)) {
		console.error('favicon.svg not found');
		return;
	}

	// Read the SVG content to extract colors/info
	const svgContent = fs.readFileSync(svgPath, 'utf8');

	// For now, create placeholder PNG files that browsers will accept
	// You can replace these with actual converted images later
	const sizes = [192, 512];

	sizes.forEach((size) => {
		const pngPath = path.join(publicDir, `favicon-${size}x${size}.png`);

		// Create a simple 1x1 PNG as placeholder (browsers will scale favicon.svg automatically)
		const pngBuffer = Buffer.from([
			0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00,
			0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00,
			0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde,
			0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63,
			0xf8, 0x0f, 0x00, 0x00, 0x01, 0x00, 0x01, 0x5c, 0xcd, 0xff, 0x8d,
			0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60,
			0x82,
		]);

		fs.writeFileSync(pngPath, pngBuffer);
		console.log(`Created placeholder favicon-${size}x${size}.png`);
	});

	console.log(
		'\nNote: Created placeholder PNG files. For better quality, manually convert favicon.svg to PNG using:'
	);
	console.log('- Online tools like https://cloudconvert.com/svg-to-png');
	console.log(
		'- Or install ImageMagick and run: convert favicon.svg -resize 192x192 favicon-192x192.png'
	);
}

createBasicPngFromSvg();
