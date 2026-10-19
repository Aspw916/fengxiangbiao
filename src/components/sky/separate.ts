/** 把同一行里挤在一起的星星沿时间轴分开；实在放不下的收成一簇。 */

const GAP = 5;
const MIN_R = 8;

export type StarIn = {
  id: string;
  x: number;
  y: number;
  r: number;
  band: number;
  priority: number;
};

export type StarOut = {
  id: string;
  x: number;
  y: number;
  r: number;
  clusterId: string | null;
  count: number;
  role: "solo" | "lead" | "member";
};

type Working = StarOut & { priority: number; ids: string[] };

function timeOf(n: { x: number; y: number }, axis: "x" | "y") {
  return axis === "x" ? n.x : n.y;
}

function cross(axis: "x" | "y", home: StarIn, amount: number): { x: number; y: number } {
  return axis === "x" ? { x: home.x, y: home.y + amount } : { x: home.x + amount, y: home.y };
}

/**
 * 每行独立安放。能沿时间轴错开的就缩小到刚好分开，并轻微上下错开；
 * 再小也会叠住的，收进前一颗星星的簇，代表星留在原位。
 */
export function separateStars(stars: StarIn[], opts: { timeAxis: "x" | "y"; pitch: number }): StarOut[] {
  const maxR = Math.max(MIN_R, opts.pitch * 0.34);
  const slack = opts.pitch - 2 * maxR;
  const stagger = Math.max(0, Math.min(3, slack / 2 - 1));
  const byBand = new Map<number, StarIn[]>();
  for (const s of stars) {
    const list = byBand.get(s.band) ?? [];
    list.push({ ...s, r: Math.min(Math.max(s.r, 4), maxR) });
    byBand.set(s.band, list);
  }

  const out: StarOut[] = [];
  for (const group of byBand.values()) {
    const sorted = [...group].sort((a, b) => timeOf(a, opts.timeAxis) - timeOf(b, opts.timeAxis) || b.priority - a.priority);
    const row: Working[] = [];
    const touch = (host: Working, s: StarIn) => {
      if (host.role === "solo") host.role = "lead";
      if (!host.ids.includes(s.id)) host.ids.push(s.id);
      host.ids.sort();
      host.count = host.ids.length;
      host.clusterId = host.ids.join("~");
      let memberId = s.id;
      let memberPriority = s.priority;
      if (s.priority > host.priority) {
        memberId = host.id;
        memberPriority = host.priority;
        host.id = s.id;
        host.priority = s.priority;
      }
      row.push({
        id: memberId,
        x: host.x,
        y: host.y,
        r: MIN_R,
        clusterId: host.clusterId,
        count: host.count,
        role: "member",
        priority: memberPriority,
        ids: host.ids,
      });
      for (const item of row) {
        if (item === host || item.ids === host.ids) {
          item.clusterId = host.clusterId;
          item.count = host.count;
          item.ids = host.ids;
        }
      }
    };

    for (const [index, s] of sorted.entries()) {
      const prev = [...row].reverse().find((item) => item.role !== "member");
      const shift = stagger ? ((index % 2 === 0 ? -1 : 1) * stagger) : 0;
      const at = cross(opts.timeAxis, s, shift);
      if (!prev) {
        row.push({ id: s.id, ...at, r: s.r, clusterId: null, count: 1, role: "solo", priority: s.priority, ids: [s.id] });
        continue;
      }
      const room = timeOf(s, opts.timeAxis) - timeOf(prev, opts.timeAxis) - GAP;
      if (room >= prev.r + MIN_R) {
        row.push({ id: s.id, ...at, r: Math.min(s.r, room - prev.r), clusterId: null, count: 1, role: "solo", priority: s.priority, ids: [s.id] });
        continue;
      }
      if (prev.role === "solo" && room >= MIN_R * 2) {
        const prevR = Math.min(prev.r, room - MIN_R);
        const r = Math.min(s.r, room - prevR);
        if (prevR >= MIN_R && r >= MIN_R) {
          prev.r = prevR;
          row.push({ id: s.id, ...at, r, clusterId: null, count: 1, role: "solo", priority: s.priority, ids: [s.id] });
          continue;
        }
      }
      touch(prev, s);
    }
    for (const item of row) out.push({ id: item.id, x: item.x, y: item.y, r: item.r, clusterId: item.clusterId, count: item.count, role: item.role });
  }
  return out;
}

/** 簇展开：代表星留在原地，其余绕到左、上、下，右侧留给提示框。 */
export function fanAround(others: { id: string }[], cx: number, cy: number, r: number): { id: string; x: number; y: number }[] {
  const n = others.length;
  if (!n) return [];
  const step = r * 2 + 10;
  const spread = Math.max(step, (n * step) / (2 * Math.PI));
  return others.map((o, i) => {
    const ang = n === 1 ? Math.PI : Math.PI / 2 + (Math.PI * i) / (n - 1);
    return { id: o.id, x: cx + Math.cos(ang) * spread, y: cy + Math.sin(ang) * spread };
  });
}
