"use client";

import { useRouter } from "next/navigation";

export function EditionPicker({ current, options }: { current: string; options: { value: string; label: string }[] }) {
  const router = useRouter();
  return (
    <select
      aria-label="选择日期"
      value={current}
      onChange={(ev) => router.push(`/edition/${ev.target.value}`)}
      className="h-8 max-w-36 rounded-full border border-line bg-bg px-3 text-xs text-dim outline-none hover:border-faint focus-visible:border-faint"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
