// Realistic sample content so the site doesn't feel empty on day one.
// Everything here is flagged is_sample = 1 and shows a "Sample" badge.
// Remove it all from Settings → Content, or with `npm run unseed`.

import crypto from "node:crypto";

const id = () => crypto.randomBytes(9).toString("base64url");
const ago = (days, hours = 0) => new Date(Date.now() - days * 864e5 - hours * 36e5).toISOString();
const ahead = (days) => {
  const d = new Date(Date.now() + days * 864e5);
  return d.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
};
const titleKey = (t) => t.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/&/g, " and ").replace(/[^a-z0-9 ]+/g, " ").replace(/^(the|a|an) /, "").replace(/\s+/g, " ").trim();

const PEOPLE = [
  ["maggie", "Maggie Sullivan"],
  ["theo", "Theo Park"],
  ["priya", "Priya Raman"],
  ["jules", "Jules Moreau"],
  ["kevin", "Kevin O'Brien"],
  ["sam", "Sam Delgado"],
  ["nora", "Nora Fitzgerald"],
];

// [key, title, category, author, daysAgo, why, place {place_name, address, city, state, country}, tags]
const RECS = [
  ["neptune", "Neptune Oyster", "restaurants", "maggie", 2, "Get the hot buttered lobster roll, not the cold one. Trust me. Go at 11:30 on a weekday or bring a book for the line.", { address: "63 Salem St", city: "Boston", state: "MA" }, "seafood, north end, worth the wait"],
  ["pepe", "Frank Pepe Pizzeria Napoletana", "restaurants", "kevin", 9, "The white clam pizza is the whole reason to go. Yes it's a drive. Yes it's worth it. Order two.", { address: "157 Wooster St", city: "New Haven", state: "CT" }, "pizza, road trip, classic"],
  ["alforno", "Al Forno", "restaurants", "nora", 34, "Grilled pizza and the baked pastas. Order dessert when you sit down, they make it to order and it takes a while.", { address: "577 S Main St", city: "Providence", state: "RI" }, "date night, pasta, order dessert early"],
  ["oleana", "Oleana", "restaurants", "priya", 18, "The patio in September is about as good as Cambridge gets. Baked Alaska for the table.", { address: "134 Hampshire St", city: "Cambridge", state: "MA" }, "patio, mezze, date night"],
  ["clamshack", "The Clam Shack", "restaurants", "theo", 70, "Lobster roll with butter AND mayo, eaten standing on the bridge. Summer only.", { address: "2 Western Ave", city: "Kennebunkport", state: "ME" }, "lobster roll, summer, seafood"],
  ["henwood", "Hen of the Wood", "restaurants", "jules", 5, "Best meal of our Vermont trip, by a mile. The mushroom dish alone. Book ahead on weekends.", { address: "55 Cherry St", city: "Burlington", state: "VT" }, "farm to table, special occasion, book ahead"],
  ["sarma", "Sarma", "restaurants", "sam", 1, "Small plates, loud room, great cocktails. Let them pick for you and you'll leave happy.", { address: "249 Pearl St", city: "Somerville", state: "MA" }, "small plates, cocktails, groups"],
  ["woodstock", "A weekend in Woodstock, Vermont", "travel", "nora", 12, "Hike Mount Tom in the morning, Billings Farm in the afternoon, cider donuts somewhere in between. Peak foliage is early October but it's lovely any time.", { city: "Woodstock", state: "VT" }, "fall, weekend, hiking, foliage"],
  ["acadia", "Acadia National Park", "travel", "theo", 95, "Sunrise on Cadillac Mountain needs a vehicle reservation, so set an alarm the day they open. Jordan Pond popovers after.", { place_name: "Acadia National Park", city: "Bar Harbor", state: "ME" }, "hiking, national park, summer"],
  ["block", "Block Island day trip", "travel", "maggie", 40, "Ferry from Point Judith, rent bikes at the dock, ride to the Mohegan Bluffs. Bring a sweatshirt, the ride back gets cold.", { city: "New Shoreham", state: "RI" }, "beach, biking, summer, day trip"],
  ["ptown", "Provincetown in the off-season", "travel", "jules", 26, "November in P-town is the secret. Empty beaches, cozy bars, no traffic on Route 6.", { city: "Provincetown", state: "MA" }, "off-season, beach, cozy"],
  ["montreal", "Montréal long weekend", "travel", "priya", 52, "Five hours from Boston. Bagels at St-Viateur, Jean-Talon market, and a walk up Mount Royal. Bring your passport.", { city: "Montréal", country: "Canada" }, "city break, food, long weekend"],
  ["holdovers", "The Holdovers", "movies", "kevin", 21, "Set at a Massachusetts prep school in 1970 and it feels like a Christmas movie your dad would love. Paul Giamatti is perfect.", null, "holiday, comedy, new england"],
  ["pastlives", "Past Lives", "movies", "priya", 64, "Quiet, gorgeous, and it will wreck you a little. Watch it when you can give it your full attention.", null, "drama, romance, tearjerker"],
  ["slowhorses", "Slow Horses", "tv", "sam", 3, "Gary Oldman as the most disgusting, brilliant spy boss on TV. Each season is six episodes, so it's an easy commitment.", null, "spy, british, binge"],
  ["bear", "The Bear", "tv", "theo", 46, "Season one is stressful in the best way. Episode seven is one continuous shot and I needed a nap after.", null, "drama, food, intense"],
  ["shrinking", "Shrinking", "tv", "maggie", 15, "Funny and sweet without being sappy. Harrison Ford grumbling is worth the subscription.", null, "comedy, feel good"],
  ["khruangbin", "Khruangbin, Con Todo El Mundo", "music", "jules", 7, "Perfect cooking-dinner album. Chill but never boring.", null, "chill, dinner party, vinyl"],
  ["carlile", "Brandi Carlile, In These Silent Days", "music", "nora", 80, "Saw her at the Boston Calling a few years back and I've been obsessed since. Start with 'Right on Time.'", null, "folk, singer-songwriter"],
  ["marcella", "Marcella Hazan's tomato sauce", "recipes", "kevin", 11, "Three ingredients: canned tomatoes, butter, half an onion. Simmer 45 minutes. It's absurd how good it is.", null, "pasta, easy, weeknight, classic"],
  ["muffins", "Smitten Kitchen blueberry muffins", "recipes", "priya", 29, "The crunchy sugar on top is the move. Use Maine wild blueberries if you can find them.", null, "baking, breakfast, blueberries"],
  ["chowder", "Clam chowder, the not-too-thick kind", "recipes", "maggie", 110, "My grandmother's way: salt pork, no flour, finish with a little butter. It should never hold a spoon up.", null, "soup, new england, winter"],
  ["ginger", "Freeze your ginger", "tips", "sam", 6, "Toss the whole knob in the freezer and grate it frozen with a microplane. No peeling, and it never goes moldy.", null, "kitchen, hack"],
  ["flights", "Google Flights' date grid", "tips", "theo", 38, "Click the dates box and switch to 'Date grid' to see a whole week of prices at once. Saved us $200 on Montréal.", null, "travel, money saver"],
  ["formaggio", "Formaggio Kitchen", "stores", "jules", 58, "Tell them what you're cooking and they'll build you a cheese plate that makes you look like you know what you're doing.", { address: "244 Huron Ave", city: "Cambridge", state: "MA" }, "cheese, gifts, specialty food"],
  ["brattle", "Brattle Book Shop", "stores", "nora", 20, "Three floors of used books, plus the outdoor lot where everything's a few dollars. Go on a sunny day.", { address: "9 West St", city: "Boston", state: "MA" }, "books, used, downtown"],
  ["beanboots", "Get your L.L.Bean boots resoled", "fashion", "kevin", 44, "Don't buy new ones. Send the old pair back and they'll put new bottoms on. Mine are on their second life.", null, "boots, winter, buy it for life"],
  ["heattech", "Uniqlo Heattech under everything", "fashion", "sam", 88, "From December to March this is my whole personality. Thin enough to wear under work clothes.", null, "winter, layers"],
];

