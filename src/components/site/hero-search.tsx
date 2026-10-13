"use client";

import { ArrowUp, Search } from "lucide-react";
import { openSearch } from "./chrome";

export function HeroSearch() {
  return (
    <button
      onClick={openSearch}
      className="group flex h-14 w-full items-center gap-3 rounded-full border border-line bg-surface px-5 text-left text-[15px] text-faint shadow-[0_0_0_1px_transparent] transition-colors hover:border-faint"
    >
      <Search className="size-4.5" />
      <span className="flex-1">搜索今天的事件、公司或话题</span>
      <span className="flex size-8 items-center justify-center rounded-full bg-fg text-bg transition-transform group-hover:-translate-y-0.5">
        <ArrowUp className="size-4" />
      </span>
    </button>
  );
}
