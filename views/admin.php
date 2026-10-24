<?php
$tabs = ['members' => 'Members', 'categories' => 'Categories', 'newsletter' => 'Newsletter', 'content' => 'Content', 'connections' => 'Connections'];
$secret = fn(string $k) => setting($k) !== '' ? '••••••••' : '';
?>
<div class="mx-auto max-w-3xl">
  <?= page_header('Group settings', 'Founder only') ?>
  <div class="no-scrollbar -mx-4 mb-6 flex gap-1 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0">
    <?php foreach ($tabs as $k => $l): ?>
      <a href="/admin?tab=<?= $k ?>" class="-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold transition <?= $tab === $k ? 'border-ink text-ink' : 'border-transparent text-mute hover:text-ink' ?>"><?= $l ?></a>
    <?php endforeach ?>
  </div>
  <?php if ($msg): ?><p class="mb-6 rounded-xl border border-gold/30 bg-gold/[0.07] p-3 text-sm font-medium text-gold" role="status"><?= h($msg) ?></p><?php endif ?>
  <?php if (!empty($memberLink)): ?>
    <div class="mb-6 rounded-xl border border-gold/30 bg-gold/[0.07] p-3 text-sm" role="status" data-testid="member-link">
      <p class="font-medium text-gold">Here's a sign-in link for <?= h($memberLink['name']) ?>. Text it to them. It works once and lasts 3 days.</p>
      <div class="mt-2 flex gap-2"><input readonly value="<?= h($memberLink['url']) ?>" class="field text-xs" aria-label="Sign-in link"><button type="button" class="btn-ghost shrink-0" data-copy="<?= h($memberLink['url']) ?>">Copy</button></div>
    </div>
  <?php endif ?>
  <?php if (!email_enabled() && $tab !== 'connections'): ?>
    <p class="mb-6 rounded-xl border border-line bg-raised p-3 text-sm text-soft"><b class="text-ink">Email isn't connected yet.</b> Invitations, sign-in links and the newsletter are saved on the server instead of sent. You can copy invite links below and text them to people. To turn email on, add a Resend key under <a href="/admin?tab=connections" class="font-semibold text-gold">Connections</a>.</p>
  <?php endif ?>

