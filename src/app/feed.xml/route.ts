import { getStore } from "@/engine/store";
import { SITE } from "../../../industry/taxonomy";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  const store = await getStore();
  const entries = store.events
    .filter((e) => e.selected)
    .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt))
    .slice(0, 50)
    .map(
      (e) => `<item><title>${esc(e.title)}</title><link>${origin}/event/${e.id}</link><guid>${origin}/event/${e.id}</guid><pubDate>${new Date(e.firstSeenAt).toUTCString()}</pubDate><description>${esc(e.digest)}</description></item>`,
    )
    .join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${SITE.name} · ${SITE.enName}</title><link>${origin}</link><description>${SITE.slogan}</description><language>zh-CN</language>${entries}</channel></rss>`;
  return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8" } });
}
