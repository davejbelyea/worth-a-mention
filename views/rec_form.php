<?php
$editing = !empty($rec['id']);
$links = array_map(fn($l) => is_array($l) ? $l['url'] : $l, $rec['links'] ?? []);
$catSlug = $rec['cat_slug'] ?? '';
$hasLoc = false;
foreach ($cats as $c) if ($c['slug'] === $catSlug && $c['has_location']) $hasLoc = true;
$showLoc = $hasLoc || !empty($rec['city']) || !empty($rec['place_name']) || !empty($rec['state']) || !empty($rec['address']);
$usState = ($rec['state'] ?? '') ?: ((($rec['country'] ?? '') && $rec['country'] !== 'US') ? 'INTL' : '');
$error ??= '';
$dupe ??= null;
?>
<div class="mx-auto max-w-2xl">
  <?= page_header($editing ? 'Edit' : 'Add a recommendation', $editing ? 'Recommendation' : 'Worth a mention?', $editing ? null : "Just a name is fine. Everything else is optional.") ?>

  <form id="rec-form" method="post" action="<?= $editing ? '/r/' . h($rec['id']) . '/edit' : '/add' ?>" enctype="multipart/form-data" class="space-y-6" data-busy="Saving…" data-editing="<?= $editing ? '1' : '' ?>">
    <?= csrf_field() ?>
    <input type="hidden" name="image_url" value="<?= h($rec['image_url'] ?? '') ?>">
    <input type="hidden" name="site_name" value="<?= h($rec['site_name'] ?? '') ?>">

    <?php if ($dupe): ?>
    <div class="card border-gold/40 bg-gold/[0.06] p-4" data-testid="dupe">
      <p class="font-semibold text-gold">Great minds. This one's already here.</p>
      <p class="mt-1 text-sm text-soft"><?= $dupe['author_name'] ? h(first_name($dupe['author_name'])) . ' added' : 'Someone added' ?> <span class="font-semibold text-ink"><?= h($dupe['title']) ?></span>. Add your rating or a comment there so it all stays in one place.</p>
      <div class="mt-3 flex flex-wrap gap-2">
        <a href="/r/<?= h($dupe['id']) ?>" class="btn-primary">Go to the original</a>
        <button name="force" value="1" class="btn-ghost">It's different, add mine</button>
      </div>
    </div>
    <?php endif ?>

    <div>
      <label class="label" for="url">Got a link? Paste it and we'll fill in the details</label>
      <div class="relative">
        <input id="url" name="url" value="<?= h($rec['url'] ?? '') ?>" inputmode="url" autocomplete="off" placeholder="https://…" class="field pr-24">
        <button type="button" data-fetch class="btn-quiet absolute right-1 top-1/2 h-8 -translate-y-1/2 px-3 text-xs">Fetch</button>
      </div>
      <p class="mt-1.5 hidden text-xs text-mute" data-fetch-note></p>
    </div>

    <div class="relative overflow-hidden rounded-2xl border border-line <?= empty($rec['image_url']) ? 'hidden' : '' ?>" data-image-preview>
      <img src="<?= h($rec['image_url'] ?? '') ?>" alt="" referrerpolicy="no-referrer" class="aspect-[16/9] w-full object-cover">
      <button type="button" data-remove-image class="absolute right-2 top-2 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur">Remove image</button>
    </div>

    <div>
      <label class="label" for="title">What is it?</label>
      <input id="title" name="title" required value="<?= h($rec['title'] ?? '') ?>" placeholder="Neptune Oyster, Slow Horses, that chili crisp…" class="field py-3 text-[17px]" <?= $editing ? '' : 'autofocus' ?>>
      <div class="mt-2 hidden rounded-xl border border-line bg-raised/60 p-3" data-similar></div>
    </div>

    <fieldset>
      <legend class="label">Category</legend>
      <div class="flex flex-wrap gap-2">
        <?php foreach ($cats as $c): ?>
        <label class="cursor-pointer">
          <input type="radio" name="category" value="<?= h($c['slug']) ?>" data-has-location="<?= (int) $c['has_location'] ?>" <?= $c['slug'] === $catSlug ? 'checked' : '' ?> class="peer sr-only">
          <span class="chip peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-ink/20"><?= $c['emoji'] ?> <?= h($c['name']) ?></span>
        </label>
        <?php endforeach ?>
      </div>
    </fieldset>

    <div>
      <label class="label" for="why">Why's it worth a mention?</label>
      <textarea id="why" name="why" rows="3" placeholder="Get the lobster roll, skip the fries. Go on a weeknight." class="field resize-y leading-relaxed"><?= h($rec['why'] ?? '') ?></textarea>
    </div>

    <?php if (!$editing): ?>
    <div>
      <span class="label">Your rating <span class="font-normal text-faint">(optional)</span></span>
      <input type="hidden" name="stars" value="<?= h(post('stars')) ?>">
      <div class="flex gap-1" data-star-picker>
        <?php for ($n = 1; $n <= 5; $n++): ?><button type="button" value="<?= $n ?>" aria-label="<?= plural($n, 'star') ?>" class="text-[28px] leading-none text-faint transition hover:text-mute">★</button><?php endfor ?>
      </div>
    </div>
    <?php endif ?>

    <fieldset class="space-y-3 <?= $showLoc ? '' : 'hidden' ?>" data-location>
      <legend class="label">Where is it?</legend>
      <input name="place_name" value="<?= h($rec['place_name'] ?? '') ?>" placeholder="Place name (if different from the title)" class="field">
      <input name="address" value="<?= h($rec['address'] ?? '') ?>" placeholder="Street address" autocomplete="off" class="field">
      <div class="grid grid-cols-2 gap-3">
        <input name="city" value="<?= h($rec['city'] ?? '') ?>" placeholder="Town or city" class="field">
        <select name="state" class="field" aria-label="State" data-state>
          <option value="">State…</option>
          <optgroup label="New England"><?php foreach (NEW_ENGLAND as $code => $name): ?><option value="<?= $code ?>" <?= $usState === $code ? 'selected' : '' ?>><?= $name ?></option><?php endforeach ?></optgroup>
          <optgroup label="Elsewhere in the US"><?php foreach (OTHER_STATES as $code => $name): ?><option value="<?= $code ?>" <?= $usState === $code ? 'selected' : '' ?>><?= $name ?></option><?php endforeach ?></optgroup>
          <option value="INTL" <?= $usState === 'INTL' ? 'selected' : '' ?>>Outside the US</option>
        </select>
      </div>
      <input name="country" value="<?= h(($rec['country'] ?? '') !== 'US' ? ($rec['country'] ?? '') : '') ?>" placeholder="Country" class="field <?= $usState === 'INTL' ? '' : 'hidden' ?>" data-country>
    </fieldset>

    <details class="group" data-more <?= $editing ? 'open' : '' ?>>
      <summary class="btn-quiet -ml-2 cursor-pointer list-none text-sm group-open:hidden">+ Photos, tags, links<span data-more-loc class="<?= $showLoc ? 'hidden' : '' ?>">, location</span> and more</summary>
      <div class="space-y-6 border-t border-line pt-6">
        <div>
          <span class="label">Photos</span>
          <div class="flex flex-wrap gap-2" data-photos>
            <?php foreach ($rec['photos'] ?? [] as $p): ?>
            <label class="relative cursor-pointer" title="Remove this photo">
              <input type="checkbox" name="remove_photo[]" value="<?= h($p['id']) ?>" class="peer sr-only">
              <img src="/uploads/<?= h($p['file']) ?>" alt="" class="size-20 rounded-xl border border-line object-cover peer-checked:opacity-30">
              <span class="absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full bg-white text-xs shadow ring-1 ring-line peer-checked:bg-danger peer-checked:text-white" aria-label="Remove photo">✕</span>
            </label>
            <?php endforeach ?>
            <label class="flex size-20 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-line-strong text-xs font-semibold text-mute transition hover:border-gold/50 hover:text-gold" data-add-photo>
              <span class="text-xl">＋</span>Add
              <input type="file" name="photos[]" accept="image/*" multiple class="sr-only">
            </label>
          </div>
        </div>

        <div>
          <label class="label" for="description">Description</label>
          <textarea id="description" name="description" rows="2" placeholder="The official blurb, if you want one." class="field resize-y text-sm leading-relaxed"><?= h($rec['description'] ?? '') ?></textarea>
        </div>

        <div>
          <label class="label" for="tags">Tags</label>
          <input id="tags" name="tags" value="<?= h(implode(', ', $rec['tags'] ?? [])) ?>" placeholder="date night, cozy, worth the drive" class="field">
          <p class="mt-1.5 text-xs text-faint">Separate with commas.</p>
        </div>

        <div>
          <span class="label">Other links</span>
          <div class="space-y-2" data-links>
            <?php foreach ($links ?: [''] as $l): ?>
            <div class="flex gap-2"><input name="link[]" value="<?= h($l) ?>" inputmode="url" placeholder="https://…" class="field"><button type="button" class="btn-quiet px-3" data-remove-link aria-label="Remove link">✕</button></div>
            <?php endforeach ?>
            <button type="button" data-add-link class="btn-quiet -ml-2 text-sm">+ Add a link (menu, trailer, reservations…)</button>
          </div>
        </div>
      </div>
    </details>

    <?php if ($error): ?><p class="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger"><?= h($error) ?></p><?php endif ?>

    <div class="sticky bottom-20 z-10 -mx-4 flex gap-3 border-t border-line bg-white/90 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
      <button class="btn-primary flex-1 py-3 text-[15px] md:flex-none md:px-8"><?= $editing ? 'Save changes' : 'Save it' ?></button>
      <a href="<?= $editing ? '/r/' . h($rec['id']) : '/' ?>" class="btn-ghost py-3">Cancel</a>
    </div>
  </form>

  <?php if ($editing): ?>
  <div class="mt-10 border-t border-line pt-6">
    <?= post_button('/r/' . $rec['id'] . '/delete', 'Delete this recommendation', 'btn-danger', [], 'Delete this for everyone? Ratings and comments go with it.') ?>
  </div>
  <?php endif ?>
</div>
