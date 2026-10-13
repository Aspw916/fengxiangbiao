"use client";

type View = { x: number; y: number; k: number };
type Dot = { id: string; x: number; y: number; bright: number };

/** 放大后的缩略图：显示全部星星和当前视野，点击可跳转。 */
export function Minimap({ dots, size, view, width, onJump }: { dots: Dot[]; size: { w: number; h: number }; view: View; width: number; onJump: (v: View) => void }) {
  const s = width / size.w;
  const height = size.h * s;
  const frame = { x: (-view.x / view.k) * s, y: (-view.y / view.k) * s, w: (size.w / view.k) * s, h: (size.h / view.k) * s };

  return (
    <button
      type="button"
      aria-label="缩略图：点击跳转到对应区域"
      className="fade-in block overflow-hidden rounded-xl border border-line bg-surface/85 backdrop-blur"
      style={{ width, height }}
      onClick={(ev) => {
        const r = ev.currentTarget.getBoundingClientRect();
        const cx = (ev.clientX - r.left) / s;
        const cy = (ev.clientY - r.top) / s;
        onJump({ k: view.k, x: size.w / 2 - cx * view.k, y: size.h / 2 - cy * view.k });
      }}
    >
      <svg width={width} height={height} aria-hidden className="pointer-events-none">
        {dots.map((d) => (
          <circle key={d.id} cx={d.x * s} cy={d.y * s} r={1 + d.bright * 2} className="fill-fg" opacity={0.35 + d.bright * 0.65} />
        ))}
        <rect x={frame.x} y={frame.y} width={frame.w} height={frame.h} rx={3} className="fill-fg/5 stroke-fg/60" strokeWidth={1} />
      </svg>
    </button>
  );
}
