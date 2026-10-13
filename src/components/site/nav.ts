import { Sparkles, List, CalendarDays, Bookmark, type LucideIcon } from "lucide-react";

export const NAV: { href: string; label: string; hint: string; icon: LucideIcon }[] = [
  { href: "/", label: "星场", hint: "最近 72 小时的事件天空", icon: Sparkles },
  { href: "/edition", label: "日报", hint: "逐帧放映每日成刊", icon: CalendarDays },
  { href: "/signals", label: "列表", hint: "全部资料与滤网（文字视图）", icon: List },
  { href: "/clips", label: "收藏", hint: "你保存的事件", icon: Bookmark },
];

export const SECONDARY_NAV = [
  { href: "/sources", label: "信源", hint: "信源分级与入选率" },
  { href: "/method", label: "方法", hint: "流水线如何工作" },
];