<?php if ($tab === 'members'):
  $members = all('SELECT u.*, (SELECT COUNT(*) FROM recs WHERE created_by = u.id) AS recs FROM users u ORDER BY u.status, u.is_sample, LOWER(u.name)');
  $invites = all('SELECT * FROM invites WHERE accepted_at IS NULL AND revoked_at IS NULL ORDER BY created_at DESC');
  $active = count(array_filter($members, fn($m) => $m['status'] === 'active' && !$m['is_sample'])); ?>
  <div class="space-y-10">
    <section class="card flex flex-wrap items-center justify-between gap-3 p-4" data-testid="open-signup">
      <div class="min-w-0 flex-1">
        <h2 class="font-bold"><?= open_signup() ? 'Anyone can join right now' : 'Invite only' ?></h2>
        <p class="mt-0.5 text-sm text-mute"><?= open_signup() ? 'Anyone who enters their email on the sign-in page can join. No invite needed.' : 'Only people you invite can join.' ?></p>
      </div>
      <form method="post" action="/admin/open-signup">
        <?= csrf_field() ?>
        <input type="hidden" name="on" value="<?= open_signup() ? '0' : '1' ?>">
        <button class="<?= open_signup() ? 'btn-ghost' : 'btn-primary' ?>"><?= open_signup() ? 'Switch to invite only' : 'Let anyone join' ?></button>
      </form>
    </section>
    <section>
      <h2 class="mb-1 font-bold">Invite someone</h2>
      <p class="mb-4 text-sm text-mute">They'll get an email with a private link. They can join with Google or an email sign-in link.</p>
      <form method="post" action="/admin/invite" class="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <?= csrf_field() ?>
        <input name="name" placeholder="First name (optional)" class="field">
        <input name="email" type="email" required placeholder="friend@example.com" class="field">
        <button class="btn-primary">Send invite</button>
      </form>
    </section>

    <?php if ($invites): ?>
    <section>
      <h2 class="mb-3 font-bold">Waiting to join</h2>
      <div class="card divide-y divide-line">
        <?php foreach ($invites as $i): $expired = $i['expires_at'] < now(); ?>
        <div class="flex flex-wrap items-center gap-2 p-4" data-invite>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold"><?= h($i['name'] ?: $i['email']) ?></p>
            <p class="truncate text-xs text-mute"><?= $i['name'] ? h($i['email']) . ' · ' : '' ?>invited <?= time_ago($i['created_at']) ?><?= $expired ? ' · expired' : '' ?></p>
          </div>
          <button type="button" class="btn-ghost h-8 px-2.5 text-xs" data-copy="<?= h(app_url() . '/join/' . $i['token']) ?>">Copy link</button>
          <?= post_button('/admin/resend', 'Resend', 'btn-quiet h-8 px-2.5 text-xs', ['id' => $i['id']]) ?>
          <?= post_button('/admin/revoke', 'Cancel', 'btn-quiet h-8 px-2.5 text-xs hover:text-danger', ['id' => $i['id']]) ?>
        </div>
        <?php endforeach ?>
      </div>
    </section>
    <?php endif ?>

    <section>
      <h2 class="mb-3 font-bold">Members <span class="text-mute"><?= $active ?></span></h2>
      <div class="card divide-y divide-line">
        <?php foreach ($members as $m): ?>
        <div class="flex items-center gap-3 p-4 <?= $m['status'] !== 'active' ? 'opacity-50' : '' ?>">
          <?= avatar($m['name'], $m['image'], 36) ?>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold"><?= h($m['name']) ?>
              <?php if ($m['role'] === 'admin'): ?><span class="ml-1 rounded bg-gold/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-gold">Founder</span><?php endif ?>
              <?php if ($m['is_sample']): ?><span class="ml-1 text-[10px] uppercase text-faint">sample</span><?php endif ?>
            </p>
            <p class="truncate text-xs text-mute"><?= h($m['email']) ?> · <?= plural((int) $m['recs'], 'rec') ?> · <?= $m['last_seen_at'] ? 'last in ' . time_ago($m['last_seen_at']) : 'joined ' . format_date($m['created_at']) ?></p>
          </div>
          <?php if ($m['status'] === 'active' && !$m['is_sample'] && $m['id'] !== $me['id']): ?>
            <?= post_button('/admin/member-link', 'Sign-in link', 'btn-ghost h-8 px-2.5 text-xs', ['id' => $m['id']]) ?>
          <?php endif ?>
          <?php if ($m['id'] !== $me['id'] && $m['role'] !== 'admin'): ?>
            <?= $m['status'] === 'active'
              ? post_button('/admin/member-status', 'Remove', 'btn-quiet h-8 px-2.5 text-xs hover:text-danger', ['id' => $m['id'], 'status' => 'removed'], "Remove {$m['name']}? They'll be signed out and can't get back in. Their posts stay.")
              : post_button('/admin/member-status', 'Restore', 'btn-quiet h-8 px-2.5 text-xs', ['id' => $m['id'], 'status' => 'active']) ?>
          <?php endif ?>
        </div>
        <?php endforeach ?>
      </div>
    </section>
  </div>

<?php elseif ($tab === 'categories'): $cats = categories(true); ?>
  <div class="space-y-8">
    <div class="card divide-y divide-line">
      <?php foreach ($cats as $i => $c): ?>
      <div class="flex flex-wrap items-center gap-2 p-3 <?= $c['archived'] ? 'opacity-50' : '' ?>">
        <form method="post" action="/admin/category" class="flex flex-1 flex-wrap items-center gap-2">
          <?= csrf_field() ?><input type="hidden" name="id" value="<?= h($c['id']) ?>">
          <input name="emoji" value="<?= h($c['emoji']) ?>" class="field w-14 px-2 text-center" aria-label="Emoji">
          <input name="name" value="<?= h($c['name']) ?>" class="field min-w-0 flex-1" aria-label="Name">
          <label class="flex items-center gap-1.5 text-xs text-mute"><input type="checkbox" name="has_location" <?= $c['has_location'] ? 'checked' : '' ?> class="accent-[#e5484d]"> Location</label>
          <button class="btn-ghost h-9 px-3 text-xs">Save</button>
        </form>
        <div class="flex items-center gap-1">
          <form method="post" action="/admin/category-move"><?= csrf_field() ?><input type="hidden" name="id" value="<?= h($c['id']) ?>"><input type="hidden" name="dir" value="up"><button <?= $i === 0 ? 'disabled' : '' ?> class="btn-quiet h-9 w-9 p-0" aria-label="Move up">↑</button></form>
          <form method="post" action="/admin/category-move"><?= csrf_field() ?><input type="hidden" name="id" value="<?= h($c['id']) ?>"><input type="hidden" name="dir" value="down"><button <?= $i === count($cats) - 1 ? 'disabled' : '' ?> class="btn-quiet h-9 w-9 p-0" aria-label="Move down">↓</button></form>
          <?= post_button('/admin/category-archive', $c['archived'] ? 'Show' : 'Hide', 'btn-quiet h-9 px-2.5 text-xs', ['id' => $c['id'], 'archived' => $c['archived'] ? '0' : '1']) ?>
        </div>
      </div>
      <?php endforeach ?>
    </div>
    <section>
      <h2 class="mb-3 font-bold">Add a category</h2>
      <form method="post" action="/admin/category" class="flex flex-wrap items-center gap-2">
        <?= csrf_field() ?>
        <input name="emoji" placeholder="🎲" class="field w-14 px-2 text-center" aria-label="Emoji">
        <input name="name" required placeholder="Board Games" class="field min-w-0 flex-1" aria-label="Category name">
        <label class="flex items-center gap-1.5 text-xs text-mute"><input type="checkbox" name="has_location" class="accent-[#e5484d]"> Has a location</label>
        <button class="btn-primary">Add</button>
      </form>
      <p class="mt-2 text-xs text-faint">“Location” shows the address fields and map link on that category's form.</p>
    </section>
  </div>

