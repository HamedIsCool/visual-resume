// Medium latest posts (default ?limit=10)
// Fast by default: skip OG image fetch to return quickly.
// Optional: &fast=0&og_limit=3&timeout=900 to upgrade a few images.
// Caches at the edge for 15 minutes.

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const handle = url.searchParams.get("handle") || "hamednoroozi";
    const limit = clampInt(url.searchParams.get("limit"), 10, 1, 20);
    const fast = parseBool(url.searchParams.get("fast"), true);             // default fast
    const ogLimit = clampInt(url.searchParams.get("og_limit"), 3, 0, 10);   // only a few
    const timeoutMs = clampInt(url.searchParams.get("timeout"), 900, 300, 3000);

    const UA =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

    // 1) Fetch RSS quickly
    const feedRes = await fetch(`https://medium.com/feed/@${handle}`, {
      headers: {
        "User-Agent": UA,
        "Accept": "application/rss+xml, application/xml;q=0.9, */*;q=0.7",
      },
      redirect: "follow",
    });
    const rssText = await feedRes.text();
    if (!feedRes.ok) return respond({ items: [] });

    // 2) Parse <item> blocks (regex, robust)
    const blocks = rssText.match(/<item\b[\s\S]*?<\/item>/gi) || [];
    const items = [];
    for (const block of blocks.slice(0, limit)) {
      const pick = (tag: string) =>
        (block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"))?.[1] ?? "")
          .replace(/<!\[CDATA\[|\]\]>/g, "")
          .trim();

      const rawLink = pick("link");
      let link = rawLink;
      try { const u = new URL(rawLink); u.searchParams.delete("source"); link = u.toString(); } catch {}

      const title   = pick("title");
      const pubDate = pick("pubDate");
      const content = pick("content:encoded") || pick("description");

      // In-feed image candidates
      let image =
        (block.match(/<media:content[^>]+url=["']([^"']+)["']/i)?.[1]) ||
        (block.match(/<enclosure[^>]+url=["']([^"']+)["']/i)?.[1]) ||
        (content.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1]);

      const preview = (content || "")
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 220);

      items.push({ url: link, title, pubDate, preview, image });
    }

    // 3) Optional OG image upgrade for posts missing image (limited, fast timeout)
    if (!fast && ogLimit > 0) {
      const missingIdx = items.map((it, i) => (!it.image ? i : -1)).filter(i => i >= 0).slice(0, ogLimit);
      await Promise.all(
        missingIdx.map(async (i) => {
          const img = await fetchOgImage(items[i].url, UA, timeoutMs);
          if (img) items[i].image = img;
        })
      );
    }

    return respond({ items });
  } catch (e) {
    return respond({ items: [] });
  }
});

function clampInt(v: string | null, def: number, min: number, max: number) {
  const n = Number(v); return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.trunc(n))) : def;
}
function parseBool(v: string | null, def: boolean) {
  if (v == null) return def;
  return ["1","true","yes","y"].includes(v.toLowerCase());
}

async function fetchOgImage(articleUrl: string, UA: string, timeoutMs: number) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(articleUrl, {
      headers: {
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Referer": "https://medium.com/",
      },
      redirect: "follow",
      signal: ctrl.signal,
    });
    if (!res.ok) return undefined;
    const html = await res.text();
    return (
      html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i)?.[1] ||
      html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i)?.[1] ||
      undefined
    );
  } catch {
    return undefined;
  } finally {
    clearTimeout(t);
  }
}

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, OPTIONS",
      // 15m CDN cache, quick client cache, allow fast refresh
      "cache-control": "public, max-age=60, s-maxage=900, stale-while-revalidate=86400",
    },
  });
}
