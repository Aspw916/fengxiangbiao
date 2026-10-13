import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <p className="font-mono text-xs tracking-[0.3em] text-vermilion">缺页</p>
      <h1 className="mt-3 font-serif text-3xl font-bold">这一页不在本刊里</h1>
      <p className="mt-3 text-sm text-ink-soft">稿件可能已经超出保留期，或者链接写错了。</p>
      <Link href="/" className="mt-6 inline-block border-b-2 border-vermilion pb-0.5 font-serif hover:text-vermilion">
        回到今日头版
      </Link>
    </div>
  );
}
