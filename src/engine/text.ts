const STOP = new Set(["the", "a", "an", "of", "to", "and", "in", "for", "on", "with", "is", "its", "at", "by", "from", "new", "how", "as", "that", "this", "it"]);

/** 拆成可比较的词元：英文按词，中文按二字组。 */
export function tokens(text: string): Set<string> {
  const out = new Set<string>();
  const lower = text.toLowerCase();
  for (const w of lower.match(/[a-z0-9][a-z0-9.\-]+/g) ?? []) if (!STOP.has(w)) out.add(w);
  for (const run of lower.match(/[\u4e00-\u9fff]+/g) ?? []) {
    for (let i = 0; i < run.length - 1; i++) out.add(run.slice(i, i + 2));
  }
  return out;
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

export function hash(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

export function dayKey(iso: string | Date, tzOffsetHours = 8): string {
  const d = new Date(typeof iso === "string" ? iso : iso.getTime());
  return new Date(d.getTime() + tzOffsetHours * 3600_000).toISOString().slice(0, 10);
}
