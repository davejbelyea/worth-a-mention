# Worth a Mention

**Good things. Worth remembering.**

A private website for a small group of friends to save the recommendations that come up in conversation: restaurants, shows, recipes, trips, and everything in between. Members rate things, comment, mark what they want to try, make shared plans and vote on them, and get a short roundup email every Thursday.

This version is plain PHP + MySQL, so it runs on an ordinary PHP host like a **Cloudways Flexible** server. There's nothing to build or install on the server. (The earlier Node.js version lives on the `nextjs-version` branch.)

---

## What's in it

- **Invite-only sign-in** with Google or an emailed sign-in link. Nobody gets in without an invite from the founder.
- **Home feed, browse and search** with filters for category, who added it, rating, location (New England by state, or elsewhere) and tags.
- **Add a recommendation** by typing a name or pasting a link. Links fill in the title, picture and description automatically when the website allows it. If someone tries to add something that's already there, the site points them to the original.
- **Recommendation pages** with photos, links, a personal note, star ratings from each member (changeable any time), the group average, comments, and a "want to try" list.
- **Shared plans** like "Next Dinner Out" where members add options from the site and vote. Votes (teal) are kept separate from star ratings (coral).
- **Thursday newsletter**, built from real activity: new recommendations, busy conversations, one older pick worth rediscovering, and upcoming plans. It's emailed to members and saved in an on-site archive.
- **Founder settings** for invitations, members, categories, newsletter timing, email and Google keys, and removing the sample content.
- **Sample content** (seven pretend friends, ~28 recommendations, 3 plans, 2 past newsletters) so the site doesn't feel empty. Everything sample is marked "Sample" and removable in one click.

---

## Putting it on Cloudways (Flexible)

You'll use the free Cloudways address for now. Everything below happens in the Cloudways console and your browser. No code editing.

### 1. Create the app

1. In Cloudways, open your server and click **Add Application**.
2. Choose **Custom App** (plain PHP). Name it "Worth a Mention".
3. When it's ready, open the app. On **Access Details** you'll see:
   - the **Application URL** (something like `https://phpstack-123456-789.cloudwaysapps.com`). That's your temporary web address.
   - the **MySQL** database name, username and password. Keep this tab open for step 4.

### 2. Point the web root at the `public` folder

**Application Settings → General → Webroot**: change `public_html` to **`public_html/public`** and save.

**Don't skip this.** It keeps the app's settings and private photos out of reach of the web. (There's a safety file that forwards visitors if you forget, but Cloudways can serve images directly without checking it.)

### 3. Get the code onto the server

Pick one:

- **Git (recommended, easy updates):** App → **Deployment via Git**. Cloudways shows an SSH key; add it to GitHub under the repo's **Settings → Deploy keys**. Then enter `git@github.com:davejbelyea/worth-a-mention.git`, branch `main`, deployment path `public_html`, and click **Start Deployment**. Later, "Pull" grabs any updates.
- **SFTP:** download this repo as a ZIP, unzip it, and upload everything inside it into `public_html` with an SFTP app (Cloudways gives you SFTP login details under Access Details → Application Credentials).

Then click **Application Settings → Reset File Permission** once so the site can save photos and settings.

### 3b. Automatic updates (optional)

Every push to `main` can update the live site by itself. Set up Git deployment (step 3) first, then in GitHub go to **Settings → Secrets and variables → Actions** and add four secrets:

- `CLOUDWAYS_EMAIL`: the email you log in to Cloudways with
- `CLOUDWAYS_API_KEY`: from Cloudways **API Integration** (in the top-right account menu) → Generate Key
- `CLOUDWAYS_SERVER_ID` and `CLOUDWAYS_APP_ID`: open the app in Cloudways and read them from the address bar: `…/server/SERVER_ID/application/APP_ID`

The **Actions** tab in GitHub shows each update.

### 4. Run the setup page

Visit your Application URL. You'll see a one-time setup page:

- Paste the **DB name**, **username** and **password** from Access Details. Host stays `localhost`.
- The **site address** is filled in for you. Make sure it starts with `https://`.
- Enter **your email** as the founder.
- Leave **sample content** checked if you want the site to look lived-in at first.

Click **Finish setup**, then sign in with your email. Until email is connected, your sign-in link appears right on the screen.

> Do this soon after uploading: until setup is finished, anyone who visits the address could fill in that page.

### 5. Turn on the Thursday timer

App → **Cron Job Management → Add New Cron Job**:

- Schedule: every 15 minutes (`*/15 * * * *`)
- Command: copy it from the site under **Settings (gear icon) → Connections → Newsletter timer**. It looks like `php /home/…/public_html/bin/cron.php`.

The site also checks on its own whenever someone visits, so this is a backup that makes delivery on time.

### 6. Turn on email (Resend)

1. Sign up at [resend.com](https://resend.com).
2. Add and verify a domain under **Domains** (Resend gives you a few DNS records to paste where you bought the domain). Until you have a domain, Resend only delivers to your own address, so you'll want one before inviting people. In the meantime you can copy invite links from Settings and text them to people.
3. Create an API key.
4. On the site: **Settings → Connections**. Paste the key and a "Send from" address like `Worth a Mention <hello@yourdomain.com>`. Save, then click **Send me a test email**.

### 7. Google sign-in (optional)

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and create a project called "Worth a Mention".
2. **APIs & Services → OAuth consent screen**: choose **External**, fill in the app name and your email, and publish it (or add your friends as test users).
3. **Credentials → Create credentials → OAuth client ID**, type **Web application**. For the authorized redirect URI, copy the one shown on the site under **Settings → Connections**.
4. Paste the client ID and secret into **Settings → Connections** and save. The "Continue with Google" button appears right away.

### 8. Invite the group

**Settings → Members → Invite someone.** Each person gets a private invite link that works with Google or email. When you're ready to launch, go to **Settings → Content → Remove all sample content**.

### When you get a domain

1. In Cloudways, **Domain Management**: add the domain and point its DNS at the server (Cloudways shows the IP). Then **SSL Certificate → Let's Encrypt** for the free https certificate.
2. Edit `storage/config.php` on the server (SFTP) and change `app_url` to `https://yourdomain.com`.
3. Update the Google redirect URI to the new address.

---

## Good to know

- **Where the data lives:** the MySQL database plus the `storage/uploads` folder (photos). Cloudways server backups cover both.
- **Privacy:** every page and photo requires a signed-in member, and search engines are told not to index anything. Removing a member signs them out everywhere; their past posts stay, with their name.
- **The `storage` folder** holds `config.php` (database password and secret keys). It's blocked from the web and ignored by git. Don't delete it, or the setup page comes back.

## Running it on your own computer

You need PHP 8.1+ with the SQLite extension.

```bash
WAM_DB=sqlite php -S localhost:8080 -t public tools/dev-router.php
```

Open http://localhost:8080 and the setup page asks for just a site address and founder email.

Only if you change the page designs, rebuild the stylesheet with Node: `npm install && npm run css`.

## Under the hood

PHP 8 (no frameworks, no Composer), MySQL or MariaDB (SQLite for local testing), htmx for the quick updates (ratings, votes, comments), and Tailwind CSS compiled ahead of time into `public/assets/app.css`.
