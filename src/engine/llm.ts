import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SITE, CATEGORIES } from "../../industry/taxonomy";

export function llmConfigured(): boolean {
  return Boolean(process.env.LLM_API_KEY);
}

export function loadPrompt(name: "score" | "write"): string {
  const raw = readFileSync(join(process.cwd(), "industry", "prompts", `${name}.md`), "utf8");
  return raw
    .replaceAll("{{siteName}}", SITE.name)
    .replaceAll("{{industry}}", SITE.industry)
    .replaceAll("{{categories}}", CATEGORIES.map((c) => `${c.key}（${c.label}）`).join("、"));
}

/** 调用 OpenAI 兼容接口，返回解析后的 JSON。只在流水线里调用，页面从不调用。 */
export async function chatJson<T>(system: string, user: string): Promise<T> {
  const base = process.env.LLM_BASE_URL ?? "https://api.deepseek.com/v1";
  const res = await fetch(`${base.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.LLM_API_KEY}` },
    body: JSON.stringify({
      model: process.env.LLM_MODEL ?? "deepseek-chat",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`LLM ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  const content = data.choices[0]?.message.content ?? "{}";
  return JSON.parse(content.replace(/^```(json)?|```$/g, "").trim()) as T;
}
