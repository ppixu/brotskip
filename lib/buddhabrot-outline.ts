import { TRAIL_BOUNDS, complexToScreen, type AtlasBounds, type ViewTransform } from "./view-map.ts";

export type AffineTransform = {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
};

export function extractBuddhabrotOutline(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  threshold = 40,
  radius = 1,
) {
  const out = new Uint8ClampedArray(width * height * 4);
  const alphaAt = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return 0;
    return data[(y * width + x) * 4 + 3];
  };
  const paint = (x: number, y: number, alpha: number) => {
    const index = (y * width + x) * 4;
    out[index] = 210;
    out[index + 1] = 244;
    out[index + 2] = 255;
    out[index + 3] = Math.max(out[index + 3], Math.min(255, Math.max(180, alpha)));
  };
  const stamp = Math.max(1, Math.round(radius));
  const stampSq = stamp * stamp;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = alphaAt(x, y);
      if (alpha < threshold) continue;
      const edge = alphaAt(x - 1, y) < threshold
        || alphaAt(x + 1, y) < threshold
        || alphaAt(x, y - 1) < threshold
        || alphaAt(x, y + 1) < threshold;
      if (!edge) continue;
      if (stamp <= 1) {
        paint(x, y, alpha);
        continue;
      }
      for (let dy = -stamp; dy <= stamp; dy++) {
        for (let dx = -stamp; dx <= stamp; dx++) {
          if (dx * dx + dy * dy > stampSq) continue;
          const px = x + dx;
          const py = y + dy;
          if (px < 0 || py < 0 || px >= width || py >= height) continue;
          paint(px, py, alpha);
        }
      }
    }
  }
  return out;
}

export function buddhabrotImageTransform(
  imageWidth: number,
  imageHeight: number,
  screenWidth: number,
  screenHeight: number,
  view: ViewTransform,
  rotateRight: boolean,
  bounds: AtlasBounds = TRAIL_BOUNDS,
): AffineTransform {
  const topLeft = complexToScreen(bounds.xMin, bounds.yMax, screenWidth, screenHeight, view, rotateRight);
  const topRight = complexToScreen(bounds.xMax, bounds.yMax, screenWidth, screenHeight, view, rotateRight);
  const bottomLeft = complexToScreen(bounds.xMin, bounds.yMin, screenWidth, screenHeight, view, rotateRight);
  return {
    a: (topRight.x - topLeft.x) / Math.max(imageWidth, 1),
    b: (topRight.y - topLeft.y) / Math.max(imageWidth, 1),
    c: (bottomLeft.x - topLeft.x) / Math.max(imageHeight, 1),
    d: (bottomLeft.y - topLeft.y) / Math.max(imageHeight, 1),
    e: topLeft.x,
    f: topLeft.y,
  };
}
