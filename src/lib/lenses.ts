import type { SkyEvent } from "@/lib/sky";

/** 四面透镜。栏目只在对应关系清楚时映射；行业和观点必须命中摘要里的词，宁缺毋滥。 */
export type LensKey = "build" | "research" | "money" | "law";

export const LENSES: readonly { key: LensKey; label: string; categories: readonly string[]; words: readonly string[] }[] = [
  {
    key: "build",
    label: "我在做产品",
    categories: ["product", "tooling"],
    words: ["上线", "功能", "编程", "视频", "笔记本", "扩展"],
  },
  {
    key: "research",
    label: "我在做研究",
    categories: ["research", "model"],
    words: ["论文", "基准", "评测", "证明", "数学", "开源"],
  },
  {
    key: "money",
    label: "我在花钱",
    categories: [],
    words: ["融资", "债务", "价格", "成本", "美元", "芯片", "债券", "营收", "估值"],
  },
  {
    key: "law",
    label: "我要合规",
    categories: [],
    words: ["合规", "欧盟", "诉讼", "法院", "监管", "罚款", "密钥", "出口"],
  },
];

export function lensByKey(key: LensKey) {
  return LENSES.find((lens) => lens.key === key) ?? LENSES[0];
}

function blob(e: SkyEvent) {
  return `${e.title} ${e.digest} ${e.reason}`;
}

/** 命中则返回可展示的原因；未命中返回 null，调用方不要放进这面透镜。 */
export function lensWhy(e: SkyEvent, key: LensKey): string | null {
  const lens = lensByKey(key);
  const inTitle = lens.words.find((item) => e.title.includes(item));
  if (inTitle) return `因为标题里写了「${inTitle}」`;
  const inBody = lens.words.find((item) => `${e.digest} ${e.reason}`.includes(item));
  if (inBody) return `因为摘要里写了「${inBody}」`;
  if (lens.categories.includes(e.category)) return `因为原来在「${e.categoryLabel}」`;
  return null;
}

export function lensMatches(e: SkyEvent, key: LensKey) {
  return lensWhy(e, key) !== null;
}

/** 入选事件最多的那一面，避免打开就是空带。 */
export function fullestLens(events: SkyEvent[]): LensKey {
  let best: LensKey = LENSES[0].key;
  let count = -1;
  for (const lens of LENSES) {
    const n = events.filter((e) => e.selected && lensMatches(e, lens.key)).length;
    if (n > count) {
      count = n;
      best = lens.key;
    }
  }
  return best;
}

/** 只从标题里取词，句子不会写出摘要里没有的东西。 */
const SENTENCE_TERMS = ["法院", "谷歌", "债务", "债券", "开源", "智能体", "代理", "编程", "模型", "基准", "芯片", "价格", "黑客", "安全", "视频", "论文", "出口", "营收", "密钥"];

export function sentenceWords(title: string) {
  return SENTENCE_TERMS.filter((word) => title.includes(word)).slice(0, 3);
}

export function mentions(e: SkyEvent, word: string) {
  return blob(e).includes(word);
}
