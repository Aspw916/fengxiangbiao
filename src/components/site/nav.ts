import { Home, SlidersHorizontal, Activity, CalendarDays, Bookmark, type LucideIcon } from "lucide-react";

export const NAV: { href: string; label: string; hint: string; icon: LucideIcon }[] = [
  { href: "/", label: "今日", hint: "今天最重要的事", icon: Home },
  { href: "/signals", label: "信号", hint: "全部资料与滤网", icon: SlidersHorizontal },
  { href: "/resonance", label: "共振", hint: "多少声音在说", icon: Activity },
  { href: "/edition", label: "日报", hint: "每日成刊与归档", icon: CalendarDays },
  { href: "/clips", label: "收藏", hint: "你保存的事件", icon: Bookmark },
];

export const SECONDARY_NAV = [
  { href: "/sources", label: "信源", hint: "信源分级与入选率" },
  { href: "/method", label: "方法", hint: "流水线如何工作" },
];
