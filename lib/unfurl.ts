import dns from "node:dns/promises";
import net from "node:net";
import { cleanUrl, hostOf } from "./text";

export type Unfurled = { url: string; title?: string; description?: string; image?: string; siteName?: string; category?: string };

function isPrivate(ip: string) {
  if (net.isIPv6(ip)) {
    const l = ip.toLowerCase();
    if (l.startsWith("::ffff:")) return isPrivate(l.slice(7));
    return l === "::1" || l.startsWith("fc") || l.startsWith("fd") || l.startsWith("fe80") || l === "::";
  }
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

async function safeToFetch(u: URL) {
  if (!/^https?:$/.test(u.protocol)) return false;
  if (process.env.UNFURL_ALLOW_PRIVATE === "1") return true;
  try {
    const addrs = await dns.lookup(u.hostname, { all: true });
    return addrs.length > 0 && addrs.every((a) => !isPrivate(a.address));
  } catch {
    return false;
  }
}

const decode = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/\s+/g, " ").trim();

function meta(html: string, keys: string[]) {
  for (const key of keys) {
    const re1 = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']*)["']`, "i");
    const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${key}["']`, "i");
    const m = html.match(re1) || html.match(re2);
    if (m?.[1]) return decode(m[1]);
  }
  return undefined;
}

/** Guesses a category from the website, so a pasted link lands in the right place. */
export function guessCategory(url: string): string | undefined {
  const h = hostOf(url);
  const rules: [RegExp, string][] = [
    [/imdb\.com|letterboxd\.com|rottentomatoes\.com|themoviedb\.org/, "movies"],
    [/netflix\.com|hulu\.com|max\.com|hbomax|disneyplus|peacocktv|paramountplus|tv\.apple\.com|primevideo/, "tv"],
    [/spotify\.com|music\.apple\.com|bandcamp\.com|soundcloud\.com|tidal\.com|pitchfork\.com/, "music"],
    [/yelp\.com|resy\.com|opentable\.com|exploretock\.com|infatuation\.com|eater\.com/, "restaurants"],
    [/allrecipes|cooking\.nytimes|seriouseats|bonappetit|smittenkitchen|food52|epicurious|kingarthurbaking|budgetbytes|americastestkitchen/, "recipes"],
    [/airbnb\.|vrbo\.|tripadvisor\.|booking\.com|hotels\.com|visit[a-z]+\.(com|org)|nps\.gov|alltrails\.com/, "travel"],
    [/etsy\.com|amazon\.|target\.com|wayfair|llbean|rei\.com/, "stores"],
    [/youtube\.com|youtu\.be|tiktok\.com|instructables|lifehacker/, "tips"],
  ];
  return rules.find(([re]) => re.test(h))?.[1];
}

export async function unfurl(input: string): Promise<Unfurled | null> {
  const clean = cleanUrl(input);
  if (!clean) return null;
  const url = new URL(clean);
  const base: Unfurled = { url: clean, category: guessCategory(clean), siteName: hostOf(clean) };
  if (!(await safeToFetch(url))) return base;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 7000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; WorthAMentionBot/1.0; +link preview)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.8",
      },
    });
    clearTimeout(timer);
    if (!res.ok || !(res.headers.get("content-type") || "").includes("html")) return base;
    // Read at most ~1MB; the head is all we need.
    const reader = res.body?.getReader();
    let html = "";
    if (reader) {
      const dec = new TextDecoder();
      while (html.length < 1_000_000) {
        const { done, value } = await reader.read();
        if (done) break;
        html += dec.decode(value, { stream: true });
        if (/<\/head>/i.test(html)) break;
      }
      reader.cancel().catch(() => {});
    }
    const finalUrl = res.url || clean;
    const title = meta(html, ["og:title", "twitter:title"]) || decode(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || "") || undefined;
    let image = meta(html, ["og:image:secure_url", "og:image", "twitter:image", "twitter:image:src"]);
    if (image) {
      try {
        image = new URL(image, finalUrl).toString();
      } catch {
        image = undefined;
      }
    }
    return {
      ...base,
      title: title?.slice(0, 200),
      description: meta(html, ["og:description", "twitter:description", "description"])?.slice(0, 600),
      image,
      siteName: meta(html, ["og:site_name", "application-name"]) || base.siteName,
      category: base.category || guessCategory(finalUrl),
    };
  } catch {
    return base;
  }
}
