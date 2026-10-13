import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import Link from "next/link";
import { Toaster } from "@/components/ui/sonner";
import { KeyboardNav, Header, MobileTabBar } from "@/components/site/chrome";
import { getStore } from "@/engine/store";
import { categoryLabel, SITE } from "../../industry/taxonomy";
import "./globals.css";

const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: `${SITE.name} · ${SITE.enName}`, template: `%s · ${SITE.name}` },
  description: `${SITE.slogan}每天从一批 AI 信源里挑出真正值得看的事。`,
  alternates: { types: { "application/rss+xml": "/feed.xml" } },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const store = await getStore();
  const index = store.events
    .filter((e) => e.selected)
    .map((e) => ({ id: e.id, title: e.title, meta: `${categoryLabel(e.category)} · ${e.sourceIds.length} 源` }));

  return (
    <html lang="zh-CN" suppressHydrationWarning className={`${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <Header index={index} demo={store.mode === "demo"} />
          <main className="mx-auto w-full max-w-5xl flex-1 px-5 pt-10 pb-28 sm:px-8 md:pb-16">{children}</main>
          <footer className="hidden border-t border-line md:block">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-8 py-6 text-xs text-faint">
              <span>{SITE.name} · {SITE.slogan}</span>
              <span className="flex items-center gap-5">
                <Link href="/sources" className="hover:text-fg">信源</Link>
                <Link href="/method" className="hover:text-fg">方法</Link>
                <Link href="/api/v1" className="hover:text-fg">API</Link>
                <Link href="/feed.xml" className="hover:text-fg">RSS</Link>
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
