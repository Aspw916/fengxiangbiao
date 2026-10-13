import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-24 text-center">
      <p className="font-mono text-sm text-faint">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">没有找到这个页面</h1>
      <p className="mt-3 text-sm text-dim">内容可能已超出保留期，或者链接有误。</p>
      <Link href="/" className="mt-6 inline-flex h-9 items-center rounded-full bg-fg px-4 text-sm font-medium text-bg hover:opacity-90">
        回到今日
      </Link>
    </div>
  );
}
