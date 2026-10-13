import { Newspaper, Radio, Waves, BookOpen, Scissors, type LucideIcon } from "lucide-react";

export const NAV: { href: string; label: string; hint: string; icon: LucideIcon }[] = [
  { href: "/", label: "头版", hint: "今天最重要的事", icon: Newspaper },
  { href: "/signals", label: "信号台", hint: "全部资料与滤网", icon: Radio },
  { href: "/resonance", label: "共振榜", hint: "多少声音在说", icon: Waves },
  { href: "/edition", label: "晨报", hint: "每日成刊与归档", icon: BookOpen },
  { href: "/clips", label: "剪报夹", hint: "你剪下的稿件", icon: Scissors },
];

export const SECONDARY_NAV = [
  { href: "/sources", label: "信源台" },
  { href: "/method", label: "编辑部手记" },
  { href: "/api/v1", label: "开放接口" },
];
