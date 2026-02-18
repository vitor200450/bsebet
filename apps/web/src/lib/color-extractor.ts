/**
 * Extract dominant colors from an image URL
 * Returns the 2 most dominant colors for gradient usage
 */
export async function extractColorsFromImage(
  imageUrl: string,
): Promise<{ primary: string; secondary: string }> {
  return new Promise((resolve) => {
    console.log("[ColorExtractor] Starting extraction for:", imageUrl);

    const img = new Image();
    img.crossOrigin = "Anonymous";

    img.onload = () => {
      console.log("[ColorExtractor] Image loaded successfully");
      try {
        // Create canvas to read image pixels
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          console.error("[ColorExtractor] Failed to get canvas context");
          resolve({ primary: "#2e5cff", secondary: "#ff2e2e" });
          return;
        }

        // Resize to small size for performance
        const size = 50;
        canvas.width = size;
        canvas.height = size;

        ctx.drawImage(img, 0, 0, size, size);

        let imageData;
        try {
          imageData = ctx.getImageData(0, 0, size, size);
        } catch (e) {
          console.error("[ColorExtractor] CORS error reading image data:", e);
          resolve({ primary: "#2e5cff", secondary: "#ff2e2e" });
          return;
        }

        const pixels = imageData.data;
        console.log("[ColorExtractor] Processing", pixels.length / 4, "pixels");

        // Count color frequency (simplified color bucketing)
        const colorMap = new Map<string, number>();

        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          const a = pixels[i + 3];

          // Skip transparent or very light pixels (likely background)
          if (a < 128 || (r > 240 && g > 240 && b > 240)) continue;

          // Bucket colors to reduce variations (every 32 levels)
          const br = Math.floor(r / 32) * 32;
          const bg = Math.floor(g / 32) * 32;
          const bb = Math.floor(b / 32) * 32;

          const colorKey = `${br},${bg},${bb}`;
          colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
        }

        // Sort by frequency and get top 2
        const sortedColors = Array.from(colorMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2);

        console.log("[ColorExtractor] Found", colorMap.size, "unique colors");
        console.log("[ColorExtractor] Top 2 colors:", sortedColors);

        if (sortedColors.length === 0) {
          console.warn("[ColorExtractor] No valid colors found, using defaults");
          resolve({ primary: "#2e5cff", secondary: "#ff2e2e" });
          return;
        }

        const primary = sortedColors[0]
          ? rgbToHex(...(sortedColors[0][0].split(",").map(Number) as [number, number, number]))
          : "#2e5cff";
        const secondary = sortedColors[1]
          ? rgbToHex(...(sortedColors[1][0].split(",").map(Number) as [number, number, number]))
          : "#ff2e2e";

        console.log("[ColorExtractor] Final colors - Primary:", primary, "Secondary:", secondary);
        resolve({ primary, secondary });
      } catch (error) {
        console.error("[ColorExtractor] Error extracting colors:", error);
        resolve({ primary: "#2e5cff", secondary: "#ff2e2e" });
      }
    };

    img.onerror = (error) => {
      console.error("[ColorExtractor] Image loading error:", error);
      resolve({ primary: "#2e5cff", secondary: "#ff2e2e" });
    };

    // Use the URL directly - R2 should have CORS enabled
    img.src = imageUrl;
  });
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((x) => {
        const hex = x.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      })
      .join("")
  );
}

/**
 * Calculate intermediate color for smooth gradient
 */
export function getIntermediateColor(
  color1: string,
  color2: string,
): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);

  if (!c1 || !c2) return "#7f7f7f";

  const r = Math.floor((c1.r + c2.r) / 2);
  const g = Math.floor((c1.g + c2.g) / 2);
  const b = Math.floor((c1.b + c2.b) / 2);

  return rgbToHex(r, g, b);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}
