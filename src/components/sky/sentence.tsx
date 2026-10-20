"use client";

import type { SkyEvent } from "@/lib/sky";
import { sentenceWords } from "@/lib/lenses";

export function splitSentence(title: string) {
  const words = sentenceWords(title);
  if (!words.length) return { words, parts: [{ text: title, word: false }] };
  const re = new RegExp(`(${words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g");
  const parts = title
    .split(re)
    .filter(Boolean)
    .map((text) => ({ text, word: words.includes(text) }));
  return { words, parts };
}

/** 打开站点时的一句话。词只能是标题里已经有的字，句子不新编因果。 */
export function SentenceSky({
  lead,
  open,
  active,
  onPick,
  onSky,
}: {
  lead: SkyEvent;
  open: boolean;
  active: string | null;
  onPick: (word: string, el: HTMLButtonElement) => void;
  onSky: () => void;
}) {
  const { words, parts } = splitSentence(lead.title);
  return (
    <div className={`pointer-events-none absolute inset-x-0 z-20 px-6 sm:px-16 ${open ? "top-48 sm:top-28" : "top-48 sm:top-[18%]"}`}>
      <p className="text-center text-xs tracking-[0.28em] text-faint">今天值得停下来的是</p>
      <div className={`mx-auto mt-3 max-w-4xl text-center font-medium ${open ? "truncate text-sm leading-none text-dim sm:text-base" : "text-[26px] leading-snug sm:text-[40px]"}`}>
        {parts.map((part, i) =>
          part.word ? (
            <button
              key={`${part.text}-${i}`}
              type="button"
              data-sentence-word={part.text}
              aria-pressed={active === part.text}
              onClick={(ev) => onPick(part.text, ev.currentTarget)}
              className={`pointer-events-auto mx-0.5 underline decoration-dotted underline-offset-8 ${active === part.text ? "text-fg" : "text-fg"}`}
            >
              {part.text}
            </button>
          ) : (
            <span key={`${part.text}-${i}`}>{part.text}</span>
          ),
        )}
      </div>
      {!open && lead.reason && <p className="mx-auto mt-4 max-w-xl text-center text-sm leading-relaxed text-dim">{lead.reason}</p>}
      <div className="mt-4 flex justify-center">
        <button type="button" onClick={onSky} className="pointer-events-auto rounded-full border border-line px-4 py-2 text-xs text-dim hover:text-fg">
          {words.length ? "看整片天空" : "看这些星"}
        </button>
      </div>
    </div>
  );
}