<?php elseif ($tab === 'newsletter'):
  $time = setting('digest_time') ?: '08:00';
  $enabled = setting('digest_enabled') === '1';
  $recent = all('SELECT id, issue_date, sent_count, sent_at, is_sample FROM newsletters ORDER BY issue_date DESC LIMIT 5'); ?>
  <div class="space-y-10">
    <section>
      <h2 class="mb-1 font-bold">Thursday delivery</h2>
      <p class="mb-4 text-sm text-mute">The newsletter goes out every Thursday, Eastern time. It covers everything since the last edition.</p>
      <form method="post" action="/admin/digest-settings" class="card space-y-4 p-5">
        <?= csrf_field() ?>
        <label class="flex items-center gap-3 text-sm"><input type="checkbox" name="digest_enabled" <?= $enabled ? 'checked' : '' ?> class="size-4 accent-[#e5484d]"> Send the newsletter automatically</label>
        <div class="flex flex-wrap items-center gap-3">
          <label for="digest_time" class="text-sm text-soft">Thursdays at</label>
          <input id="digest_time" type="time" name="digest_time" value="<?= h($time) ?>" step="900" class="field w-36">
          <span class="text-sm text-mute">Eastern (America/New_York)</span>
        </div>
        <button class="btn-primary">Save</button>
        <p class="text-xs text-faint">Currently: <?= $enabled ? 'Thursdays at ' . format_time12($time) : 'paused' ?>.</p>
      </form>
    </section>
    <section>
      <h2 class="mb-3 font-bold">Try it out</h2>
      <div class="flex flex-wrap gap-2">
        <a href="/admin/preview" class="btn-ghost">Preview this week's edition</a>
        <?= post_button('/admin/digest-test', 'Email a preview to me', 'btn-ghost') ?>
        <?= post_button('/admin/digest-send', 'Send to everyone now', 'btn-ghost', [], "Publish this week's edition now and email it to everyone?") ?>
      </div>
    </section>
    <?php if ($recent): ?>
    <section>
      <h2 class="mb-3 font-bold">Recent editions</h2>
      <div class="card divide-y divide-line text-sm">
        <?php foreach ($recent as $n): ?>
        <a href="/newsletter/<?= h($n['id']) ?>" class="flex justify-between p-3.5 hover:bg-raised/50">
          <span class="font-medium"><?= format_day($n['issue_date'], 'D, M j, Y') ?></span>
          <span class="text-mute"><?= $n['is_sample'] ? 'sample' : ($n['sent_at'] ? 'emailed to ' . $n['sent_count'] : 'not emailed') ?></span>
        </a>
        <?php endforeach ?>
      </div>
    </section>
    <?php endif ?>
  </div>

<?php elseif ($tab === 'content'): $counts = sample_counts(); $has = array_sum($counts) > 0; ?>
  <div class="space-y-6">
    <section class="card p-5">
      <h2 class="font-bold">Sample content</h2>
      <?php if ($has): ?>
        <p class="mt-1 text-sm text-mute">The site came with pretend friends and posts so it doesn't look empty. Right now there are <?= $counts['recs'] ?> sample recommendations, <?= $counts['plans'] ?> plans, <?= $counts['comments'] ?> comments, <?= $counts['newsletters'] ?> newsletter editions and <?= $counts['users'] ?> sample members. Anything marked <span class="text-soft">Sample</span> goes.</p>
        <div class="mt-4"><?= post_button('/admin/samples-remove', 'Remove all sample content', 'btn-danger', [], "Remove all sample content? Real posts, members and anything you've added stay put.") ?></div>
      <?php else: ?>
        <p class="mt-1 text-sm text-mute">No sample content on the site. You can load it to show people around, then remove it again later.</p>
        <div class="mt-4"><?= post_button('/admin/samples-load', 'Load sample content', 'btn-ghost') ?></div>
      <?php endif ?>
    </section>
    <section class="card p-5">
      <h2 class="font-bold">Editing anyone's posts</h2>
      <p class="mt-1 text-sm text-mute">As the founder, you'll see an <span class="text-soft">Edit</span> button on every recommendation and plan, and a <span class="text-soft">Delete</span> link on every comment.</p>
    </section>
    <section class="card p-5">
      <h2 class="font-bold">Backups</h2>
      <p class="mt-1 text-sm text-mute">Everything lives in the MySQL database plus the <code class="rounded bg-raised px-1">storage/uploads</code> folder (photos). Cloudways backs up both when you turn on server backups.</p>
    </section>
  </div>

