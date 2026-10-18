<?php $token ??= $invite['token'] ?? ''; ?>
<?php if (!$invite): ?>
<div class="card p-6 text-center">
  <div class="text-3xl">🎟️</div>
  <h2 class="mt-3 font-semibold">This invite isn't valid anymore</h2>
  <p class="mt-2 text-sm text-mute">It may have expired, been used already, or been cancelled. Ask whoever invited you for a fresh one.</p>
  <a href="<?= current_user() ? '/' : '/login' ?>" class="btn-ghost mt-5"><?= current_user() ? 'Go to the site' : 'Go to sign in' ?></a>
</div>
<?php else: ?>
<div class="card mb-5 p-5">
  <p class="eyebrow text-gold">You're invited</p>
  <p class="mt-2 text-[15px] leading-relaxed text-soft">
    <?php if ($invite['name']): ?><span class="text-ink"><?= h($invite['name']) ?></span>, <?php endif ?>
    <span class="text-ink"><?= h($invite['inviter_name'] ?: 'The group') ?></span> saved you a seat. This is where the group keeps the restaurants, shows, recipes and trips that come up in conversation, so nobody has to remember them.
  </p>
</div>
<div class="space-y-4">
  <?php if (google_enabled() && empty($sent)) partial('google_button', ['href' => '/auth/google?invite=' . rawurlencode($token), 'or' => 'or use email']) ?>
  <?php partial('email_link_form', ['invite' => $token, 'email' => $email ?? $invite['email'], 'sent' => $sent ?? false, 'devLink' => $devLink ?? null, 'error' => $error ?? '']) ?>
</div>
<?php endif ?>
