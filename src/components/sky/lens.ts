/** 指针引力与星座几何。纯函数，方便单独核对不会把星星吸过指针。 */

export interface WellPoint {
  id: string;
  x: number;
  y: number;
  band: number;
  heat: number;
  label: string;
  title: string;
}

const RADIUS = 240;
const MAX_SHIFT = 32;

/** 星星中心不许落进自己的半径里。已经在外面就不动。 */
export function clampOutside(x: number, y: number, px: number, py: number, gap: number): { x: number; y: number } {
  const dx = x - px;
  const dy = y - py;
  const r = Math.hypot(dx, dy);
  const min = gap + 0.5;
  if (r < 0.5 || r >= min) return { x, y };
  const k = min / r;
  return { x: px + dx * k, y: py + dy * k };
}

/**
 * 把星星拉向指针。圆心最多停在自身半径之外，圆面不会吞掉指针。
 * dx、dy 是「星星 − 指针」。minGap 是星星半径。返回要加到坐标上的位移。
 */
export function wellShift(dx: number, dy: number, radius = RADIUS, max = MAX_SHIFT, minGap = 0): { x: number; y: number } {
  const r = Math.hypot(dx, dy);
  const room = r - minGap - 0.5;
  if (r < 0.5 || r >= radius || room <= 0) return { x: 0, y: 0 };
  const t = 1 - r / radius;
  const mag = Math.min(max * t * t, room);
  return { x: (-dx / r) * mag, y: (-dy / r) * mag };
}

/** 每个分类只留最亮的一颗，按分类顺序连成星座。不足两颗时不连。 */
export function constellationOf(stars: WellPoint[]): WellPoint[] {
  const best = new Map<number, WellPoint>();
  for (const star of stars) {
    const current = best.get(star.band);
    if (!current || star.heat > current.heat) best.set(star.band, star);
  }
  const line = [...best.values()].sort((a, b) => a.band - b.band);
  return line.length >= 2 ? line : [];
}

/** Catmull-Rom 转成 SVG 三次曲线，给画布的 Path2D 用。 */
export function curveThrough(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  const n = (v: number) => v.toFixed(1);
  let d = `M${n(pts[0].x)} ${n(pts[0].y)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${n(c1x)} ${n(c1y)}, ${n(c2x)} ${n(c2y)}, ${n(p2.x)} ${n(p2.y)}`;
  }
  return d;
}
