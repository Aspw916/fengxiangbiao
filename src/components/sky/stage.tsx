"use client";

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { clampOutside, wellShift } from "./lens";
import type { Burst } from "./sky-well";

/**
 * 星场的透视层。
 * 相机锁在时间轴上（z = 0 的点投回原来的像素），共振越大越靠近镜头，所以更热的事件更大。
 * 指针带来的错位来自 three.js 粒子波示例里那台会跟着鼠标缓动的相机，这里收成一层视差，刻度不跟着跑。
 * 悬停用 Raycaster 选中粒子，选中的那颗再往前浮一点。
 * 事件星不同时接受视差和引力；景深开着时，透镜只收尘埃。
 */

const FOV = 52;
const MAX_STARS = 240;
const MAX_DUST = 160;
const MAX_POLY = 320;
const LIFT = 48;

export interface StageStar {
  id: string;
  x: number;
  y: number;
  r: number;
  z: number;
  alpha: number;
  pick: boolean;
  wake: number;
}

export interface StageScene {
  width: number;
  height: number;
  portrait: boolean;
  lens: boolean;
  depth: boolean;
  reduced: boolean;
  coarse: boolean;
  hovered: string | null;
  stars: StageStar[];
  constellation: string[];
  links: { a: string; b: string; strong: boolean }[];
  beam: number | null;
  view: { x: number; y: number; k: number };
}

type Drag = { x: number; y: number; vx: number; vy: number; moved: boolean } | null;

const POINT_VERT = `
attribute float aSize;
attribute float aAlpha;
varying float vAlpha;
uniform float uFocal;
void main() {
  vAlpha = aAlpha;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * (uFocal / max(1.0, -mv.z));
  gl_Position = projectionMatrix * mv;
}
`;

const POINT_FRAG = `
varying float vAlpha;
uniform vec3 uColor;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float d = length(p);
  if (d > 1.0) discard;
  float core = smoothstep(0.62, 0.0, d);
  float halo = smoothstep(1.0, 0.18, d);
  float alpha = vAlpha * (halo * 0.22 + core);
  if (alpha < 0.012) discard;
  gl_FragColor = vec4(uColor, alpha);
}
`;

const LINE_VERT = `
attribute float aDist;
varying float vDist;
void main() {
  vDist = aDist;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const LINE_FRAG = `
