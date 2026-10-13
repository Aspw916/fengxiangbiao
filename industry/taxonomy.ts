// 行业包：分类与关键词。换行业时改这里，不用改引擎。
// key 会出现在网址里（/signals?c=model），上线后不要再改。
// keywords 供没有配置模型时的启发式分类使用（小写匹配）。

export const SITE = {
  name: "风向标",
  enName: "AI Signal Daily",
  industry: "AI",
  slogan: "把今天的 AI，排成一张版。",
  editionHour: 8,
} as const;

export const CATEGORIES = [
  { key: "model", label: "模型", section: "模型与能力", keywords: ["model", "gpt", "gemini", "claude", "llama", "weights", "模型", "参数", "推理"] },
  { key: "product", label: "产品", section: "产品与上线", keywords: ["launch", "app", "feature", "release", "available", "rolls out", "上线", "发布", "功能"] },
  { key: "industry", label: "行业", section: "公司与行业", keywords: ["funding", "acquire", "raises", "lawsuit", "policy", "regulat", "deal", "ceo", "融资", "收购", "监管", "诉讼"] },
  { key: "research", label: "研究", section: "论文与研究", keywords: ["paper", "research", "benchmark", "study", "dataset", "arxiv", "论文", "研究", "基准"] },
  { key: "tooling", label: "工具", section: "工具与实践", keywords: ["open source", "github", "library", "sdk", "tutorial", "how to", "开源", "教程", "工具"] },
  { key: "opinion", label: "观点", section: "观点与评论", keywords: ["opinion", "essay", "interview", "podcast", "why", "think", "观点", "访谈", "评论"] },
] as const;

export type CategoryKey = (typeof CATEGORIES)[number]["key"];

export function categoryLabel(key: string): string {
  return CATEGORIES.find((c) => c.key === key)?.label ?? "其他";
}

/** 启发式评分时的"份量词"：出现即加分。 */
export const WEIGHT_TERMS = [
  "launch", "release", "open source", "open-source", "billion", "acquire", "funding", "benchmark", "state-of-the-art", "agent",
  "发布", "开源", "融资", "收购", "首个", "突破",
];