<?php elseif ($tab === 'connections'): $redirect = app_url() . '/auth/google/callback'; $cronUrl = app_url() . '/cron?key=' . config('cron_key'); ?>
  <div class="space-y-6">
    <form method="post" action="/admin/connections" class="space-y-6">
      <?= csrf_field() ?>
      <section class="card space-y-4 p-5">
        <div class="flex items-center justify-between gap-3">
          <h2 class="font-bold">Email (Resend)</h2>
          <span class="rounded-full px-2.5 py-1 text-xs font-semibold <?= email_enabled() ? 'bg-vote/10 text-vote' : 'bg-raised text-mute' ?>"><?= email_enabled() ? 'On' : 'Not set up' ?></span>
        </div>
        <p class="text-sm text-mute">Sends invites, sign-in links and the Thursday newsletter. Get a key at resend.com (free for a group this size).</p>
        <div><label class="label" for="resend_api_key">API key</label><input id="resend_api_key" name="resend_api_key" value="<?= h($secret('resend_api_key')) ?>" placeholder="re_…" autocomplete="off" class="field"></div>
        <div><label class="label" for="email_from">Send from</label><input id="email_from" name="email_from" value="<?= h(setting('email_from')) ?>" placeholder="Worth a Mention &lt;hello@yourdomain.com&gt;" class="field"><p class="mt-1.5 text-xs text-faint">Must use a domain you've verified in Resend.</p></div>
      </section>
      <section class="card space-y-4 p-5">
        <div class="flex items-center justify-between gap-3">
          <h2 class="font-bold">Google sign-in</h2>
          <span class="rounded-full px-2.5 py-1 text-xs font-semibold <?= google_enabled() ? 'bg-vote/10 text-vote' : 'bg-raised text-mute' ?>"><?= google_enabled() ? 'On' : 'Not set up' ?></span>
        </div>
        <p class="text-sm text-mute">Adds a “Continue with Google” button. In Google Cloud, use this as the authorized redirect URI:</p>
        <div class="flex gap-2"><input readonly value="<?= h($redirect) ?>" class="field bg-raised text-sm" aria-label="Redirect URI"><button type="button" class="btn-ghost shrink-0" data-copy="<?= h($redirect) ?>">Copy</button></div>
        <div><label class="label" for="google_client_id">Client ID</label><input id="google_client_id" name="google_client_id" value="<?= h(setting('google_client_id')) ?>" autocomplete="off" class="field"></div>
        <div><label class="label" for="google_client_secret">Client secret</label><input id="google_client_secret" name="google_client_secret" value="<?= h($secret('google_client_secret')) ?>" autocomplete="off" class="field"></div>
      </section>
      <button class="btn-primary">Save connections</button>
    </form>
    <?php if (email_enabled()): ?><div><?= post_button('/admin/email-test', 'Send me a test email', 'btn-ghost') ?></div><?php endif ?>
    <section class="card space-y-3 p-5">
      <h2 class="font-bold">Newsletter timer</h2>
      <p class="text-sm text-mute">The site checks on its own whenever someone visits. For on-the-dot delivery, add a cron job in Cloudways (Application → Cron Job Management) that runs every 15 minutes with this command:</p>
      <div class="flex gap-2"><input readonly value="<?= h('php ' . ROOT . '/bin/cron.php') ?>" class="field bg-raised font-mono text-xs" aria-label="Cron command"><button type="button" class="btn-ghost shrink-0" data-copy="<?= h('php ' . ROOT . '/bin/cron.php') ?>">Copy</button></div>
      <p class="text-sm text-mute">Or, from any outside cron service, call this private address:</p>
      <div class="flex gap-2"><input readonly value="<?= h($cronUrl) ?>" class="field bg-raised font-mono text-xs" aria-label="Cron address"><button type="button" class="btn-ghost shrink-0" data-copy="<?= h($cronUrl) ?>">Copy</button></div>
    </section>
  </div>
<?php endif ?>
</div>