const COMMENTS = [
  ["neptune", "theo", 1.8, "Went Saturday at noon. The line was an hour. Was it worth it? ...Yes. Annoyingly yes."],
  ["neptune", "priya", 1.5, "The hot one with butter is the only correct answer. I will die on this hill."],
  ["neptune", "kevin", 1.2, "Row 34 is easier to get into if anyone's looking for a backup plan."],
  ["neptune", "maggie", 1.0, "Kevin, that's a whole separate recommendation. Add it!"],
  ["pepe", "nora", 7, "Sally's vs Pepe's. Let the fight begin."],
  ["pepe", "kevin", 6.8, "Pepe's. Not up for discussion. Okay fine, we can do both on the same trip."],
  ["pepe", "jules", 4, "Went last weekend on the way back from NYC. Clam pizza changed my life a little."],
  ["slowhorses", "maggie", 2.5, "Started this on your recommendation and we've done two seasons in a week. Send help."],
  ["slowhorses", "kevin", 2.1, "Jackson Lamb is my spirit animal."],
  ["slowhorses", "nora", 1.4, "Okay okay, adding it to the list."],
  ["henwood", "priya", 4.5, "Did they still have the hen of the woods mushroom dish? That's the one I dream about."],
  ["henwood", "jules", 4.2, "Yes! We ordered two."],
  ["woodstock", "theo", 10, "Add Sugarbush Farm for maple tastings. The kids loved it."],
  ["woodstock", "nora", 9.5, "Ooh good one. Also the Woodstock Inn bar is very cozy for a nightcap."],
  ["marcella", "sam", 9, "Made this Sunday. My kid asked for seconds, which has never happened."],
  ["marcella", "priya", 8, "Do you use San Marzano? Or does it not matter?"],
  ["marcella", "kevin", 7.5, "I do, but honestly any good canned whole tomatoes work. It's the butter doing the heavy lifting."],
  ["holdovers", "jules", 18, "Watched it over the holidays and cried at the end. Perfect pick."],
  ["sarma", "maggie", 0.6, "We were there last month. Get the fried mussels."],
  ["ptown", "sam", 22, "Can confirm, went in November and had the whole beach to ourselves."],
  ["acadia", "maggie", 90, "Did the Beehive trail too. Not for anyone scared of heights!"],
];

