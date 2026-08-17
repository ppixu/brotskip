export type ViewTransform = {
  centerX: number;
  centerY: number;
  halfY: number;
};

export type AtlasBounds = {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
};

export const TRAIL_BOUNDS: AtlasBounds = { xMin: -2.2, xMax: 1.2, yMin: -1.5, yMax: 1.5 };
export const TRAIL_ATLAS_SIZE = 2048;
export const REFERENCE_VIEW_HALF_Y = 0.8;
export const FOCUS_ATLAS_MARGIN = 2;
export const ATLAS_RECENTER_TEXEL_PX = 2;

export function viewHalfX(view: ViewTransform, width: number, height: number) {
  return view.halfY * width / Math.max(height, 1);
}

function orientOffset(dx: number, dy: number, rotateRight: boolean) {
  return rotateRight ? { x: dy, y: -dx } : { x: dx, y: dy };
}

function unorientOffset(x: number, y: number, rotateRight: boolean) {
  return rotateRight ? { dx: -y, dy: x } : { dx: x, dy: y };
}

export function screenToComplex(
  x: number,
  y: number,
  width: number,
  height: number,
  view: ViewTransform,
  rotateRight = false,
) {
  const ox = (x / width * 2 - 1) * viewHalfX(view, width, height);
  const oy = (1 - y / height * 2) * view.halfY;
  const offset = unorientOffset(ox, oy, rotateRight);
  return {
    x: view.centerX + offset.dx,
    y: view.centerY + offset.dy,
  };
}

export function complexToScreen(
  re: number,
  im: number,
  width: number,
  height: number,
  view: ViewTransform,
  rotateRight = false,
) {
  const halfX = viewHalfX(view, width, height);
  const oriented = orientOffset(re - view.centerX, im - view.centerY, rotateRight);
  return {
    x: (oriented.x / halfX + 1) * width * 0.5,
    y: (1 - oriented.y / view.halfY) * height * 0.5,
  };
}

export function complexToClip(
  re: number,
  im: number,
  view: ViewTransform,
  width: number,
  height: number,
  rotateRight = false,
) {
  const oriented = orientOffset(re - view.centerX, im - view.centerY, rotateRight);
  return {
    x: oriented.x / viewHalfX(view, width, height),
    y: oriented.y / view.halfY,
  };
}

export function viewCenterKeepingFocus(
  screenX: number,
  screenY: number,
  focus: { x: number; y: number },
  width: number,
  height: number,
  halfY: number,
  rotateRight: boolean,
) {
  const probed = screenToComplex(screenX, screenY, width, height, { centerX: 0, centerY: 0, halfY }, rotateRight);
  return {
    centerX: focus.x - probed.x,
    centerY: focus.y - probed.y,
    halfY,
  };
}

export function trailUvOffset(
  previous: ViewTransform,
  next: ViewTransform,
  width: number,
  height: number,
  rotateRight: boolean,
) {
  const oldHalfX = viewHalfX(previous, width, height);
  const dCenterX = next.centerX - previous.centerX;
  const dCenterY = next.centerY - previous.centerY;
  if (!rotateRight) {
    return {
      x: dCenterX / (2 * oldHalfX),
      y: -dCenterY / (2 * previous.halfY),
    };
  }
  return {
    x: dCenterY / (2 * oldHalfX),
    y: dCenterX / (2 * previous.halfY),
  };
}

export function complexToAtlasUv(
  re: number,
  im: number,
  bounds = TRAIL_BOUNDS,
) {
  return {
    u: (re - bounds.xMin) / (bounds.xMax - bounds.xMin),
    v: (bounds.yMax - im) / (bounds.yMax - bounds.yMin),
  };
}

export function zoomPixelScale(minDimension: number, halfY: number, referenceHalfY = REFERENCE_VIEW_HALF_Y) {
  return minDimension * referenceHalfY / Math.max(halfY, 1e-6);
}

export function reprojectScreenPoint(
  x: number,
  y: number,
  width: number,
  height: number,
  previous: ViewTransform,
  next: ViewTransform,
  rotateRight = false,
) {
  const pond = screenToComplex(x, y, width, height, previous, rotateRight);
  return complexToScreen(pond.x, pond.y, width, height, next, rotateRight);
}

export function reprojectScreenVelocity(
  x: number,
  y: number,
  vx: number,
  vy: number,
  width: number,
  height: number,
  previous: ViewTransform,
  next: ViewTransform,
  rotateRight = false,
) {
  const start = reprojectScreenPoint(x, y, width, height, previous, next, rotateRight);
  const end = reprojectScreenPoint(x + vx, y + vy, width, height, previous, next, rotateRight);
  return { x: end.x - start.x, y: end.y - start.y };
}

export function mathBoundsForView(
  view: ViewTransform,
  width: number,
  height: number,
  rotateRight: boolean,
): AtlasBounds {
  const halfX = viewHalfX(view, width, height);
  const extentX = rotateRight ? view.halfY : halfX;
  const extentY = rotateRight ? halfX : view.halfY;
  return {
    xMin: view.centerX - extentX,
    xMax: view.centerX + extentX,
    yMin: view.centerY - extentY,
    yMax: view.centerY + extentY,
  };
}

export function focusAtlasBounds(
  view: ViewTransform,
  width: number,
  height: number,
  rotateRight: boolean,
  margin = FOCUS_ATLAS_MARGIN,
): AtlasBounds {
  const visible = mathBoundsForView(view, width, height, rotateRight);
  const halfX = (visible.xMax - visible.xMin) / 2 * margin;
  const halfY = (visible.yMax - visible.yMin) / 2 * margin;
  return {
    xMin: view.centerX - halfX,
    xMax: view.centerX + halfX,
    yMin: view.centerY - halfY,
    yMax: view.centerY + halfY,
  };
}

export function atlasNeedsRecenter(
  atlas: AtlasBounds,
  view: ViewTransform,
  width: number,
  height: number,
  rotateRight: boolean,
  atlasSize = TRAIL_ATLAS_SIZE,
) {
  const visible = mathBoundsForView(view, width, height, rotateRight);
  if (
    visible.xMin < atlas.xMin
    || visible.xMax > atlas.xMax
    || visible.yMin < atlas.yMin
    || visible.yMax > atlas.yMax
  ) {
    return true;
  }
  const innerX = (atlas.xMax - atlas.xMin) * 0.25;
  const innerY = (atlas.yMax - atlas.yMin) * 0.25;
  if (
    view.centerX < atlas.xMin + innerX
    || view.centerX > atlas.xMax - innerX
    || view.centerY < atlas.yMin + innerY
    || view.centerY > atlas.yMax - innerY
  ) {
    return true;
  }
  const texelX = (atlas.xMax - atlas.xMin) / Math.max(atlasSize, 1);
  const texelY = (atlas.yMax - atlas.yMin) / Math.max(atlasSize, 1);
  const pixelX = (visible.xMax - visible.xMin) / Math.max(width, 1);
  const pixelY = (visible.yMax - visible.yMin) / Math.max(height, 1);
  return texelX > ATLAS_RECENTER_TEXEL_PX * pixelX || texelY > ATLAS_RECENTER_TEXEL_PX * pixelY;
}
