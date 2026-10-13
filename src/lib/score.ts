export const GRADES = [
  { min: 70, label: "必读" },
  { min: 55, label: "值得看" },
  { min: 0, label: "可留意" },
] as const;

export function scoreGrade(score: number, selected = true): string {
  if (!selected) return "未入选";
  return GRADES.find((g) => score >= g.min)!.label;
}

/** “必读 ≥70 · 值得看 55–69 · 可留意 <55” */
export const GRADE_LEGEND = GRADES.map((g, i) => (i === 0 ? `${g.label} ≥${g.min}` : i === GRADES.length - 1 ? `${g.label} <${GRADES[i - 1].min}` : `${g.label} ${g.min}–${GRADES[i - 1].min - 1}`)).join(" · ");