const RATINGS = {
  neptune: { maggie: 5, theo: 5, priya: 5, kevin: 4, sam: 4 },
  pepe: { kevin: 5, jules: 5, nora: 4, theo: 4 },
  alforno: { nora: 5, priya: 4, maggie: 5 },
  oleana: { priya: 5, jules: 4, nora: 4 },
  clamshack: { theo: 4, maggie: 4, kevin: 5 },
  henwood: { jules: 5, priya: 5 },
  sarma: { sam: 5, maggie: 4 },
  woodstock: { nora: 5, theo: 4, sam: 4 },
  acadia: { theo: 5, maggie: 5, priya: 5, kevin: 4 },
  block: { maggie: 4, jules: 5 },
  ptown: { jules: 5, sam: 4 },
  montreal: { priya: 5, theo: 4, nora: 5 },
  holdovers: { kevin: 5, jules: 5, maggie: 4, nora: 4 },
  pastlives: { priya: 5, nora: 4, jules: 3 },
  slowhorses: { sam: 5, maggie: 5, kevin: 5 },
  bear: { theo: 5, sam: 4, priya: 3 },
  shrinking: { maggie: 4, nora: 4 },
  khruangbin: { jules: 4, sam: 4 },
  carlile: { nora: 5, maggie: 4 },
  marcella: { kevin: 5, sam: 5, priya: 4 },
  muffins: { priya: 4, maggie: 5 },
  chowder: { maggie: 5, kevin: 4, theo: 5 },
  ginger: { sam: 4, priya: 5, nora: 4 },
  flights: { theo: 4, priya: 4 },
  formaggio: { jules: 5, priya: 4 },
  brattle: { nora: 4, jules: 4 },
  beanboots: { kevin: 5, theo: 4 },
  heattech: { sam: 4 },
};

