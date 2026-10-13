export type Tier = "T1" | "T2";

export interface Source {
  id: string;
  name: string;
  kind: "rss";
  tier: Tier;
  feedUrl: string;
  homepage: string;
}

/** 一条资料：从信源进来，经过评分与写作。 */
export interface Item {
  id: string;
  sourceId: string;
  url: string;
  originalTitle: string;
  title: string;
  summary: string;
  reason: string;
  category: string;
  publishedAt: string;
  scores: [number, number];
  score: number;
  selected: boolean;
  eventId: string;
  /** 示范数据里用来固定归属的事件键；真实采集不使用。 */
  eventKey?: string;
}

export type EventStatus = "new" | "rising" | "steady" | "cooling";

/** 一个事件：不同来源报道的同一件事。 */
export interface StoryEvent {
  id: string;
  title: string;
  digest: string;
  reason: string;
  category: string;
  itemIds: string[];
  sourceIds: string[];
  firstSeenAt: string;
  lastSeenAt: string;
  heat: number;
  heatBefore: number;
  status: EventStatus;
  score: number;
  selected: boolean;
}

export interface EditionEntry {
  eventId: string;
  title: string;
  summary: string;
  sourceCount: number;
}

export interface Edition {
  date: string;
  no: number;
  lead: EditionEntry | null;
  sections: { key: string; title: string; entries: EditionEntry[] }[];
  briefs: EditionEntry[];
  stats: { collected: number; selected: number; events: number; sources: number };
}

export interface Store {
  mode: "demo" | "live";
  generatedAt: string;
  sources: Source[];
  items: Item[];
  events: StoryEvent[];
  editions: Edition[];
}
