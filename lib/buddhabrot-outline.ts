import { TRAIL_BOUNDS, complexToScreen, type AtlasBounds, type ViewTransform } from "./view-map.ts";

export type AffineTransform = {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
};

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
