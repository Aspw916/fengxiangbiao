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

/** 全站共享的搜索面板开关：首页的大搜索框和顶栏按钮都打开同一个面板。 */
export function openSearch() {
  window.dispatchEvent(new Event("fxb:search"));
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
      <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
        <path d="M4 20 L12 4 L20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="15" r="1.8" fill="currentColor" />
      </svg>
      风向标
    </Link>
  );
}

export function Header({ index, demo }: { index: SearchEntry[]; demo: boolean }) {
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
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("fxb:search", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("fxb:search", onOpen);
    };
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-5 sm:px-8">
        <div className="flex items-center gap-3">
          <Logo />
          {demo && <span className="rounded-full border border-line px-2 py-0.5 text-[11px] text-faint" title="当前为虚构的示范内容，运行流水线后显示真实资讯">示范数据</span>}
        </div>

        <nav className="hidden items-center gap-1 md:flex" aria-label="主导航">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm transition-colors",
                isActive(pathname, n.href) ? "bg-raised text-fg" : "text-dim hover:text-fg",
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setOpen(true)}
            className="flex h-8 items-center gap-2 rounded-full border border-line px-3 text-sm text-dim transition-colors hover:border-faint hover:text-fg"
            aria-label="搜索事件"
          >
            <Search className="size-3.5" />
            <span className="hidden lg:inline">搜索</span>
            <kbd className="hidden font-mono text-[11px] text-faint lg:inline">⌘K</kbd>
          </button>
          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="flex size-8 items-center justify-center rounded-full text-dim transition-colors hover:bg-raised hover:text-fg"
            aria-label="切换深浅色"
          >
            <Sun className="hidden size-4 dark:block" />
            <Moon className="size-4 dark:hidden" />
          </button>
        </div>
      </div>

      <CommandDialog open={open} onOpenChange={setOpen} title="搜索" description="按标题搜索事件">
        <Command>
          <CommandInput placeholder="搜索事件，例如：开源、智能体、监管…" />
          <CommandList>
            <CommandEmpty>没有找到相关事件。</CommandEmpty>
            <CommandGroup heading="页面">
              {[...NAV, ...SECONDARY_NAV].map((n) => (
                <CommandItem key={n.href} value={`页面 ${n.label} ${n.hint}`} onSelect={() => go(n.href)}>
                  {n.label}
                  <span className="ml-auto text-xs text-muted-foreground">{n.hint}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="事件">
              {index.map((e) => (
                <CommandItem key={e.id} value={`${e.title} ${e.id}`} onSelect={() => go(`/event/${e.id}`)}>
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
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden" aria-label="主导航">
      <ul className="grid grid-cols-5">
        {NAV.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link href={href} className={cn("flex flex-col items-center gap-1 py-2.5 text-[11px]", isActive(pathname, href) ? "text-fg" : "text-faint")}>
              <Icon className="size-5" strokeWidth={1.75} />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** J / K 在带 data-nav 的条目之间移动焦点，Enter 打开。 */
export function KeyboardNav() {
  const pathname = usePathname();
  useEffect(() => {
    let index = -1;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA"].includes(target.tagName) || e.metaKey || e.ctrlKey) return;
      const items = [...document.querySelectorAll<HTMLElement>("[data-nav]")];
      if (!items.length || (e.key !== "j" && e.key !== "k")) return;
      index = Math.max(0, Math.min(items.length - 1, index + (e.key === "j" ? 1 : -1)));
      items[index].focus();
      items[index].scrollIntoView({ block: "center", behavior: "smooth" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pathname]);
  return null;
}
