const sharp = require('sharp');
const toIco = require('to-ico');
const fs = require('fs');
const path = require('path');

async function generateFavicon() {
	const inputPath = path.join(__dirname, '../public/bahai-logo.svg');
	const outputPath = path.join(__dirname, '../public/favicon.ico');

	try {
		console.log('Converting SVG to ICO...');

		// Read the SVG file
		const svgBuffer = fs.readFileSync(inputPath);

		// Create PNG buffers for different sizes that will be embedded in the ICO
		const sizes = [16, 32, 48];
		const pngBuffers = [];

		for (const size of sizes) {
			const pngBuffer = await sharp(svgBuffer)
				.resize(size, size)
				.png()
				.toBuffer();
			pngBuffers.push(pngBuffer);

			// Also save individual PNG files for reference
			await sharp(svgBuffer)
				.resize(size, size)
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

		console.log('✅ Favicon generated successfully!');
		console.log('📁 Files created:');
		console.log('   - favicon.ico (with 16x16, 32x32, 48x48 sizes)');
		console.log('   - favicon-16x16.png');
		console.log('   - favicon-32x32.png');
		console.log('   - favicon-48x48.png');
	} catch (error) {
		console.error('❌ Error generating favicon:', error);
	}
}

generateFavicon();
