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

const STORY_STOP = new Set([
  "the", "a", "an", "of", "to", "and", "in", "for", "on", "with", "is", "its", "at", "by", "from", "new", "how", "as", "that", "this", "it",
  "are", "was", "were", "be", "been", "being", "or", "not", "but", "if", "their", "they", "them", "his", "her", "you", "your", "our", "we",
  "will", "can", "may", "just", "more", "most", "than", "into", "over", "after", "before", "about", "also", "via", "per", "out", "up", "now",
  "says", "said", "say", "report", "reports", "reportedly", "according", "source", "sources",
  "announce", "announces", "announced", "announcing", "launch", "launches", "launched", "launching",
  "introduce", "introduces", "introduced", "introducing", "update", "updates", "updated",
  "plan", "plans", "planned", "start", "starts", "started", "let", "lets",
  "ai", "model", "models", "data", "using", "use", "used", "make", "makes", "made",
  "company", "companies", "tech", "technology", "latest", "first", "one", "two",
  "has", "have", "had", "who", "what", "when", "where", "why", "which", "while", "amid",
  "then", "too", "very", "get", "gets", "got", "own", "all", "some", "any", "only",
]);

function stemStory(word: string): string {
  let w = word;
  if (w.length > 5 && w.endsWith("ing")) {
    w = w.slice(0, -3);
    if (w.length > 3 && w.at(-1) === w.at(-2)) w = w.slice(0, -1);
  } else if (w.length > 4 && w.endsWith("ed")) {
    w = w.slice(0, -2);
    if (w.length > 3 && w.at(-1) === w.at(-2)) w = w.slice(0, -1);
  } else if (w.length > 4 && w.endsWith("es") && !w.endsWith("ss") && !w.endsWith("us") && !w.endsWith("is")) {
    w = w.slice(0, -2);
  } else if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) {
    w = w.slice(0, -1);
  }
  return w;
}

/** 用于判同一件事的标题词。只留有辨识度的词，并做很轻的词尾归并。英文不够时才退回中文二字组。 */
export function storyTokens(text: string): Set<string> {
  const out = new Set<string>();
  const lower = text.toLowerCase();
  for (const raw of lower.match(/[a-z0-9][a-z0-9.\-]+/g) ?? []) {
    for (const part of raw.replace(/^[.\-]+|[.\-]+$/g, "").split("-")) {
      if (part.length < 3 || STORY_STOP.has(part) || /^\d+$/.test(part)) continue;
      const stemmed = stemStory(part);
      if (stemmed.length >= 3 && !STORY_STOP.has(stemmed)) out.add(stemmed);
    }
  }
  if (out.size >= 2) return out;
  for (const run of lower.match(/[\u4e00-\u9fff]+/g) ?? []) {
    for (let i = 0; i < run.length - 1; i++) out.add(run.slice(i, i + 2));
  }
  return out;
}

/**
 * 标题里像专名的词：句中大写、全大写，或带数字。
 * 整句都是标题大写时，普通词也会大写，这时只认全大写和带数字的词。
 */
export function namedTokens(text: string): Set<string> {
  const out = new Set<string>();
  const words = text.match(/[A-Za-z0-9][A-Za-z0-9.'’$-]*/g) ?? [];
  if (!words.length) return out;
  const titled = words.length >= 8 && words.filter((word) => /^[A-Z]/.test(word)).length / words.length > 0.55;
  for (let index = 0; index < words.length; index++) {
    const bare = words[index].replace(/^[.'’$]+|[.'’$]+$/g, "");
    const acronym = bare.length >= 2 && bare === bare.toUpperCase() && /[A-Z]/.test(bare);
    const midCap = !titled && index > 0 && /^[A-Z]/.test(bare);
    if (!acronym && !/\d/.test(bare) && !midCap) continue;
    for (const part of bare.toLowerCase().split(/[^a-z0-9.]+/)) {
      if (part.length < 3 || STORY_STOP.has(part) || /^\d+$/.test(part)) continue;
      const stemmed = stemStory(part);
      if (stemmed.length >= 4 && !STORY_STOP.has(stemmed)) out.add(stemmed);
    }
  }
  return out;
}

/** 完全小写的辨识词。用来认出 “memories” 这种改写，而不是 “Palmer” 这种人名。 */
export function plainTokens(text: string): Set<string> {
  const out = new Set<string>();
  const words = text.match(/[A-Za-z0-9][A-Za-z0-9.'’$-]*/g) ?? [];
  for (const word of words) {
    const bare = word.replace(/^[.'’$]+|[.'’$]+$/g, "");
    if (!bare || bare !== bare.toLowerCase()) continue;
    for (const part of bare.toLowerCase().split(/[^a-z0-9.]+/)) {
      if (part.length < 3 || STORY_STOP.has(part) || /^\d+$/.test(part)) continue;
      const stemmed = stemStory(part);
      if (stemmed.length >= 3 && !STORY_STOP.has(stemmed)) out.add(stemmed);
    }
  }
  return out;
}

export function normTitle(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, " ").replace(/\s+/g, " ").trim();
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