varying float vDist;
uniform vec3 uColor;
uniform float uAlpha;
uniform float uOffset;
uniform float uDash;
void main() {
  if (uDash > 0.5) {
    float m = mod(vDist - uOffset, 9.0);
    if (m > 1.8) discard;
  }
  gl_FragColor = vec4(uColor, uAlpha);
}
`;

type Placed = {
  id: string;
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  restX: number;
  restY: number;
  alpha: number;
  pick: boolean;
  hit: number;
  sprite: number;
  wake: number;
};

type Dust = { x: number; y: number; z: number; vx: number; vy: number };

function focal(h: number) {
  return (h / 2) / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
}

function writeTranslate(node: HTMLElement, dx: number, dy: number) {
  if (Math.abs(dx) < 0.35 && Math.abs(dy) < 0.35) {
    node.style.translate = "";
    return;
  }
  const x = `${dx.toFixed(2)}px`;
  const y = `${dy.toFixed(2)}px`;
  if (node.dataset.center) node.style.translate = `calc(-50% + ${x}) calc(-50% + ${y})`;
  else if (node.dataset.mid === "y") node.style.translate = `${x} calc(-50% + ${y})`;
  else node.style.translate = `${x} ${y}`;
}

function placeCard(sx: number, sy: number, w: number, h: number) {
  const cardW = 256;
  const cardH = 220;
  const clear = 148;
  const placeLeft = sx > w * 0.5;
  let left = placeLeft ? sx - clear - cardW : sx + clear;
  left = Math.min(w - cardW - 8, Math.max(8, left));
  let top = sy - 36;
  const covers = left < sx + clear && left + cardW > sx - clear && top < sy + clear && top + cardH > sy - clear;
  if (covers) top = sy > h * 0.55 ? sy - clear - cardH : sy + clear;
  top = Math.min(h - cardH - 8, Math.max(8, top));
  return { left, top };
}

function catmull(pts: { x: number; y: number; z: number }[], steps: number) {
  if (pts.length < 2) return pts;
  const out: { x: number; y: number; z: number }[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      const axis = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push({ x: axis(p0.x, p1.x, p2.x, p3.x), y: axis(p0.y, p1.y, p2.y, p3.y), z: axis(p0.z, p1.z, p2.z, p3.z) });
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

function quadPoint(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }, c: { x: number; y: number; z: number }, u: number) {
  const v = 1 - u;
  return {
    x: v * v * a.x + 2 * v * u * b.x + u * u * c.x,
    y: v * v * a.y + 2 * v * u * b.y + u * u * c.y,
    z: v * v * a.z + 2 * v * u * b.z + u * u * c.z,
  };
}

export function SkyStage({
  scene,
  pointerRef,
  burstRef,
  dragRef,
  onPick,
  onFallback,
}: {
  scene: StageScene;
  pointerRef: RefObject<{ x: number; y: number } | null>;
  burstRef: RefObject<Burst[]>;
  dragRef: RefObject<Drag>;
  onPick: (id: string | null) => void;
  onFallback: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef(scene);
  const onPickRef = useRef(onPick);
  const onFallbackRef = useRef(onFallback);
  useLayoutEffect(() => {
    sceneRef.current = scene;
    onPickRef.current = onPick;
    onFallbackRef.current = onFallback;
  }, [scene, onPick, onFallback]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, premultipliedAlpha: false });
    } catch {
      onFallbackRef.current();
      return;
    }
    if (!renderer.getContext()) {
      renderer.dispose();
      onFallbackRef.current();
      return;
    }
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

    const world = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(FOV, 1, 10, 8000);
    const raycaster = new THREE.Raycaster();
    raycaster.params.Points.threshold = 64;

    const color = new THREE.Color("#f4f4f5");
    const pointMat = new THREE.ShaderMaterial({
      transparent: true,
      depthTest: false,
      uniforms: { uColor: { value: color }, uFocal: { value: 800 } },
      vertexShader: POINT_VERT,
      fragmentShader: POINT_FRAG,
    });
    const lineMat = new THREE.ShaderMaterial({
      transparent: true,
      depthTest: false,
      uniforms: {
        uColor: { value: color },
        uAlpha: { value: 0.72 },
        uOffset: { value: 0 },
        uDash: { value: 1 },
      },
      vertexShader: LINE_VERT,
      fragmentShader: LINE_FRAG,
    });
    const plain = () =>
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.4, depthTest: false });

    const allocLine = (material: THREE.Material, segments = false) => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MAX_POLY * 3), 3));
      geo.setAttribute("aDist", new THREE.BufferAttribute(new Float32Array(MAX_POLY), 1));
      geo.setDrawRange(0, 0);
      geo.userData.segments = segments;
      const line = segments ? new THREE.LineSegments(geo, material) : new THREE.Line(geo, material);
      line.frustumCulled = false;
      world.add(line);
      return { geo, line };
    };

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MAX_STARS * 3), 3));
    starGeo.setAttribute("aSize", new THREE.BufferAttribute(new Float32Array(MAX_STARS), 1));
    starGeo.setAttribute("aAlpha", new THREE.BufferAttribute(new Float32Array(MAX_STARS), 1));
    starGeo.setDrawRange(0, 0);
    const stars = new THREE.Points(starGeo, pointMat);
    stars.frustumCulled = false;
    stars.renderOrder = 3;
    world.add(stars);

    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MAX_DUST * 3), 3));
    const dustMat = new THREE.PointsMaterial({
      color,
      size: 3.5,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.85,
      depthTest: false,
    });
    const dustPts = new THREE.Points(dustGeo, dustMat);
    dustPts.frustumCulled = false;
    dustPts.renderOrder = 0;
    world.add(dustPts);

    const sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(8 * 3), 3));
    sparkGeo.setAttribute("aSize", new THREE.BufferAttribute(new Float32Array(8).fill(5), 1));
    sparkGeo.setAttribute("aAlpha", new THREE.BufferAttribute(new Float32Array(8).fill(0.95), 1));
    sparkGeo.setDrawRange(0, 0);
    const sparks = new THREE.Points(sparkGeo, pointMat);
    sparks.frustumCulled = false;
    sparks.renderOrder = 4;
    world.add(sparks);

    const constellation = allocLine(lineMat);
    constellation.line.renderOrder = 1;
    const wakeMat = plain();
    wakeMat.opacity = 0.5;
    const wakes = allocLine(wakeMat, true);
    wakes.line.renderOrder = 1;
    const linkMat = plain();
    const linkDashMat = plain();
    linkDashMat.opacity = 0.28;
    const linkSolid = allocLine(linkMat, true);
    const linkDash = allocLine(linkDashMat, true);
    linkSolid.line.renderOrder = 1;
    linkDash.line.renderOrder = 1;
    const beamMat = plain();
    beamMat.opacity = 0.38;
    const beam = allocLine(beamMat);
    beam.line.renderOrder = 1;

    const ringMats = Array.from({ length: 8 }, () => plain());
    const rings = ringMats.map((material) => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(49 * 3), 3));
      const line = new THREE.Line(geo, material);
      line.frustumCulled = false;
      line.renderOrder = 2;
      world.add(line);
      return { geo, material };
    });

    const reticleMat = plain();
    const reticle = allocLine(reticleMat, true);
    reticle.line.renderOrder = 5;

    const tmp = new THREE.Vector3();
    const ndc = new THREE.Vector2();
    const dust: Dust[] = [];
    const rest = new Map<string, { x: number; y: number }>();
    const lift = new Map<string, number>();
    const par = { x: 0, y: 0 };
    let lastPick: string | null = null;
    let last = performance.now();
    let sized = "";
    let raf = 0;
    let stopped = false;
    let eye = 800;

    // 把像素坐标放到这条视线的深度上，静止时仍投回原来的格子；靠近镜头只让它变大。
    const park = (x: number, y: number, z: number, w: number, h: number, into: THREE.Vector3) => {
      const safe = Math.min(z, eye * 0.72);
      const scale = (eye - safe) / eye;
      into.set((x - w / 2) * scale, (h / 2 - y) * scale, safe);
      return into;
    };
    const project = (x: number, y: number, z: number, w: number, h: number) => {
      park(x, y, z, w, h, tmp);
      tmp.project(camera);
      return { x: (tmp.x * 0.5 + 0.5) * w, y: (-tmp.y * 0.5 + 0.5) * h };
    };

    const writePoly = (geo: THREE.BufferGeometry, pts: { x: number; y: number; z: number }[], w: number, h: number) => {
      const pos = geo.attributes.position as THREE.BufferAttribute;
      const dist = geo.attributes.aDist as THREE.BufferAttribute | undefined;
      const segments = geo.userData.segments === true;
      let n = 0;
      let walked = 0;
      let prev: { x: number; y: number; z: number } | null = null;
      const put = (pt: { x: number; y: number; z: number }, d: number) => {
        if (n >= MAX_POLY) return;
        park(pt.x, pt.y, pt.z, w, h, tmp);
        pos.setXYZ(n, tmp.x, tmp.y, tmp.z);
        if (dist) dist.setX(n, d);
        n += 1;
      };
      for (const pt of pts) {
        if (Number.isNaN(pt.x)) {
          prev = null;
          continue;
        }
        if (segments) {
          if (prev && n + 2 <= MAX_POLY) {
            const step = Math.hypot(pt.x - prev.x, pt.y - prev.y);
            put(prev, walked);
            walked += step;
            put(pt, walked);
          }
        } else {
          if (prev) walked += Math.hypot(pt.x - prev.x, pt.y - prev.y);
          put(pt, walked);
        }
        prev = pt;
      }
      pos.needsUpdate = true;
      if (dist) dist.needsUpdate = true;
      geo.setDrawRange(0, n);
    };

    const writeRing = (geo: THREE.BufferGeometry, cx: number, cy: number, z: number, radius: number, w: number, h: number) => {
      const pos = geo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i <= 48; i++) {
        const a = (i / 48) * Math.PI * 2;
        const x = cx + Math.cos(a) * radius;
        const y = cy + Math.sin(a) * radius;
        park(x, y, z, w, h, tmp);
        pos.setXYZ(i, tmp.x, tmp.y, tmp.z);
      }
      pos.needsUpdate = true;
      geo.setDrawRange(0, 49);
    };

    const respawn = (p: Dust, w: number, h: number) => {
      const edge = Math.random();
      if (edge < 0.25) {
        p.x = 0;
        p.y = Math.random() * h;
      } else if (edge < 0.5) {
        p.x = w;
        p.y = Math.random() * h;
      } else if (edge < 0.75) {
        p.x = Math.random() * w;
        p.y = 0;
      } else {
        p.x = Math.random() * w;
        p.y = h;
      }
      p.z = -30 - Math.random() * 90;
      p.vx = 0;
      p.vy = 0;
    };

    const paint = (now: number) => {
      const scene = sceneRef.current;
      const w = scene?.width ?? 0;
      const h = scene?.height ?? 0;
      if (!scene || w < 2 || h < 2) return;
      const dt = Math.min(0.034, (now - last) / 1000);
      last = now;
      const depthOn = scene.depth && !scene.reduced;
      const liveLens = scene.lens && !scene.reduced;
      const key = `${Math.round(w)}x${Math.round(h)}@${renderer.getPixelRatio()}`;
      if (key !== sized) {
        sized = key;
        renderer.setSize(w, h, false);
      }
      eye = focal(h);
      camera.aspect = w / h;
      camera.fov = FOV;
      camera.position.set(0, 0, eye);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      pointMat.uniforms.uFocal.value = eye;

      const fg = getComputedStyle(canvas).color;
      if (fg) {
        color.setStyle(fg);
        for (const material of [wakeMat, linkMat, linkDashMat, beamMat, reticleMat, ...ringMats]) material.color.copy(color);
      }

      const pointer = pointerRef.current;
      const wantX = pointer && depthOn ? (pointer.x / w) * 2 - 1 : 0;
      const wantY = pointer && depthOn ? (pointer.y / h) * 2 - 1 : 0;
      const blend = scene.reduced ? 1 : 1 - Math.exp(-dt * 3.5);
      par.x += (Math.max(-1, Math.min(1, wantX)) - par.x) * blend;
      par.y += (Math.max(-1, Math.min(1, wantY)) - par.y) * blend;

      const liftId = lastPick ?? scene.hovered;
      const byId = new Map(scene.stars.map((star) => [star.id, star]));
      for (const [id, star] of byId) {
        const prev = rest.get(id) ?? { x: star.x, y: star.y };
        const k = scene.reduced ? 1 : 1 - Math.exp(-dt * 10);
        prev.x += (star.x - prev.x) * k;
        prev.y += (star.y - prev.y) * k;
        rest.set(id, prev);
        const current = lift.get(id) ?? 0;
        const target = depthOn && id === liftId ? LIFT : 0;
        lift.set(id, current + (target - current) * (scene.reduced ? 1 : 1 - Math.exp(-dt * 8)));
      }
      for (const id of rest.keys()) if (!byId.has(id)) {
        rest.delete(id);
        lift.delete(id);
      }

      const pastX = scene.portrait ? 0 : -1;
      const pastY = scene.portrait ? -1 : 0;
      const placed: Placed[] = [];
      for (const star of scene.stars) {
        if (star.alpha <= 0) continue;
        const base = rest.get(star.id) ?? { x: star.x, y: star.y };
        let x = base.x;
        let y = base.y;
        const z = depthOn ? star.z + (lift.get(star.id) ?? 0) : 0;
        // 事件星只跟景深走。透镜开着时，井只收尘埃，避免和视差抢同一颗星。
        if (depthOn) {
          x += par.x * z * 0.065;
          y += par.y * z * 0.028;
        } else if (liveLens && pointer) {
          const shift = wellShift(x - pointer.x, y - pointer.y, 240, 28, star.r);
          x += shift.x;
          y += shift.y;
          const held = clampOutside(x, y, pointer.x, pointer.y, star.r);
          x = held.x;
          y = held.y;
        }
        const grown = 1 + (depthOn ? (lift.get(star.id) ?? 0) / LIFT : 0) * 0.22;
        const sprite = Math.max(2.5, star.r * 2) * (star.pick ? 1.7 : 1.15) * grown;
        const screen = project(x, y, z, w, h);
        placed.push({
          id: star.id,
          x,
          y,
          z,
          sx: screen.x,
          sy: screen.y,
          restX: star.x,
          restY: star.y,
          alpha: star.alpha,
          pick: star.pick,
          hit: Math.max(star.r + 8, sprite * 0.42),
          sprite,
          wake: star.wake,
        });
      }

      placed.sort((a, b) => a.z - b.z);
      const pos = starGeo.attributes.position as THREE.BufferAttribute;
      const sizes = starGeo.attributes.aSize as THREE.BufferAttribute;
      const alphas = starGeo.attributes.aAlpha as THREE.BufferAttribute;
      const count = Math.min(placed.length, MAX_STARS);
      for (let i = 0; i < count; i++) {
        const star = placed[i];
        park(star.x, star.y, star.z, w, h, tmp);
        pos.setXYZ(i, tmp.x, tmp.y, tmp.z);
        sizes.setX(i, star.sprite);
        alphas.setX(i, star.alpha);
      }
      pos.needsUpdate = true;
      sizes.needsUpdate = true;
      alphas.needsUpdate = true;
      starGeo.setDrawRange(0, count);
      starGeo.computeBoundingSphere();

      let pick: string | null = null;
      let hold = false;
      if (pointer && !scene.coarse && !dragRef.current?.moved) {
        if (count > 0) {
          ndc.set((pointer.x / w) * 2 - 1, -(pointer.y / h) * 2 + 1);
          raycaster.setFromCamera(ndc, camera);
          const hits = raycaster.intersectObject(stars, false);
          for (const hit of hits) {
            if (hit.index == null) continue;
            const star = placed[hit.index];
            if (!star?.pick) continue;
            if (Math.hypot(star.sx - pointer.x, star.sy - pointer.y) <= star.hit) {
              pick = star.id;
              break;
            }
          }
          if (!pick) {
            let best = Infinity;
            for (const star of placed) {
              if (!star.pick) continue;
              const d = Math.hypot(star.sx - pointer.x, star.sy - pointer.y);
              if (d > star.hit) continue;
              const score = d - star.z * 0.05;
              if (score < best) {
                best = score;
                pick = star.id;
              }
            }
          }
        }
        const field = canvas.parentElement?.parentElement;
        if (field) {
          const rect = field.getBoundingClientRect();
          const under = document.elementFromPoint(rect.left + pointer.x * scene.view.k + scene.view.x, rect.top + pointer.y * scene.view.k + scene.view.y);
          const starEl = under?.closest<HTMLElement>("[data-star]");
          if (!pick && starEl?.dataset.star) pick = starEl.dataset.star;
          if (!pick && under?.closest("[data-tip], [data-orbit]")) hold = true;
        }
      }
      if (!hold && pointer && !scene.coarse && !dragRef.current?.moved && pick !== lastPick) {
        lastPick = pick;
        onPickRef.current(pick);
      } else if (!pointer && lastPick !== null) {
        lastPick = null;
        onPickRef.current(null);
      }

      const at = new Map(placed.map((star) => [star.id, star]));
      const wakePts: { x: number; y: number; z: number }[] = [];
      for (const star of placed) {
        if (star.wake <= 0) continue;
        const len = 28 + star.wake * 120;
        if (wakePts.length) wakePts.push({ x: Number.NaN, y: 0, z: 0 });
        wakePts.push({ x: star.x, y: star.y, z: star.z }, { x: star.x + pastX * len, y: star.y + pastY * len, z: star.z });
      }
      writePoly(wakes.geo, wakePts, w, h);

      const lineStars = scene.constellation.map((id) => at.get(id)).filter((star): star is Placed => Boolean(star));
      const curve = catmull(lineStars.map((star) => ({ x: star.x, y: star.y, z: star.z })), 10);
      writePoly(constellation.geo, curve, w, h);
      lineMat.uniforms.uDash.value = scene.reduced ? 0 : 1;
      lineMat.uniforms.uOffset.value = scene.reduced ? 0 : (now / 90) % 90;
      lineMat.uniforms.uAlpha.value = 0.7;

      const solid: { x: number; y: number; z: number }[] = [];
      const dashed: { x: number; y: number; z: number }[] = [];
      const sparkList: { x: number; y: number; z: number }[] = [];
      if (curve.length > 1 && !scene.reduced) {
        let total = 0;
        for (let i = 1; i < curve.length; i++) total += Math.hypot(curve[i].x - curve[i - 1].x, curve[i].y - curve[i - 1].y);
        sparkList.push(pointAlong(curve, ((now / 1400) % 1) * total));
      }
      for (const link of scene.links) {
        const a = at.get(link.a);
        const b = at.get(link.b);
        if (!a || !b) continue;
        const mid = {
          x: (a.x + b.x) / 2 + (b.y - a.y) * 0.12,
          y: (a.y + b.y) / 2 - (b.x - a.x) * 0.12,
          z: (a.z + b.z) / 2 + (depthOn ? 56 : 0),
        };
        const samples = Array.from({ length: 18 }, (_, i) => quadPoint(a, mid, b, i / 17));
        (link.strong ? solid : dashed).push(...samples, { x: Number.NaN, y: 0, z: 0 });
        if (!scene.reduced) sparkList.push(quadPoint(a, mid, b, ((now / 1200) + (link.strong ? 0 : 0.45)) % 1));
      }
      writePoly(linkSolid.geo, solid, w, h);
      writePoly(linkDash.geo, dashed, w, h);

      const sparkPos = sparkGeo.attributes.position as THREE.BufferAttribute;
      const sparkCount = Math.min(sparkList.length, 8);
      for (let i = 0; i < sparkCount; i++) {
        const spark = sparkList[i];
        park(spark.x, spark.y, spark.z, w, h, tmp);
        sparkPos.setXYZ(i, tmp.x, tmp.y, tmp.z);
      }
      sparkPos.needsUpdate = true;
      sparkGeo.setDrawRange(0, sparkCount);

      if (scene.beam !== null) {
        const pts = scene.portrait
          ? [
              { x: 24, y: scene.beam, z: 0 },
              { x: w - 24, y: scene.beam, z: 0 },
            ]
          : [
              { x: scene.beam, y: 40, z: 0 },
              { x: scene.beam, y: h - 28, z: 0 },
            ];
        writePoly(beam.geo, pts, w, h);
      } else writePoly(beam.geo, [], w, h);

      let ring = 0;
      const showRing = (x: number, y: number, z: number, radius: number, opacity: number) => {
        const slot = rings[ring];
        if (!slot || radius <= 0) return;
        writeRing(slot.geo, x, y, z, radius, w, h);
        slot.material.opacity = opacity;
        ring += 1;
      };
      if (!scene.reduced) {
        for (let i = burstRef.current.length - 1; i >= 0; i--) if (now - burstRef.current[i].at > 980) burstRef.current.splice(i, 1);
        for (const burst of burstRef.current) {
          const p = (now - burst.at) / 980;
          showRing(burst.x, burst.y, depthOn ? 24 : 0, 8 + p * 72, (1 - p) * 0.75);
        }
      }
      for (let i = ring; i < rings.length; i++) rings[i].geo.setDrawRange(0, 0);

      const dustCount = scene.reduced ? 0 : liveLens ? (w < 720 ? 48 : 80) : depthOn ? (w < 720 ? 12 : 20) : 0;
      while (dust.length < dustCount) {
        const p: Dust = { x: Math.random() * w, y: Math.random() * h, z: 0, vx: 0, vy: 0 };
        respawn(p, w, h);
        dust.push(p);
      }
      if (dust.length > dustCount) dust.length = dustCount;
      const dustPos = dustGeo.attributes.position as THREE.BufferAttribute;
      dustMat.color.copy(color);
      dustMat.opacity = liveLens ? 0.9 : 0.45;
      dustMat.size = liveLens ? 3.5 : 2.4;
      for (let i = 0; i < dust.length; i++) {
        const p = dust[i];
        p.vx += Math.sin(now * 0.00035 + p.y * 0.012) * (liveLens ? 26 : 12) * dt;
        p.vy += Math.cos(now * 0.00028 + p.x * 0.012) * (liveLens ? 26 : 12) * dt;
        if (liveLens && pointer) {
          const dx = pointer.x - p.x;
          const dy = pointer.y - p.y;
          const r2 = dx * dx + dy * dy + 1600;
          const r = Math.sqrt(r2);
          const pull = 2_600_000 / r2;
          p.vx += (dx / r) * pull * dt;
          p.vy += (dy / r) * pull * dt;
          p.vx += (-dy / r) * pull * 0.85 * dt;
          p.vy += (dx / r) * pull * 0.85 * dt;
          if (Math.hypot(dx, dy) < 10) respawn(p, w, h);
        }
        p.vx *= 0.986;
        p.vy *= 0.986;
        const speed = Math.hypot(p.vx, p.vy);
        if (speed > 320) {
          p.vx = (p.vx / speed) * 320;
          p.vy = (p.vy / speed) * 320;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.x < -30 || p.y < -30 || p.x > w + 30 || p.y > h + 30) respawn(p, w, h);
        const drift = depthOn && !liveLens;
        const x = drift ? p.x - par.x * 20 : p.x;
        const y = drift ? p.y - par.y * 10 : p.y;
        park(x, y, 0, w, h, tmp);
        dustPos.setXYZ(i, tmp.x, tmp.y, tmp.z);
      }
      dustPos.needsUpdate = true;
      dustGeo.setDrawRange(0, dust.length);

      if (liveLens && pointer) {
        const arm = 7;
        writePoly(
          reticle.geo,
          [
            { x: pointer.x - 16, y: pointer.y, z: 0 },
            { x: pointer.x - arm, y: pointer.y, z: 0 },
            { x: Number.NaN, y: 0, z: 0 },
            { x: pointer.x + arm, y: pointer.y, z: 0 },
            { x: pointer.x + 16, y: pointer.y, z: 0 },
            { x: Number.NaN, y: 0, z: 0 },
            { x: pointer.x, y: pointer.y - 16, z: 0 },
            { x: pointer.x, y: pointer.y - arm, z: 0 },
            { x: Number.NaN, y: 0, z: 0 },
            { x: pointer.x, y: pointer.y + arm, z: 0 },
            { x: pointer.x, y: pointer.y + 16, z: 0 },
          ],
          w,
          h,
        );
      } else writePoly(reticle.geo, [], w, h);

      const root = canvas.parentElement;
      if (root) {
        for (const node of root.querySelectorAll<HTMLElement>("[data-warp]")) {
          const id = node.dataset.follow;
          const star = id ? at.get(id) : undefined;
          if (!star) {
            node.style.translate = "";
            continue;
          }
          writeTranslate(node, star.sx - star.restX, star.sy - star.restY);
        }
        const tip = root.parentElement?.querySelector<HTMLElement>("[data-tip]");
        const hovered = tip?.dataset.follow ? at.get(tip.dataset.follow) : undefined;
        if (tip && hovered) {
          const card = placeCard(hovered.sx * scene.view.k + scene.view.x, hovered.sy * scene.view.k + scene.view.y, w, h);
          tip.style.left = `${card.left}px`;
          tip.style.top = `${card.top}px`;
        }
      }

      renderer.render(world, camera);
    };

    const frame = (now: number) => {
      if (stopped) return;
      paint(now);
      if (!document.hidden) raf = requestAnimationFrame(frame);
    };
    const onVis = () => {
      if (!document.hidden) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    raf = requestAnimationFrame(frame);

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
      const root = canvas.parentElement;
      if (root) {
        for (const node of root.querySelectorAll<HTMLElement>("[data-warp]")) node.style.translate = "";
      }
      starGeo.dispose();
      dustGeo.dispose();
      sparkGeo.dispose();
      constellation.geo.dispose();
      wakes.geo.dispose();
      linkSolid.geo.dispose();
      linkDash.geo.dispose();
      beam.geo.dispose();
      reticle.geo.dispose();
      for (const slot of rings) slot.geo.dispose();
      pointMat.dispose();
      dustMat.dispose();
      lineMat.dispose();
      wakeMat.dispose();
      linkMat.dispose();
      linkDashMat.dispose();
      beamMat.dispose();
      reticleMat.dispose();
      for (const material of ringMats) material.dispose();
      renderer.dispose();
    };
  }, [burstRef, dragRef, pointerRef]);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 size-full text-fg" />;
}

function pointAlong(pts: { x: number; y: number; z: number }[], distance: number) {
  let left = distance;
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y, pts[i].z - pts[i - 1].z);
    if (left <= seg || i === pts.length - 1) {
      const t = seg === 0 ? 0 : Math.min(1, left / seg);
      return {
        x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t,
        y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t,
        z: pts[i - 1].z + (pts[i].z - pts[i - 1].z) * t,
      };
    }
    left -= seg;
  }
  return pts[pts.length - 1];
}
