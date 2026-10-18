<?php // A button press (rather than signing in on page load) keeps email link scanners from using up the link. ?>
<form method="post" action="/auth/verify" class="card p-6 text-center">
  <?= csrf_field() ?>
  <input type="hidden" name="token" value="<?= h($token) ?>">
  <p class="text-[15px] text-soft">One tap and you're in.</p>
  <button class="btn-primary mt-5 w-full py-3 text-[15px]">Sign me in</button>
</form>
