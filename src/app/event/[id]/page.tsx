import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStore } from "@/engine/store";
import { StandaloneReel } from "@/components/sky/standalone-reel";
import { toSkyEvent } from "@/lib/sky";

export async function generateMetadata({ params }: PageProps<"/event/[id]">): Promise<Metadata> {
  const { id } = await params;
  const e = (await getStore()).events.find((x) => x.id === id);
  return e ? { title: e.title, description: e.digest } : { title: "未找到" };
}

export default async function EventPage({ params }: PageProps<"/event/[id]">) {
  const { id } = await params;
  const store = await getStore();
  const target = store.events.find((x) => x.id === id);
  if (!target) notFound();
  const ordered = store.events.filter((e) => e.selected).sort((a, b) => b.heat - a.heat || b.score - a.score);
  const list = ordered.some((e) => e.id === id) ? ordered : [target, ...ordered];
  const events = list.map((e) => toSkyEvent(store, e));

  return (
    <>
      <h1 className="sr-only">{target.title}</h1>
      <StandaloneReel
        label="事件聚焦"
        slides={events.map((e) => ({ kind: "event", e }))}
        initial={list.findIndex((e) => e.id === id)}
        hrefs={events.map((e) => `/event/${e.id}`)}
      />
    </>
  );
}
