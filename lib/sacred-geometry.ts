/** Sacred-shape glyph geometry shared by orbit impacts and the glyph cycle. */

const TAU = Math.PI * 2;

export const GLYPH_COUNT = 7;
export const SACRED_SHAPE_COUNT = 8;
export const SACRED_PATH_COUNTS = [2, 2, 2, 4, 2, 3, 7, 3] as const;

export function samplePolygon(vertices: Array<{ x: number; y: number }>, t: number) {
  const position = ((t % 1) + 1) % 1 * vertices.length;
  const edge = Math.floor(position) % vertices.length;
  const local = position - Math.floor(position);
  const a = vertices[edge];
  const b = vertices[(edge + 1) % vertices.length];
  return { x: a.x + (b.x - a.x) * local, y: a.y + (b.y - a.y) * local };
}

export function regularVertices(sides: number, rotation = -Math.PI / 2) {
  return Array.from({ length: sides }, (_, index) => ({
    x: Math.cos(rotation + index * TAU / sides),
    y: Math.sin(rotation + index * TAU / sides),
  }));
}

export function sacredShapeOffset(shape: number, path: number, t: number) {
  const circle = (cx: number, cy: number, radius: number) => ({
    x: cx + Math.cos(t * TAU - Math.PI / 2) * radius,
    y: cy + Math.sin(t * TAU - Math.PI / 2) * radius,
  });
  switch (shape % SACRED_SHAPE_COUNT) {
    case 0: return circle(0, 0, path === 0 ? 1 : .46); // concentric halo
    case 1: return path === 0 ? samplePolygon(regularVertices(3), t) : circle(0, 0, .48); // triangle mandala
    case 2: return circle(path === 0 ? -.32 : .32, 0, .68); // vesica piscis
    case 3: { // four-petal rose
      const angle = path * Math.PI / 2;
      return circle(Math.cos(angle) * .43, Math.sin(angle) * .43, .52);
    }
    case 4: { // pentagram and inner seal
      if (path === 1) return circle(0, 0, .34);
      const vertices = regularVertices(5);
      return samplePolygon([vertices[0], vertices[2], vertices[4], vertices[1], vertices[3]], t);
    }
    case 5: return path < 2
      ? samplePolygon(regularVertices(3, -Math.PI / 2 + path * Math.PI), t)
      : circle(0, 0, .34); // hexagram and inner seal
    case 6: { // flower of life
      if (path === 0) return circle(0, 0, .42);
      const angle = (path - 1) * TAU / 6 - Math.PI / 2;
      return circle(Math.cos(angle) * .42, Math.sin(angle) * .42, .42);
    }
    default: { // philosopher's seal: outer ring, inner seed, golden spiral
      if (path === 0) return circle(0, 0, 1);
      if (path === 1) return circle(0, 0, .3);
      const angle = t * 3 * TAU;
      const radius = .12 * Math.pow(1.61803, t * 3);
      return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
    }
  }
}
