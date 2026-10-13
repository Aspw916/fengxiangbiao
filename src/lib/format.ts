/** 当前时间。集中在这里，便于渲染时读取一次。 */
export function currentTime(): number {
  return Date.now();
}

const WEEK = ["日", "一", "二", "三", "四", "五", "六"];
const TZ = 8 * 3600_000;

function local(iso: string | number | Date) {
  return new Date(new Date(iso).getTime() + TZ);
}

export function relTime(iso: string, now = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "刚刚";
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  return d === 1 ? "昨天" : `${d} 天前`;
}

export function clock(iso: string): string {
  return local(iso).toISOString().slice(11, 16);
}

export function longDate(iso: string | number | Date): string {
  const d = local(iso);
  return `${d.getUTCFullYear()} 年 ${d.getUTCMonth() + 1} 月 ${d.getUTCDate()} 日 · 星期${WEEK[d.getUTCDay()]}`;
}

export function shortDate(dateKey: string): string {
  const [, m, d] = dateKey.split("-").map(Number);
  const wd = new Date(`${dateKey}T00:00:00Z`).getUTCDay();
  return `${m} 月 ${d} 日 周${WEEK[wd]}`;
}

export function issueNo(n: number): string {
  return `第 ${String(n).padStart(3, "0")} 期`;
}
