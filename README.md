# Worth a Mention

**Good things. Worth remembering.**

A private website for a small group of friends to save the recommendations that come up in conversation: restaurants, shows, recipes, trips, and everything in between. Members rate things, comment, mark what they want to try, make shared plans and vote on them, and get a short roundup email every Thursday.

---

## What's in it

- **Invite-only sign-in** with Google or an emailed sign-in link. Nobody gets in without an invite from the founder.
- **Home feed, browse and search** with filters for category, who added it, rating, location (New England by state, or elsewhere) and tags.
- **Add a recommendation** by typing a name or pasting a link. Links fill in the title, picture and description automatically when the website allows it. If someone tries to add something that's already there, the site points them to the original.
- **Recommendation pages** with photos, links, a personal note, star ratings from each member (changeable any time), the group average, comments, and a "want to try" list.
- **Shared plans** like "Next Dinner Out" where members add options from the site and vote. Votes (teal) are clearly separate from star ratings (gold).
- **Thursday newsletter**, built from real activity: new recommendations, busy conversations, one older pick worth rediscovering, and upcoming plans. It's emailed to members and saved in an on-site archive. Quiet weeks get a lighter, friendly edition.
- **Founder settings** for invitations, members, categories, newsletter timing, and removing the sample content.
- **Sample content** (seven pretend friends, ~28 recommendations, 3 plans, 2 past newsletters) loads on first start so the site doesn't feel empty. Everything sample is marked with a "Sample" tag and can be removed in one click under **Settings → Content**.

## The quick version of setup

You need four things. Only the first is required to get going; the rest you can add whenever.

| What | Why | Cost |
|---|---|---|
| **A host** (we suggest Railway) | Runs the website and keeps the data | About $5/month |
| **Google sign-in keys** | Lets people "Continue with Google" | Free |
| **Resend** (email service) | Sends invites, sign-in links and the Thursday email | Free for this size group |
| **A web address** (optional) | e.g. `worthamention.com` instead of a Railway address | ~$12/year |

Until email is connected, every email the site would send gets printed in the server log instead, so you can still copy sign-in and invite links by hand while you set things up.

---

## Step 1: Put it online (Railway)

1. Put this folder in a GitHub repository (private is fine).
2. Go to [railway.com](https://railway.com), sign in with GitHub, choose **New Project → Deploy from GitHub repo**, and pick the repo.
3. In the service, open **Settings → Volumes** and add a volume mounted at `/data`. This is where the database and photos live. **Don't skip this**, or the data resets every time the site restarts.
4. Open **Variables** and add:
   - `ADMIN_EMAIL` = your email address (you become the founder/administrator)
   - `DATA_DIR` = `/data`
   - `APP_URL` = the site's address, e.g. `https://worth-a-mention.up.railway.app` (find it under **Settings → Networking → Generate Domain**; no slash at the end)
   - `CRON_SECRET` = any long random phrase
5. Railway builds and starts the site on its own. Visit the address, enter your email, and grab your sign-in link from the **Deploy Logs** (until email is connected).

Any host that runs Node.js 20.9+ with a persistent disk works too (Render, Fly.io, a small server). The commands are `npm install`, `npm run build`, `npm start`.

## Step 2: Google sign-in

1. Go to [console.cloud.google.com](https://console.cloud.google.com), create a project called "Worth a Mention".
2. **APIs & Services → OAuth consent screen**: choose **External**, fill in the app name and your email. Under **Audience**, publish the app (or add your eight friends as test users).
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**, type **Web application**.
   - Authorized redirect URI: `https://YOUR-SITE/auth/google/callback`
4. Copy the client ID and secret into Railway as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

The "Continue with Google" button appears once these are set.

## Step 3: Email (Resend)

1. Sign up at [resend.com](https://resend.com).
2. Add and verify your domain under **Domains** (Resend shows a few DNS records to paste into wherever you bought the domain). If you don't have a domain yet, Resend's test sender only delivers to your own address, so you'll want a domain before inviting people.
3. Create an API key and add these in Railway:
   - `RESEND_API_KEY` = the key
   - `EMAIL_FROM` = `Worth a Mention <hello@yourdomain.com>`

## Step 4: Invite the group

Sign in, click the gear icon (top right), and use **Members → Invite someone**. Each person gets a private invite link that works with Google or email. You can also copy the link and text it to them.

When you're ready to launch, go to **Settings → Content → Remove all sample content**.

---

## The Thursday newsletter

- It goes out every Thursday, Eastern time, at the time you set under **Settings → Newsletter** (default 8:00 AM).
- The site checks every few minutes on its own, so there's nothing extra to schedule. If your host sleeps when idle, set up a free cron service (like cron-job.org) to call `https://YOUR-SITE/api/cron/digest` every 15 minutes with the header `Authorization: Bearer YOUR_CRON_SECRET`.
- From settings you can preview this week's edition, email a preview to yourself, or send it to everyone right now.
- Members can turn the email off on their profile page. Every edition also lives in the on-site archive.

## Running it on your own computer

```bash
npm install
cp .env.example .env.local   # then set ADMIN_EMAIL to your address
npm run dev
```

Open http://localhost:3000. Sign-in links show right on the screen while email isn't connected.

Handy commands: `npm run seed` (reload the sample content) and `npm run unseed` (remove it).

## Settings reference

| Variable | Required | What it does |
|---|---|---|
| `APP_URL` | Yes | Public address of the site, used in emails and sign-in |
| `ADMIN_EMAIL` | Yes | The founder. Always the administrator |
| `DATA_DIR` | Yes in production | Folder for the database and photos. Must be a persistent disk |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | No | Turns on Google sign-in |
| `RESEND_API_KEY`, `EMAIL_FROM` | No | Turns on real email |
| `CRON_SECRET` | No | Protects the optional newsletter endpoint |
| `SKIP_SAMPLE_DATA=1` | No | Start completely empty instead of with sample content |

## Privacy notes

- Every page, photo and API call requires a signed-in member. Search engines are told not to index anything.
- Removing a member signs them out everywhere and blocks them from getting back in. Their past posts stay, with their name.
- Backups: the whole site lives in the `DATA_DIR` folder. Copy that folder and you've backed up everything.

## Under the hood

Next.js 16 (React 19), SQLite via libSQL, Tailwind CSS 4. No outside services are needed beyond the optional Google and Resend ones above.
