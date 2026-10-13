import type { Metadata } from "next";
import { getStore } from "@/engine/store";
import { EditionView, EmptyEdition } from "@/components/edition/edition-view";

export const metadata: Metadata = { title: "日报" };

export default async function LatestEdition() {
  const store = await getStore();
  const edition = store.editions[0];
  return edition ? <EditionView store={store} edition={edition} /> : <EmptyEdition />;
}