const INTEREST = {
  henwood: ["maggie", "kevin", "sam"], sarma: ["priya", "nora", "theo"], woodstock: ["maggie", "priya", "jules"],
  pepe: ["maggie", "sam", "priya"], slowhorses: ["nora", "jules", "priya"], ptown: ["maggie", "nora"], montreal: ["kevin", "sam"],
  alforno: ["theo", "jules"], pastlives: ["kevin"], block: ["theo", "sam", "nora"], acadia: ["jules", "nora"],
};

const PLANS = [
  { key: "dinner", title: "Next Dinner Out", emoji: "🍽️", date: 16, by: "maggie", days: 4, description: "Somewhere we can actually hear each other talk. Saturday the week after next?",
    items: { sarma: ["maggie", "priya", "sam"], henwood: ["jules"], oleana: ["priya", "nora", "kevin", "maggie"], alforno: ["nora"] },
    comments: [["maggie", 3.5, "Oleana patio while it's still warm enough?"], ["kevin", 3.1, "Henwood is three hours away, Jules. Bold."], ["jules", 2.9, "A girl can dream."], ["priya", 1.2, "I'm in for Oleana. I'll call about a table for eight."]] },
  { key: "trip", title: "Weekend Trip Ideas", emoji: "🧭", date: null, by: "theo", days: 20, description: "Spring or early summer. Ideally under four hours of driving.",
    items: { woodstock: ["nora", "theo", "maggie"], block: ["sam", "jules", "maggie", "theo"], ptown: ["jules"], montreal: ["priya", "kevin"] },
    comments: [["sam", 15, "Block Island in June, bikes, done."], ["priya", 12, "Montréal if everyone has a passport!"], ["theo", 6, "Block Island is pulling ahead. Ferry tickets sell out, let's lock in a date soon."]] },
  { key: "movie", title: "Next Movie Night", emoji: "🍿", date: 5, by: "kevin", days: 8, description: "My place. I'll handle popcorn, someone else handle the wine.",
    items: { holdovers: ["kevin", "maggie"], pastlives: ["priya"], slowhorses: ["sam", "nora", "jules"] },
    comments: [["sam", 6, "Slow Horses marathon counts as a movie night, right?"], ["kevin", 5.5, "It does if we do the whole first season."]] },
];

function lastThursdays(n) {
  const out = [];
  const d = new Date();
  for (let i = 0; out.length < n && i < 30; i++) {
    const day = new Date(d.getTime() - i * 864e5);
    const wd = day.toLocaleDateString("en-US", { timeZone: "America/New_York", weekday: "short" });
    const iso = day.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
    if (wd === "Thu" && i > 0) out.push(iso);
  }
  return out;
}

