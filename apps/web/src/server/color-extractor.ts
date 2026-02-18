import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Server-side color extraction from image URL
 * This bypasses CORS issues by processing the image on the server
 */
const extractColorsServerFn = createServerFn({
  method: "GET",
}).handler(async (ctx: any) => {
  const imageUrl = z.string().url().parse(ctx.data);

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

    // Count color frequencies with better filtering
    const colorMap = new Map<string, number>();

    for (let i = 0; i < data.length; i += info.channels) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Calculate saturation and brightness
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max === 0 ? 0 : (max - min) / max;
      const brightness = max / 255;

      // Skip very light pixels (white/gray background)
      if (brightness > 0.9 && saturation < 0.2) continue;

      // Skip very dark pixels (black)
      if (brightness < 0.15) continue;

      // Skip grayscale pixels (low saturation)
      if (saturation < 0.15) continue;

      // Bucket colors to reduce variations
      const br = Math.floor(r / 32) * 32;
      const bg = Math.floor(g / 32) * 32;
      const bb = Math.floor(b / 32) * 32;

      const colorKey = `${br},${bg},${bb}`;

      // Weight by saturation (more saturated = more important)
      const weight = Math.floor(saturation * 10);
      colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + weight);
    }

    console.log(`[ColorExtractor] Found ${colorMap.size} distinct colors for ${imageUrl}`);

    // Sort by frequency and get top 2
    const sortedColors = Array.from(colorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3); // Get top 3 for better variety

    console.log("[ColorExtractor] Top colors:", sortedColors);

    if (sortedColors.length === 0) {
      console.warn("[ColorExtractor] No vibrant colors found, using defaults");
      return { primary: "#2e5cff", secondary: "#ff2e2e" };
    }

    // Helper function to ensure colors are bright enough for backgrounds
    const ensureBrightness = (r: number, g: number, b: number): [number, number, number] => {
      const brightness = (r + g + b) / 3;
      const minBrightness = 80; // Minimum brightness for readability

      if (brightness < minBrightness) {
        // Lighten the color while maintaining hue
        const factor = minBrightness / brightness;
        return [
          Math.min(255, Math.round(r * factor)),
          Math.min(255, Math.round(g * factor)),
          Math.min(255, Math.round(b * factor)),
        ];
      }

      return [r, g, b];
    };

    // Get primary color with brightness adjustment
    let [r1, g1, b1] = sortedColors[0][0].split(",").map(Number);
    [r1, g1, b1] = ensureBrightness(r1, g1, b1);
    const primary = rgbToHex(r1, g1, b1);

    // Get secondary color - ensure it's different from primary
    let secondary: string;

    if (sortedColors.length >= 2) {
      // Use second most common color with brightness adjustment
      let [r2, g2, b2] = sortedColors[1][0].split(",").map(Number);
      [r2, g2, b2] = ensureBrightness(r2, g2, b2);
      secondary = rgbToHex(r2, g2, b2);
    } else if (sortedColors.length >= 1) {
      // Only one color found - create a complementary color
      const avg = (r1 + g1 + b1) / 3;
      let newR = Math.min(255, Math.max(0, r1 + (r1 < avg ? 80 : -80)));
      let newG = Math.min(255, Math.max(0, g1 + (g1 < avg ? 80 : -80)));
      let newB = Math.min(255, Math.max(0, b1 + (b1 < avg ? 80 : -80)));

      [newR, newG, newB] = ensureBrightness(newR, newG, newB);
      secondary = rgbToHex(newR, newG, newB);
    } else {
      // Fallback
      secondary = "#ff2e2e";
    }

    console.log(`[ColorExtractor] Extracted - Primary: ${primary}, Secondary: ${secondary}`);

    return { primary, secondary };
  } catch (error) {
    console.error("Server-side color extraction error:", error);
    // Return default colors on error
    return { primary: "#2e5cff", secondary: "#ff2e2e" };
  }
});

export const extractColorsServer = extractColorsServerFn as unknown as (opts: {
  data: string;
}) => Promise<{ primary: string; secondary: string }>;

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((x) => {
        const hex = Math.round(x).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      })
      .join("")
  );
}
