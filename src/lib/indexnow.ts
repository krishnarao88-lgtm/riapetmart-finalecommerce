import "server-only";
import { site } from "@/lib/site";

// Public verification key; the matching file is public/ccf01759f15daa34afca17133a31f7e9.txt.
const KEY = "ccf01759f15daa34afca17133a31f7e9";

/** Tells Bing (and other IndexNow engines) these pages changed, so they're recrawled within hours, not weeks. */
export async function pingIndexNow(paths: string[]) {
  if (!paths.length || !site.url.startsWith("https://www.riapetmart.com")) return; // never from previews/local
  await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: "www.riapetmart.com", key: KEY, urlList: paths.map((p) => `${site.url}${p}`) }),
    signal: AbortSignal.timeout(4000),
  }).catch((err) => console.error("IndexNow ping failed:", err)); // a missed ping only delays recrawling
}