export async function loadSampleData(client, { ownerId } = {}) {
  const existing = await client.execute("SELECT COUNT(*) AS n FROM recs WHERE is_sample = 1");
  if (Number(existing.rows[0].n) > 0) return;

  const cats = Object.fromEntries((await client.execute("SELECT slug, id, name, emoji FROM categories")).rows.map((r) => [r.slug, r]));
  const users = {};
  for (const [key, name] of PEOPLE) {
    const found = await client.execute({ sql: "SELECT id FROM users WHERE email = ?", args: [`${key}@example.com`] });
    users[key] = found.rows[0]?.id || id();
    if (!found.rows[0]) {
      await client.execute({ sql: "INSERT INTO users (id, email, name, role, status, is_sample, created_at) VALUES (?, ?, ?, 'member', 'active', 1, ?)", args: [users[key], `${key}@example.com`, name, ago(130)] });
    }
  }

  const recIds = {};
  for (const [key, title, cat, author, days, why, place, tags] of RECS) {
    const rid = id();
    recIds[key] = rid;
    const ts = ago(days, 3 + (title.length % 9));
    const p = place || {};
    await client.execute({
      sql: `INSERT INTO recs (id, title, title_key, category_id, why, place_name, address, city, state, country, created_by, is_sample, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      args: [rid, title, titleKey(title), cats[cat]?.id ?? null, why, p.place_name ?? null, p.address ?? null, p.city ?? null, p.state ?? null, p.country ?? (p.state ? "US" : null), users[author], ts, ts],
    });
    for (const t of tags.split(",").map((s) => s.trim()).filter(Boolean)) {
      await client.execute({ sql: "INSERT OR IGNORE INTO rec_tags (rec_id, tag) VALUES (?, ?)", args: [rid, t] });
    }
  }

  for (const [rec, who, days, body] of COMMENTS) {
    await client.execute({ sql: "INSERT INTO comments (id, rec_id, user_id, body, is_sample, created_at) VALUES (?, ?, ?, ?, 1, ?)", args: [id(), recIds[rec], users[who], body, ago(days)] });
  }
  const recDays = Object.fromEntries(RECS.map((r) => [r[0], r[4]]));
  for (const [rec, map] of Object.entries(RATINGS)) {
    let k = 0;
    for (const [who, stars] of Object.entries(map)) {
      await client.execute({ sql: "INSERT OR REPLACE INTO ratings (rec_id, user_id, stars, updated_at) VALUES (?, ?, ?, ?)", args: [recIds[rec], users[who], stars, ago(Math.max(0.2, recDays[rec] - 0.3 - k++ * 0.4))] });
    }
  }
  for (const [rec, people] of Object.entries(INTEREST)) {
    for (const who of people) await client.execute({ sql: "INSERT OR IGNORE INTO interests (rec_id, user_id, created_at) VALUES (?, ?, ?)", args: [recIds[rec], users[who], ago(Math.max(0.1, recDays[rec] - 0.5))] });
  }

  const planIds = {};
  for (const p of PLANS) {
    const pid = id();
    planIds[p.key] = pid;
    await client.execute({
      sql: "INSERT INTO plans (id, title, description, emoji, target_date, created_by, is_sample, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)",
      args: [pid, p.title, p.description, p.emoji, p.date ? ahead(p.date) : null, users[p.by], ago(p.days), ago(1)],
    });
    for (const [rec, voters] of Object.entries(p.items)) {
      const iid = id();
      await client.execute({ sql: "INSERT INTO plan_items (id, plan_id, rec_id, added_by, created_at) VALUES (?, ?, ?, ?, ?)", args: [iid, pid, recIds[rec], users[voters[0]] || users[p.by], ago(p.days - 0.5)] });
      for (const v of voters) await client.execute({ sql: "INSERT OR IGNORE INTO plan_votes (item_id, user_id, created_at) VALUES (?, ?, ?)", args: [iid, users[v], ago(Math.max(0.5, p.days - 1))] });
    }
    for (const [who, days, body] of p.comments) {
      await client.execute({ sql: "INSERT INTO plan_comments (id, plan_id, user_id, body, is_sample, created_at) VALUES (?, ?, ?, ?, 1, ?)", args: [id(), pid, users[who], body, ago(days)] });
    }
  }

  // Two past editions of the newsletter, so the archive has something in it.
  const R = (key, extra = {}) => {
    const r = RECS.find((x) => x[0] === key);
    const ratings = Object.values(RATINGS[key] || {});
    const p = r[6] || {};
    return {
      id: recIds[key], title: r[1], emoji: cats[r[2]]?.emoji || "✨", category: cats[r[2]]?.name || "Other", author: PEOPLE.find((x) => x[0] === r[3])[1],
      why: r[5].length > 150 ? r[5].slice(0, 148).replace(/\s+\S*$/, "") + "…" : r[5],
      avg: ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null, ratings: ratings.length,
      place: [p.city, p.state].filter(Boolean).join(", "), cover: null, ...extra,
    };
  };
  const [lastThu, prevThu] = lastThursdays(2);
  const editions = [
    {
      date: prevThu, edition: 1, subject: "Worth a Mention · first edition: Marcella Hazan's tomato sauce and 3 more",
      data: {
        intro: "Welcome to the very first Thursday edition. 4 new recommendations this week, plus whatever you were all arguing about in the comments.",
        quiet: false, stats: { recs: 4, comments: 7, ratings: 11 },
        newRecs: [R("marcella"), R("woodstock"), R("pepe"), R("shrinking")], moreNew: 0,
        talk: [{ kind: "rec", id: recIds.pepe, title: "Frank Pepe Pizzeria Napoletana", emoji: "🍽️", count: 2, people: ["Nora Fitzgerald", "Kevin O'Brien"], latest: { name: "Kevin O'Brien", body: "Pepe's. Not up for discussion. Okay fine, we can do both on the same trip." } }],
        rediscover: R("chowder", { age: "about 3 months ago" }),
        plans: [{ id: planIds.trip, title: "Weekend Trip Ideas", emoji: "🧭", when: null, options: 4, voters: 6, leader: { title: "Block Island day trip", votes: 4 } }],
        signoff: "Go forth and recommend.",
      },
    },
    {
      date: lastThu, edition: 2, subject: "Worth a Mention · this week: Hen of the Wood and 2 more",
      data: {
        intro: "Here's what the group's been into this week. 3 fresh finds, and a few conversations worth catching up on.",
        quiet: false, stats: { recs: 3, comments: 6, ratings: 9 },
        newRecs: [R("henwood"), R("khruangbin"), R("ginger")], moreNew: 0,
        talk: [{ kind: "rec", id: recIds.henwood, title: "Hen of the Wood", emoji: "🍽️", count: 2, people: ["Priya Raman", "Jules Moreau"], latest: { name: "Jules Moreau", body: "Yes! We ordered two." } },
               { kind: "plan", id: planIds.dinner, title: "Next Dinner Out", emoji: "🍽️", count: 3, people: ["Maggie Sullivan", "Kevin O'Brien", "Jules Moreau"], latest: { name: "Jules Moreau", body: "A girl can dream." } }],
        rediscover: R("acadia", { age: "3 months ago" }),
        plans: [
          { id: planIds.movie, title: "Next Movie Night", emoji: "🍿", when: null, options: 3, voters: 6, leader: { title: "Slow Horses", votes: 3 } },
          { id: planIds.dinner, title: "Next Dinner Out", emoji: "🍽️", when: null, options: 4, voters: 7, leader: { title: "Oleana", votes: 4 } },
        ],
        signoff: "See you next Thursday. Bring snacks (and recommendations).",
      },
    },
  ];
  for (const e of editions) {
    if (!e.date) continue;
    const taken = await client.execute({ sql: "SELECT id FROM newsletters WHERE issue_date = ?", args: [e.date] });
    if (taken.rows.length) continue;
    const ts = new Date(e.date + "T12:00:00Z").toISOString();
    await client.execute({
      sql: "INSERT INTO newsletters (id, edition, issue_date, subject, data, period_start, period_end, is_sample, created_at, sent_at, sent_count) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 0)",
      args: [id(), e.edition, e.date, e.subject, JSON.stringify(e.data), ts, ts, ts, ts],
    });
  }
  void ownerId;
}

export async function removeSampleData(client) {
  let n = 0;
  for (const sql of [
    "DELETE FROM comments WHERE is_sample = 1",
    "DELETE FROM plan_comments WHERE is_sample = 1",
    "DELETE FROM plans WHERE is_sample = 1",
    "DELETE FROM recs WHERE is_sample = 1",
    "DELETE FROM newsletters WHERE is_sample = 1",
    "DELETE FROM users WHERE is_sample = 1",
  ]) {
    const r = await client.execute(sql);
    n += r.rowsAffected;
  }
  return n;
}

export async function sampleCounts(client) {
  const q = async (t) => Number((await client.execute(`SELECT COUNT(*) AS n FROM ${t} WHERE is_sample = 1`)).rows[0].n);
  return { users: await q("users"), recs: await q("recs"), plans: await q("plans"), newsletters: await q("newsletters"), comments: (await q("comments")) + (await q("plan_comments")) };
}
