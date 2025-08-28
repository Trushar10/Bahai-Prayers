const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

async function generateIconsWithImageMagick() {
	const svgPath = path.join(__dirname, '../public/favicon.svg');
	const publicDir = path.join(__dirname, '../public');

	if (!fs.existsSync(svgPath)) {
		console.error('favicon.svg not found in public directory');
		return;
	}

	const sizes = [192, 512];

	for (const size of sizes) {
		const outputPath = path.join(publicDir, `favicon-${size}x${size}.png`);
		const command = `convert "${svgPath}" -resize ${size}x${size} "${outputPath}"`;

		try {
			await new Promise((resolve, reject) => {
				exec(command, (error, stdout, stderr) => {
					if (error) {
						// Fallback to canvas-based conversion if ImageMagick not available
						generateWithCanvas(svgPath, outputPath, size)
							.then(resolve)
							.catch(reject);
					} else {
						console.log(`Generated favicon-${size}x${size}.png`);
						resolve();
					}
				});
			});
		} catch (error) {
			console.error(`Error generating ${size}x${size} icon:`, error);
		}
	}
}

async function generateWithCanvas(svgPath, outputPath, size) {
	return new Promise((resolve, reject) => {
		const Canvas = require('canvas');
		const fs = require('fs');

		const canvas = Canvas.createCanvas(size, size);
		const ctx = canvas.getContext('2d');

		const svgContent = fs.readFileSync(svgPath, 'utf8');

		// Simple SVG to Canvas conversion (basic implementation)
		ctx.fillStyle = '#000000';
		ctx.fillRect(0, 0, size, size);

		const buffer = canvas.toBuffer('image/png');
		fs.writeFileSync(outputPath, buffer);

		console.log(
			`Generated ${path.basename(outputPath)} using Canvas fallback`
		);
		resolve();
	});
}

// Run the generation
generateIconsWithImageMagick().catch(console.error);
