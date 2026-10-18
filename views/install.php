<?php if ($done): ?>
<div class="card p-6 text-center">
  <div class="text-3xl">🎉</div>
  <h2 class="mt-3 text-lg font-bold">You're all set</h2>
  <p class="mt-2 text-sm text-mute">Sign in with <span class="font-semibold text-soft"><?= h($v['admin_email']) ?></span>. Until email is connected, your sign-in link shows up right on the screen.</p>
  <a href="/login" class="btn-primary mt-5 w-full py-3">Go to sign in</a>
</div>
<?php else: ?>
<form method="post" action="/" class="space-y-5" data-busy="Setting up…">
  <div class="card space-y-1 p-4">
    <p class="eyebrow text-gold">One-time setup</p>
    <p class="text-sm text-soft">Connect the database and tell the site who's in charge. This page disappears once you're done.</p>
  </div>
  <?php if ($error): ?><p class="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger"><?= h($error) ?></p><?php endif ?>

  <fieldset class="space-y-3">
    <legend class="label">Database</legend>
    <p class="-mt-1 text-xs text-mute">In Cloudways: your application → Access Details → MySQL.</p>
    <input type="hidden" name="db_driver" value="<?= h($v['db_driver']) ?>">
    <?php if ($v['db_driver'] === 'sqlite'): ?>
      <input name="db_path" value="<?= h($v['db_path']) ?>" placeholder="Leave blank for storage/wam.sqlite" class="field">
    <?php else: ?>
      <input name="db_name" value="<?= h($v['db_name']) ?>" placeholder="DB name" required class="field" autocomplete="off">
      <input name="db_user" value="<?= h($v['db_user']) ?>" placeholder="Username" required class="field" autocomplete="off">
      <input name="db_pass" type="password" placeholder="Password" class="field" autocomplete="new-password">
      <input name="db_host" value="<?= h($v['db_host']) ?>" placeholder="Host (usually localhost)" class="field">
    <?php endif ?>
  </fieldset>

  <div>
    <label class="label" for="app_url">Site address</label>
    <input id="app_url" name="app_url" value="<?= h($v['app_url']) ?>" required class="field">
    <p class="mt-1.5 text-xs text-mute">The address in your browser bar right now is usually right. Change it later if you get a domain.</p>
  </div>
  <div>
    <label class="label" for="admin_email">Founder's email</label>
    <input id="admin_email" name="admin_email" type="email" value="<?= h($v['admin_email']) ?>" required placeholder="you@example.com" class="field">
    <p class="mt-1.5 text-xs text-mute">This person runs the group: invites, settings, the newsletter.</p>
  </div>
  <label class="flex items-start gap-3 text-sm">
    <input type="checkbox" name="samples" value="1" <?= $v['samples'] === '1' ? 'checked' : '' ?> class="mt-0.5 size-4 accent-[#e5484d]">
    <span>Start with sample content<span class="block text-xs text-mute">Pretend friends and posts, clearly marked, removable in one click.</span></span>
  </label>
  <button class="btn-primary w-full py-3 text-[15px]">Finish setup</button>
</form>
<?php endif ?>
