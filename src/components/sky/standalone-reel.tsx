"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FocusReel, type Slide } from "./focus-reel";

/** 独立路由（/event/[id]、/edition）上的聚焦放映：Esc 回星场，翻页时同步地址栏。 */
export function StandaloneReel({
  slides,
  initial,
  label,
  hrefs,
  top,
}: {
  slides: Slide[];
  initial: number;
  label: string;
  hrefs?: (string | null)[];
  top?: React.ReactNode;
}) {
  const router = useRouter();
  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, []);
  return (
    <FocusReel
      slides={slides}
      initial={initial}
      label={label}
      top={top}
      closeHref="/"
      onClose={() => router.push("/")}
      onChange={(i) => {
        const href = hrefs?.[i];
        if (href) window.history.replaceState(null, "", href);
      }}
    />
  );
}
