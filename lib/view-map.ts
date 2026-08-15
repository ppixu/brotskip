export type ViewTransform = {
  centerX: number;
  centerY: number;
  halfY: number;
};

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

export function mathBoundsForView(
  view: ViewTransform,
  width: number,
  height: number,
  rotateRight: boolean,
) {
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
