"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Search, Sun } from "lucide-react";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { NAV, SECONDARY_NAV } from "./nav";

export interface SearchEntry {
  id: string;
  title: string;
  meta: string;
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Masthead({ dateLine, issue, index }: { dateLine: string; issue: string; index: SearchEntry[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      const target = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes(target.tagName)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="border-b border-rule bg-paper">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2 text-xs text-ink-soft sm:px-6">
        <span className="font-mono">{dateLine}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 rounded-sm border border-rule px-2 py-1 hover:border-ink hover:text-ink"
            aria-label="搜索稿件"
          >
            <Search className="size-3.5" />
            <span className="hidden sm:inline">查找稿件</span>
            <kbd className="hidden font-mono text-[10px] sm:inline">⌘K</kbd>
          </button>
          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="rounded-sm p-1.5 hover:text-ink"
            aria-label="切换日刊与夜刊"
            title="日刊 / 夜刊"
          >
            <Sun className="hidden size-4 dark:block" />
            <Moon className="size-4 dark:hidden" />
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Link href="/" className="block border-y-2 border-ink py-3 text-center sm:py-5">
          <span className="font-serif text-4xl font-black tracking-[0.3em] sm:text-6xl">风向标</span>
          <span className="mt-1 block font-mono text-[10px] tracking-[0.4em] text-ink-soft uppercase sm:text-xs">
            AI Signal Daily · {issue}
          </span>
        </Link>
        <nav className="hidden items-center justify-between border-b border-rule py-2 md:flex" aria-label="版面">
          <ul className="flex gap-6">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  className={cn(
                    "font-serif text-[15px] tracking-wide hover:text-vermilion",
                    isActive(pathname, n.href) && "text-vermilion underline decoration-2 underline-offset-[10px]",
                  )}
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
          <ul className="flex gap-4 text-xs text-ink-soft">
            {SECONDARY_NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className={cn("hover:text-ink", isActive(pathname, n.href) && "text-ink")}>
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <CommandDialog open={open} onOpenChange={setOpen} title="查找稿件" description="按标题搜索事件">
        <Command>
        <CommandInput placeholder="输入关键词，例如：开源、智能体、监管…" />
        <CommandList>
          <CommandEmpty>没有找到相关稿件，换个词试试。</CommandEmpty>
          <CommandGroup heading="版面">
            {[...NAV, ...SECONDARY_NAV.map((n) => ({ ...n, hint: "" }))].map((n) => (
              <CommandItem key={n.href} value={`版面 ${n.label}`} onSelect={() => (setOpen(false), router.push(n.href))}>
                {n.label}
                <span className="ml-auto text-xs text-muted-foreground">{n.hint}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="事件">
            {index.map((e) => (
              <CommandItem key={e.id} value={`${e.title} ${e.id}`} onSelect={() => (setOpen(false), router.push(`/event/${e.id}`))}>
                <span className="line-clamp-1">{e.title}</span>
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">{e.meta}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
        </Command>
      </CommandDialog>
    </header>
  );
}

export function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-ink bg-paper pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="版面">
      <ul className="grid grid-cols-5">
        {NAV.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className={cn("flex flex-col items-center gap-0.5 py-2 text-[11px]", isActive(pathname, href) ? "text-vermilion" : "text-ink-soft")}
            >
              <Icon className="size-5" strokeWidth={1.6} />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** J / K 在带 data-nav 的稿件之间移动，Enter 打开。 */
export function KeyboardNav() {
  const pathname = usePathname();
  useEffect(() => {
    let index = -1;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA"].includes(target.tagName) || e.metaKey || e.ctrlKey) return;
      const items = [...document.querySelectorAll<HTMLElement>("[data-nav]")];
      if (!items.length) return;
      if (e.key === "j" || e.key === "k") {
        index = Math.max(0, Math.min(items.length - 1, index + (e.key === "j" ? 1 : -1)));
        items[index].focus();
        items[index].scrollIntoView({ block: "center", behavior: "smooth" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pathname]);
  return null;
}
