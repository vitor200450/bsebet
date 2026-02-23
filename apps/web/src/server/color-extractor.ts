import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Reusable function to extract colors from an image URL (Server-side)
 */
export async function extractColorsFromImage(imageUrl: string) {
	try {
		// Dynamically import sharp (server-side only)
		const sharp = (await import("sharp")).default;

		// Fetch the image
		const response = await fetch(imageUrl);
		if (!response.ok) {
			throw new Error(`Failed to fetch image: ${response.statusText}`);
		}

		const arrayBuffer = await response.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		// Process with sharp to get pixel data
		const image = sharp(buffer);

		// Get pixel data to analyze colors
		const { data, info } = await image
			.resize(50, 50, { fit: "inside" })
			.raw()
			.toBuffer({ resolveWithObject: true });

		// Helper to process pixels with specific thresholds
		const processPixels = (
			pixels: Buffer,
			channels: number,
			width: number,
			options: {
				minSaturation: number;
				minBrightness: number;
				maxBrightness: number;
				ignoreWhite: boolean;
				ignoreBlack: boolean;
			},
		) => {
			const map = new Map<string, { count: number; sumX: number }>();

			for (let i = 0; i < pixels.length; i += channels) {
				const r = pixels[i];
				const g = pixels[i + 1];
				const b = pixels[i + 2];

				// Skip fully transparent pixels if alpha channel exists
				if (channels === 4 && pixels[i + 3] < 128) continue;

				// Calculate saturation and brightness
				const max = Math.max(r, g, b);
				const min = Math.min(r, g, b);
				const saturation = max === 0 ? 0 : (max - min) / max;
				const brightness = max / 255;

				// Apply filters
				if (
					options.ignoreWhite &&
					brightness > options.maxBrightness &&
					saturation < 0.1
				)
					continue;
				if (options.ignoreBlack && brightness < options.minBrightness) continue;
				if (saturation < options.minSaturation) continue;

				// Bucket colors to reduce variations
				const step = 24;
				const br = Math.floor(r / step) * step;
				const bg = Math.floor(g / step) * step;
				const bb = Math.floor(b / step) * step;

				const colorKey = `${br},${bg},${bb}`;

				// Weight by saturation (more saturated = more important) unless we're looking for monochrome
				const weight =
					options.minSaturation > 0 ? Math.floor(saturation * 10) + 1 : 1;

				// Calculate X coordinate
				const pixelIndex = i / channels;
				const x = pixelIndex % width;

				const current = map.get(colorKey) || { count: 0, sumX: 0 };
				map.set(colorKey, {
					count: current.count + weight,
					sumX: current.sumX + x * weight, // Weighted sum X
				});
			}
			return map;
		};

		// Pass 1: Strict filters for vibrant colors
		const colorMap = processPixels(data, info.channels, info.width, {
			minSaturation: 0.15,
			minBrightness: 0.15,
			maxBrightness: 0.9,
			ignoreWhite: true,
			ignoreBlack: true,
		});

		// Pass 2: Always run Achromatic/Monochrome pass to catch Black/White features
		// We want to capture distinct Black or White features (e.g. text outlines, backgrounds)
		// capable of contributing to the gradient.
		const achromaticMap = processPixels(data, info.channels, info.width, {
			minSaturation: 0.0, // Allow grayscale
			minBrightness: 0.05, // Allow darker (captures black)
			maxBrightness: 0.95, // Allow lighter (captures white)
			ignoreWhite: false, // Explicitly capture white
			ignoreBlack: false, // Explicitly capture black
		});

		// Merge maps:
		// If a color bucket exists in both, we sum them? Or just prefer one?
		// Since Pass 1 has saturation preference, we keep its count.
		// But for new colors from Pass 2 (Black/White), we add them.
		// We filter Pass 2 to ONLY include low saturation colors to avoid duplicating "vibrant but slightly different" colors
		// that might have slipped through.

		achromaticMap.forEach((val, key) => {
			// Check if this key corresponds to a low saturation color
			// The key is "r,g,b". We can parse it.
			const [r, g, b] = key.split(",").map(Number);
			const max = Math.max(r, g, b);
			const min = Math.min(r, g, b);
			const saturation = max === 0 ? 0 : (max - min) / max;
			const brightness = max / 255;

			// New Heuristic (User Feedback): "White border can get in the way"
			// If we ALREADY have vibrant colors (colorMap.size > 0), ignore White/Light Gray from this pass.
			// We still want Black/Dark Gray because they add depth.
			if (colorMap.size > 0 && brightness > 0.8 && saturation < 0.1) {
				return;
			}

			// Only add to map if it's truly achromatic OR not present in vibrant map
			if (saturation <= 0.15 || !colorMap.has(key)) {
				if (colorMap.has(key)) {
					// If it exists (meaning it was borderline vibrant), add counts?
					// Let's just update the count to be inclusive of both passes
					const existing = colorMap.get(key)!;
					colorMap.set(key, {
						count: existing.count + val.count,
						sumX: existing.sumX + val.sumX,
					});
				} else {
					colorMap.set(key, val);
				}
			}
		});

		// Sort by frequency
		const sortedColors = Array.from(colorMap.entries())
			.sort((a, b) => b[1].count - a[1].count)
			.slice(0, 15); // Increase candidate pool to find distinct colors

		if (sortedColors.length === 0) {
			return {
				primary: "#2e5cff",
				secondary: "#ff2e2e",
				tertiary: "#7f46d6",
				style: "linear",
			};
		}

		// Helper function to ensure colors are visible (not too dark/light depending on context)
		const adjustColor = (
			r: number,
			g: number,
			b: number,
		): [number, number, number] => {
			const max = Math.max(r, g, b);
			const min = Math.min(r, g, b);
			const saturation = max === 0 ? 0 : (max - min) / max;
			const brightness = max / 255;

			if (saturation > 0.2 && brightness < 0.2) {
				// It's a color but too dark, brighten it
				const factor = 0.2 / brightness;
				return [
					Math.min(255, Math.round(r * factor)),
					Math.min(255, Math.round(g * factor)),
					Math.min(255, Math.round(b * factor)),
				];
			}
			return [r, g, b];
		};

		// Helper to calculate color difference
		const getColorDistance = (
			c1: [number, number, number],
			c2: [number, number, number],
		) => {
			return Math.sqrt(
				(c1[0] - c2[0]) ** 2 + (c1[1] - c2[1]) ** 2 + (c1[2] - c2[2]) ** 2,
			);
		};

		// Helper to convert RGB to Hex
		const rgbToHex = (r: number, g: number, b: number) =>
			"#" +
			[r, g, b]
				.map((x) => {
					const hex = x.toString(16);
					return hex.length === 1 ? "0" + hex : hex;
				})
				.join("");

		// process primary
		const primaryEntry = sortedColors[0];
		let [r1, g1, b1] = primaryEntry[0].split(",").map(Number);
		[r1, g1, b1] = adjustColor(r1, g1, b1);
		const primary = rgbToHex(r1, g1, b1);

		// Find distinct secondary and tertiary colors
		const DISTINCT_THRESHOLD = 80; // increased from 45 to force more contrast
		const distinctColors: Array<{ hex: string; entry: typeof primaryEntry }> = [
			{ hex: primary, entry: primaryEntry },
		];

		for (let i = 1; i < sortedColors.length; i++) {
			if (distinctColors.length >= 3) break;

			const entry = sortedColors[i];

			// FILTER: Ignore colors with very low frequency (noise/aliasing)
			if (entry[1].count < primaryEntry[1].count * 0.05) {
				continue;
			}

			let [r2, g2, b2] = entry[0].split(",").map(Number);
			[r2, g2, b2] = adjustColor(r2, g2, b2);
			const hex = rgbToHex(r2, g2, b2);

			// Check distance against all currently selected distinct colors
			const isDistinct = distinctColors.every((c) => {
				const [rc, gc, bc] = c.entry[0].split(",").map(Number);
				// We compare against the Adjusted color logic or original?
				// Let's compare the Adjusted colors as that's what we output
				const [rac, gac, bac] = adjustColor(rc, gc, bc);
				const dist = getColorDistance([rac, gac, bac], [r2, g2, b2]);
				return dist > DISTINCT_THRESHOLD;
			});

			if (isDistinct) {
				// STRICT FILTER (User Feedback): If primary is vibrant, ignore White/Light Gray as secondary/tertiary
				// We want Green -> Dark Green, not Green -> White
				const primaryIsVibrant =
					Math.max(r1, g1, b1) - Math.min(r1, g1, b1) > 50; // Simple saturation check
				const candidateBrightness = (r2 + g2 + b2) / 3;
				const candidateSaturation =
					(Math.max(r2, g2, b2) - Math.min(r2, g2, b2)) / Math.max(r2, g2, b2);

				if (
					primaryIsVibrant &&
					candidateBrightness > 200 &&
					candidateSaturation < 0.15
				) {
					continue; // Skip White/Light Gray
				}

				distinctColors.push({ hex, entry });
			}
		}

		// Fill missing colors if we didn't find enough distinct ones
		if (distinctColors.length === 1) {
			// Logic for Monochromatic / Single color found
			const [r, g, b] = [r1, g1, b1];
			const brightness = (r + g + b) / 3;
			let secondary: string;

			if (brightness < 128) {
				// Dark color -> generate lighter variant
				secondary = rgbToHex(
					Math.min(255, r + 60),
					Math.min(255, g + 60),
					Math.min(255, b + 60),
				);
			} else {
				// Light color -> generate darker variant
				secondary = rgbToHex(
					Math.max(0, r - 60),
					Math.max(0, g - 60),
					Math.max(0, b - 60),
				);
			}
			distinctColors.push({
				hex: secondary,
				entry: [primaryEntry[0], { count: 1, sumX: 0 }], // Dummy entry
			});
		}

		if (distinctColors.length === 2) {
			// Create a tertiary that is intermediate or a variant
			// For now, let's just use the secondary as tertiary to keep 2-color gradient
			// Or generate a mix?
			// Let's duplicate secondary so logic keeps working
			distinctColors.push(distinctColors[1]);
		}

		// Sort spatially: Left -> Right
		// We utilize the sumX / count to determine average X position
		// BUT only do this if we are doing Linear Gradient.
		// Let's decide style first.

		// Detect Gradient Style: Check for solid background/border
		// Strategy: Check pixels at the edges (Top, Bottom, Left, Right)
		// If > 40% of edge pixels match a single color, it's likely a badge/solid background.
		const edgeMap = new Map<string, number>();
		const checkPixel = (index: number) => {
			if (index >= data.length) return;

			// Handle transparency if we have 4 channels
			if (info.channels === 4) {
				const alpha = data[index + 3];
				if (alpha < 128) return; // Skip transparent pixels
			}

			const r = data[index];
			const g = data[index + 1];
			const b = data[index + 2];
			const step = 24;
			const br = Math.floor(r / step) * step;
			const bg = Math.floor(g / step) * step;
			const bb = Math.floor(b / step) * step;
			const key = `${br},${bg},${bb}`;
			edgeMap.set(key, (edgeMap.get(key) || 0) + 1);
		};

		const width = info.width;
		const height = info.height;

		// Top & Bottom rows
		for (let x = 0; x < width; x++) {
			checkPixel(x * info.channels); // Top
			checkPixel(((height - 1) * width + x) * info.channels); // Bottom
		}
		// Left & Right columns
		for (let y = 1; y < height - 1; y++) {
			checkPixel(y * width * info.channels); // Left
			checkPixel((y * width + width - 1) * info.channels); // Right
		}

		const totalEdgePixels = width * 2 + (height - 2) * 2;
		let maxEdgeCount = 0;
		let dominantEdgeColorKey = "";

		edgeMap.forEach((count, key) => {
			if (count > maxEdgeCount) {
				maxEdgeCount = count;
				dominantEdgeColorKey = key;
			}
		});

		const edgeCoverage = maxEdgeCount / totalEdgePixels;
		let style: "linear" | "radial" = "linear";

		// If edge is uniform (>40%), treat as radial background candidate
		if (edgeCoverage > 0.4) {
			const [br, bg, bb] = dominantEdgeColorKey.split(",").map(Number);

			const [er, eg, eb] = adjustColor(br, bg, bb);
			const edgeHex = rgbToHex(er, eg, eb);

			// Check distance against Primary. If distinct -> Radial.
			const pR = Number.parseInt(primary.slice(1, 3), 16);
			const pG = Number.parseInt(primary.slice(3, 5), 16);
			const pB = Number.parseInt(primary.slice(5, 7), 16);

			const dist = getColorDistance([pR, pG, pB], [er, eg, eb]);

			if (dist > 30) {
				style = "radial";

				// Return early for radial to enforce the edge color as background
				return {
					primary: primary,
					secondary: edgeHex,
					tertiary: edgeHex,
					style,
				};
			}
		}

		const spatialColors = distinctColors.map((c) => ({
			hex: c.hex,
			avgX: c.entry[1].count > 0 ? c.entry[1].sumX / c.entry[1].count : 0,
		}));

		// Check if we have valid spatial data (count > 1 to avoid dummy)
		const hasRealSpatialData = distinctColors.every(
			(c) => c.entry[1].count > 1,
		);

		if (hasRealSpatialData && style === "linear") {
			spatialColors.sort((a, b) => a.avgX - b.avgX);
		}

		const resultPrimary = spatialColors[0].hex;
		const resultSecondary = spatialColors[spatialColors.length - 1].hex;
		const resultTertiary =
			spatialColors.length > 2 ? spatialColors[1].hex : resultSecondary;

		return {
			primary: resultPrimary,
			secondary: resultSecondary,
			tertiary: resultTertiary,
			style,
		};
	} catch (error) {
		console.error("Error extracting colors:", error);
		return {
			primary: "#2e5cff",
			secondary: "#ff2e2e",
			tertiary: "#7f46d6",
			style: "linear",
		};
	}
}

/**
 * Server-side color extraction from image URL
 * This bypasses CORS issues by processing the image on the server
 */
export const extractColorsServerFn = createServerFn({
	method: "GET",
}).handler(async (ctx: any) => {
	const imageUrl = z.string().url().parse(ctx.data);
	return extractColorsFromImage(imageUrl);
});

// Helper to parse hex
export const extractColorsServer = extractColorsServerFn as unknown as (opts: {
	data: string;
}) => Promise<{
	primary: string;
	secondary: string;
	tertiary: string;
	style: "linear" | "radial";
}>;
