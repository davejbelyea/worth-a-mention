<?php if (!empty($sent)): ?>
<div class="card p-5 text-center">
  <div class="text-3xl">📬</div>
  <h2 class="mt-3 font-semibold">Check your inbox</h2>
  <p class="mt-1.5 text-sm text-mute">We sent a sign-in link to <span class="text-soft"><?= h($email) ?></span>. It works once and expires in 20 minutes.</p>
  <?php if (!empty($devLink)): ?>
    <a href="<?= h($devLink) ?>" class="mt-4 block break-all rounded-lg border border-dashed border-gold/40 bg-gold/5 p-3 text-left text-xs text-gold" data-testid="dev-link">Email isn't set up yet, so here's the link directly: <?= h($devLink) ?></a>
  <?php endif ?>
</div>
<?php else: ?>
<form method="post" action="/login" class="space-y-3" data-busy="Sending…">
  <?= csrf_field() ?>
  <input type="hidden" name="next" value="<?= h($next ?? '') ?>">
  <input type="hidden" name="invite" value="<?= h($invite ?? '') ?>">
  <label class="sr-only" for="email">Email</label>
  <input id="email" name="email" type="email" required autocomplete="email" placeholder="you@example.com" value="<?= h($email ?? '') ?>" class="field py-3">
  <?php if (!empty($error) && empty($pageError)): ?><p class="text-sm text-danger"><?= h(AUTH_ERRORS[$error] ?? 'Something went wrong.') ?></p><?php endif ?>
  <button class="btn-primary w-full py-3 text-[15px]">Email me a sign-in link</button>
</form>
<?php endif ?>
