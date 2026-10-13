import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStore } from "@/engine/store";
import { EditionView } from "@/components/edition/edition-view";
import { shortDate } from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/edition/[date]">): Promise<Metadata> {
  const { date } = await params;
  return { title: `晨报 · ${/^\d{4}-\d{2}-\d{2}$/.test(date) ? shortDate(date) : date}` };
}

export default async function EditionPage({ params }: PageProps<"/edition/[date]">) {
  const { date } = await params;
  const store = getStore();
  const edition = store.editions.find((e) => e.date === date);
  if (!edition) notFound();
  return <EditionView store={store} edition={edition} />;
}
