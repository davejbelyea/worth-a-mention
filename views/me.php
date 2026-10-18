<?= page_header(h($me['name']), 'Your profile', plural(count($mine), 'thing') . " you've mentioned") ?>
<div class="grid gap-10 lg:grid-cols-[320px_1fr]">
  <div class="space-y-4">
    <form method="post" action="/me" enctype="multipart/form-data" class="card space-y-5 p-5">
      <?= csrf_field() ?>
      <?php if ($saved): ?><p class="text-sm font-semibold text-gold">Saved.</p><?php endif ?>
      <div class="flex items-center gap-4">
        <?= avatar($me['name'], $me['image'], 56) ?>
        <label class="btn-ghost cursor-pointer text-xs">Change photo<input type="file" name="photo" accept="image/*" class="sr-only" data-photo-name></label>
      </div>
      <div>
        <label class="label" for="name">Name</label>
        <input id="name" name="name" value="<?= h($me['name']) ?>" class="field">
      </div>
      <p class="text-xs text-mute">Signed in as <?= h($me['email']) ?></p>
      <label class="flex items-start gap-3 text-sm">
        <input type="checkbox" name="email_digest" <?= $me['email_digest'] ? 'checked' : '' ?> class="mt-0.5 size-4 accent-[#e5484d]">
        <span>Email me the Thursday newsletter<span class="block text-xs text-mute">It's always in the archive either way.</span></span>
      </label>
      <button class="btn-primary w-full">Save</button>
    </form>
    <form method="post" action="/auth/signout"><?= csrf_field() ?><button class="btn-quiet w-full">Sign out</button></form>
  </div>
  <div>
    <?= $mine ? '<div class="[&>div]:lg:grid-cols-2 [&>div]:xl:grid-cols-3">' . rec_grid($mine) . '</div>' : '<p class="text-sm text-mute">You haven\'t added anything yet. Surely you\'ve eaten somewhere good lately.</p>' ?>
  </div>
</div>
