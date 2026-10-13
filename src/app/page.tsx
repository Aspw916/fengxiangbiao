import { getStore } from "@/engine/store";
import { Sky } from "@/components/sky/sky";
import { toSkyEvent } from "@/lib/sky";
import { currentTime } from "@/lib/format";

export default async function Home({ searchParams }: PageProps<"/">) {
  const { focus } = await searchParams;
  const store = await getStore();
  const events = store.events.map((e) => toSkyEvent(store, e));
  return (
    <>
      <h1 className="sr-only">AI 天象台：最近 72 小时的 AI 事件星场</h1>
      <Sky events={events} now={currentTime()} initialFocus={typeof focus === "string" ? focus : undefined} />
    </>
  );
}
