// 入选标准。评分口径写在 prompts/score.md；这里只决定"多少分算信号"。
// 每篇资料独立打两次分（0–100），取平均；平均分 ≥ 所属信源分级的门槛即为"信号"（精选）。

export const SELECTION = {
  thresholds: { T1: 60, T2: 72 } as Record<string, number>,
  /** 信号台滑杆的默认位置。读者拖动它只影响自己看到的列表，不改变入选结果。 */
  defaultNoiseFloor: 65,
} as const;

export const HEAT = {
  /** 只统计这么多小时内的报道。 */
  windowHours: 48,
  /** 每过这么多小时，一个来源的贡献减半。 */
  halfLifeHours: 24,
  /** 一手信源的贡献系数。 */
  tierWeight: { T1: 1.3, T2: 1 } as Record<string, number>,
  /** 与多少小时前相比来判断"攀升"。 */
  compareHours: 6,
} as const;

export const CLUSTER = {
  /** 在多少天内找同一事件的候选。 */
  lookbackDays: 14,
  /** 标题词元相似度达到多少算同一件事。 */
  similarity: 0.42,
} as const;
