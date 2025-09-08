const sharp = require('sharp');
const toIco = require('to-ico');
const fs = require('fs');
const path = require('path');

async function createCircularMask(size) {
	// Create a circular mask with padding for PWA icons
	const padding = Math.floor(size * 0.1); // 10% padding
	const radius = Math.floor((size - padding * 2) / 2);
	const center = Math.floor(size / 2);
	const svg = `
		<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
			<circle cx="${center}" cy="${center}" r="${radius}" fill="white"/>
		</svg>
	`;
	return Buffer.from(svg);
}

async function createCircularMaskForFavicon(size) {
	// Create a circular mask without padding for regular favicons
	const radius = Math.floor(size / 2);
	const svg = `
		<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
			<circle cx="${radius}" cy="${radius}" r="${radius}" fill="white"/>
		</svg>
	`;
	return Buffer.from(svg);
}

async function generateFavicon() {
	const inputPath = path.join(__dirname, '../public/bahai-logo.svg');
	const outputPath = path.join(__dirname, '../public/favicon.ico');

	try {
		console.log('Converting SVG to round ICO...');

		// Read the SVG file
		const svgBuffer = fs.readFileSync(inputPath);

		// Create PNG buffers for different sizes that will be embedded in the ICO
		const sizes = [16, 32, 48];
		const pngBuffers = [];

		for (const size of sizes) {
			// Create circular mask for regular favicons (no padding)
			const maskBuffer = await createCircularMaskForFavicon(size);

			// Process the logo with circular mask
			const pngBuffer = await sharp(svgBuffer)
				.resize(size, size)
				.composite([
					{
						input: maskBuffer,
						blend: 'dest-in',
					},
				])
				.png()
				.toBuffer();
			pngBuffers.push(pngBuffer);

			// Also save individual PNG files for reference
			await sharp(svgBuffer)
				.resize(size, size)
				.composite([
					{
						input: maskBuffer,
						blend: 'dest-in',
					},
				])
				.png()
				.toFile(
					path.join(
						__dirname,
						`../public/favicon-${size}x${size}.png`
					)
				);
		}

		// Create the ICO file with multiple sizes embedded
		const icoBuffer = await toIco(pngBuffers);
		fs.writeFileSync(outputPath, icoBuffer);

		// Generate additional sizes for PWA and modern browsers (with padding)
		const additionalSizes = [192, 512];
		for (const size of additionalSizes) {
			const maskBuffer = await createCircularMask(size);

			await sharp(svgBuffer)
				.resize(size, size)
				.composite([
					{
						input: maskBuffer,
						blend: 'dest-in',
					},
				])
				.png()
				.toFile(path.join(__dirname, `../public/favicon-${size}.png`));
		}

		// Generate a general favicon.png (32x32) - no padding for regular favicon
		const generalMaskBuffer = await createCircularMaskForFavicon(32);
		await sharp(svgBuffer)
			.resize(32, 32)
			.composite([
				{
					input: generalMaskBuffer,
					blend: 'dest-in',
				},
			])
			.png()
			.toFile(path.join(__dirname, '../public/favicon.png'));

		console.log('✅ Round favicon generated successfully!');
		console.log('📁 Files created:');
		console.log('   - favicon.ico (with 16x16, 32x32, 48x48 sizes)');
		console.log('   - favicon-16x16.png (no padding)');
		console.log('   - favicon-32x32.png (no padding)');
		console.log('   - favicon-48x48.png (no padding)');
		console.log('   - favicon-192.png (with 10% padding for PWA)');
		console.log('   - favicon-512.png (with 10% padding for PWA)');
		console.log('   - favicon.png (no padding)');
	} catch (error) {
		console.error('❌ Error generating favicon:', error);
	}
}

generateFavicon();
