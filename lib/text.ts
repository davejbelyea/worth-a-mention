export function titleKey(t: string) {
  return t
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/^(the|a|an) /, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function urlKey(u?: string | null) {
  if (!u) return null;
  try {
    const url = new URL(u);
    [...url.searchParams.keys()].forEach((k) => {
      if (/^(utm_|fbclid|gclid|igshid|si$|ref$|mc_)/.test(k)) url.searchParams.delete(k);
    });
    const qs = url.searchParams.toString();
    return (url.hostname.replace(/^www\./, "") + url.pathname.replace(/\/+$/, "") + (qs ? "?" + qs : "")).toLowerCase();
  } catch {
    return null;
  }
}

export function cleanUrl(u?: string | null): string | null {
  if (!u) return null;
  let s = u.trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  try {
    const url = new URL(s);
    if (!/^https?:$/.test(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function parseTags(s?: string | null): string[] {
  if (!s) return [];
  const out = new Set<string>();
  for (const raw of s.split(/[,#\n]/)) {
    const t = raw.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 30);
    if (t) out.add(t);
  }
  return [...out].slice(0, 12);
}

export function hostOf(u?: string | null) {
  if (!u) return "";
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function snippet(s: string | null | undefined, n = 140) {
  if (!s) return "";
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : t;
}

export const NEW_ENGLAND = [
  { code: "MA", name: "Massachusetts" },
  { code: "CT", name: "Connecticut" },
  { code: "RI", name: "Rhode Island" },
  { code: "NH", name: "New Hampshire" },
  { code: "VT", name: "Vermont" },
  { code: "ME", name: "Maine" },
];
export const NE_CODES = NEW_ENGLAND.map((s) => s.code);

export const OTHER_STATES: [string, string][] = [
  ["AL","Alabama"],["AK","Alaska"],["AZ","Arizona"],["AR","Arkansas"],["CA","California"],["CO","Colorado"],["DE","Delaware"],["DC","Washington, D.C."],["FL","Florida"],["GA","Georgia"],["HI","Hawaii"],["ID","Idaho"],["IL","Illinois"],["IN","Indiana"],["IA","Iowa"],["KS","Kansas"],["KY","Kentucky"],["LA","Louisiana"],["MD","Maryland"],["MI","Michigan"],["MN","Minnesota"],["MS","Mississippi"],["MO","Missouri"],["MT","Montana"],["NE","Nebraska"],["NV","Nevada"],["NJ","New Jersey"],["NM","New Mexico"],["NY","New York"],["NC","North Carolina"],["ND","North Dakota"],["OH","Ohio"],["OK","Oklahoma"],["OR","Oregon"],["PA","Pennsylvania"],["SC","South Carolina"],["SD","South Dakota"],["TN","Tennessee"],["TX","Texas"],["UT","Utah"],["VA","Virginia"],["WA","Washington"],["WV","West Virginia"],["WI","Wisconsin"],["WY","Wyoming"],
];

export function mapLink(r: { place_name?: string | null; address?: string | null; city?: string | null; state?: string | null; country?: string | null; title?: string }) {
  const q = [r.place_name || r.title, r.address, r.city, r.state, r.country && r.country !== "US" ? r.country : ""].filter(Boolean).join(", ");
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null;
}

export function placeLine(r: { city?: string | null; state?: string | null; country?: string | null }) {
  return [r.city, r.state, r.country && r.country !== "US" ? r.country : ""].filter(Boolean).join(", ");
}
