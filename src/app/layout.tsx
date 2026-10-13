import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import Link from "next/link";
import { Toaster } from "@/components/ui/sonner";
import { KeyboardNav, Masthead, MobileTabBar } from "@/components/site/chrome";
import { getStore } from "@/engine/store";
import { categoryLabel, SITE } from "../../industry/taxonomy";
import { currentTime, issueNo, longDate } from "@/lib/format";
import "./globals.css";

const FONTS = "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Noto+Sans+SC:wght@400;500;700&family=Noto+Serif+SC:wght@500;700;900&display=swap";

export const metadata: Metadata = {
  title: { default: `${SITE.name} · ${SITE.enName}`, template: `%s · ${SITE.name}` },
  description: `${SITE.slogan}每天从一批 AI 信源里挑出真正值得看的事，按轻重排成一张版。`,
  alternates: { types: { "application/rss+xml": "/feed.xml" } },
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: LayoutProps<"/">) {
  const store = getStore();
  const latest = store.editions[0];
  const index = store.events
    .filter((e) => e.selected)
    .map((e) => ({ id: e.id, title: e.title, meta: `${categoryLabel(e.category)} · ${e.sourceIds.length} 源` }));

  return (
    <html lang="zh-CN" suppressHydrationWarning className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={FONTS} />
      </head>
      <body className="flex min-h-full flex-col bg-paper text-ink">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <Masthead dateLine={longDate(currentTime())} issue={latest ? issueNo(latest.no) : "创刊号"} index={index} />
          {store.mode === "demo" && (
            <div className="border-b border-rule bg-paper-deep">
              <p className="mx-auto max-w-6xl px-4 py-1.5 text-center text-xs text-ink-soft sm:px-6">
                当前展示的是<strong className="font-medium text-ink">示范稿件</strong>（虚构内容，仅用于演示版面）。运行{" "}
                <code className="font-mono text-ink">npm run pipeline</code> 抓取真实信源。
              </p>
            </div>
          )}
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-24 sm:px-6 md:pb-12">{children}</main>
          <footer className="hidden border-t-2 border-ink md:block">
            <div className="mx-auto flex max-w-6xl justify-between px-6 py-4 text-xs text-ink-soft">
              <span>
                {SITE.name} · {SITE.slogan}
              </span>
              <span className="flex gap-4">
                <Link href="/method" className="hover:text-ink">编辑部手记</Link>
                <Link href="/feed.xml" className="hover:text-ink">RSS</Link>
                <span className="font-mono">J / K 翻稿 · ⌘K 查找</span>
              </span>
            </div>
          </footer>
          <MobileTabBar />
          <KeyboardNav />
          <Toaster position="bottom-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
