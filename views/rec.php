<?php
$mine = 0;
foreach ($rec['ratings'] as $r) if ($r['user_id'] === $me['id']) $mine = (int) $r['stars'];
$place = place_line($rec);
$map = ($rec['place_name'] || $rec['address'] || $rec['city']) ? map_link($rec) : null;
$canEdit = $rec['created_by'] === $me['id'] || $me['role'] === 'admin';
$hero = $rec['image_url'] ?: ($rec['photos'] ? '/uploads/' . $rec['photos'][0]['file'] : null);
$gallery = $rec['image_url'] ? $rec['photos'] : array_slice($rec['photos'], 1);
$labels = ['', 'Not for me', "It's fine", 'Pretty good', 'Really good', 'Obsessed'];
$wantIt = in_array($me['id'], array_column($rec['interested'], 'user_id'), true);
$inPlans = array_column($rec['plans'], 'id');
$swap = 'hx-target="#rec-side" hx-select="#rec-side" hx-swap="outerHTML"';
?>
<article>
  <?php if ($added): ?>
  <div class="card mb-6 border-gold/30 bg-gold/[0.06] p-4 text-sm">
    <span class="font-semibold text-gold">Saved. </span><span class="text-soft">The group will see it in the feed and in Thursday's newsletter.</span>
  </div>
  <?php endif ?>

  <div class="mb-4 flex items-center justify-between text-sm">
    <a href="<?= $rec['cat_slug'] ? '/browse?category=' . h($rec['cat_slug']) : '/browse' ?>" class="font-semibold text-mute hover:text-ink">← <?= $rec['cat_emoji'] ?> <?= h($rec['cat_name'] ?: 'Browse') ?></a>
    <?php if ($canEdit): ?><a href="/r/<?= h($rec['id']) ?>/edit" class="btn-ghost h-9 px-3 text-sm">Edit</a><?php endif ?>
  </div>

  <div class="grid gap-8 lg:grid-cols-[1fr_340px] lg:grid-rows-[auto_1fr] lg:gap-x-10">
    <div class="min-w-0 lg:col-start-1">
      <?php if ($hero): ?><div class="mb-6 overflow-hidden rounded-3xl"><?= cover($hero, $rec['cat_emoji'], 'aspect-[16/9] w-full') ?></div><?php endif ?>
      <div class="flex flex-wrap items-center gap-2">
        <span class="chip pointer-events-none"><?= $rec['cat_emoji'] ?> <?= h($rec['cat_name'] ?: 'Other') ?></span>
        <?= $rec['is_sample'] ? sample_badge() : '' ?>
      </div>
      <h1 class="mt-3 font-display text-[30px] leading-[1.02] tracking-tight sm:text-[38px]"><?= h($rec['title']) ?></h1>
      <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-mute">
        <?php if ($place || $map): $label = ($rec['place_name'] && $rec['place_name'] !== $rec['title'] ? $rec['place_name'] . ($place ? ', ' : '') : '') . $place; ?>
          <?php if ($map): ?><a href="<?= h($map) ?>" target="_blank" rel="noreferrer" class="hover:text-gold">📍 <?= h($label ?: 'Open in Maps') ?> ↗</a><?php else: ?><span>📍 <?= h($label) ?></span><?php endif ?>
        <?php endif ?>
        <?php if ($rec['url']): ?><a href="<?= h($rec['url']) ?>" target="_blank" rel="noreferrer" class="hover:text-gold">🔗 <?= h($rec['site_name'] ?: host_of($rec['url'])) ?> ↗</a><?php endif ?>
      </div>

      <div class="card mt-6 p-5">
        <div class="flex items-center gap-3">
          <?= avatar($rec['author_name'], $rec['author_image'], 36) ?>
          <div class="text-sm">
            <p><span class="font-semibold"><?= h($rec['author_name'] ?: 'A former member') ?></span> <span class="text-mute">mentioned this</span></p>
            <p class="text-xs text-faint"><?= format_date($rec['created_at']) ?></p>
          </div>
        </div>
        <?php if ($rec['why']): ?>
          <p class="mt-4 whitespace-pre-wrap text-[19px] font-medium leading-relaxed text-ink">“<?= h($rec['why']) ?>”</p>
        <?php else: ?>
          <p class="mt-4 text-sm text-mute">No notes, just a strong hunch it's worth your time.</p>
        <?php endif ?>
      </div>
    </div>

    <aside class="lg:col-start-2 lg:row-span-2 lg:row-start-1">
      <div id="rec-side" class="space-y-4 lg:sticky lg:top-24">
        <div class="card p-5">
          <p class="eyebrow">Group rating</p>
          <div class="mt-3 flex items-center gap-5">
            <div>
              <div class="font-display text-[48px] leading-none tabular-nums" data-testid="avg"><?= $rec['avg_rating'] ? number_format($rec['avg_rating'], 1) : '–' ?></div>
              <div class="mt-1 text-xs text-mute"><?= plural($rec['rating_count'], 'rating') ?></div>
            </div>
            <div class="flex-1 space-y-1">
              <?php for ($s = 5; $s >= 1; $s--): $n = count(array_filter($rec['ratings'], fn($r) => (int) $r['stars'] === $s)); ?>
              <div class="flex items-center gap-2 text-[11px] text-mute">
                <span class="w-3 tabular-nums"><?= $s ?></span>
                <span class="h-1.5 flex-1 overflow-hidden rounded-full bg-raised"><span class="block h-full rounded-full bg-gold" style="width:<?= $rec['rating_count'] ? round($n / $rec['rating_count'] * 100) : 0 ?>%"></span></span>
              </div>
              <?php endfor ?>
            </div>
          </div>
          <form method="post" action="/r/<?= h($rec['id']) ?>/rate" hx-post="/r/<?= h($rec['id']) ?>/rate" <?= $swap ?> class="mt-5 border-t border-line pt-4">
            <?= csrf_field() ?>
            <p class="mb-2 text-sm font-semibold">Your rating</p>
            <div class="stars flex items-center gap-1" role="radiogroup" aria-label="Your rating">
              <?php for ($n = 1; $n <= 5; $n++): ?>
                <button name="stars" value="<?= $n ?>" role="radio" aria-checked="<?= $mine === $n ? 'true' : 'false' ?>" aria-label="<?= plural($n, 'star') ?>" data-label="<?= h($labels[$n]) ?>"
                  class="text-[30px] leading-none transition active:scale-90 <?= $n <= $mine ? 'text-gold' : 'text-faint' ?>">★</button>
              <?php endfor ?>
            </div>
            <p class="mt-1 h-4 text-xs text-mute" data-stars-label data-default="<?= h($mine ? $labels[$mine] . ' · tap again to clear' : 'Tap to rate') ?>"><?= h($mine ? $labels[$mine] . ' · tap again to clear' : 'Tap to rate') ?></p>
          </form>
          <?php if ($rec['ratings']): ?>
          <ul class="mt-4 space-y-2 border-t border-line pt-4">
            <?php foreach ($rec['ratings'] as $r): ?>
            <li class="flex items-center justify-between text-sm">
              <span class="flex items-center gap-2"><?= avatar($r['name'], $r['image'], 22) ?><?= h(first_name($r['name'])) ?></span>
              <span class="tracking-tight text-gold"><?= str_repeat('★', (int) $r['stars']) ?><span class="text-faint"><?= str_repeat('★', 5 - (int) $r['stars']) ?></span></span>
            </li>
            <?php endforeach ?>
          </ul>
          <?php endif ?>
        </div>

        <div class="card p-5">
          <p class="eyebrow mb-3">Want to try</p>
          <form method="post" action="/r/<?= h($rec['id']) ?>/interest" hx-post="/r/<?= h($rec['id']) ?>/interest" <?= $swap ?>>
            <?= csrf_field() ?>
            <button aria-pressed="<?= $wantIt ? 'true' : 'false' ?>" class="btn w-full border py-2.5 font-semibold <?= $wantIt ? 'border-gold/50 bg-gold/10 text-gold' : 'border-line bg-raised text-ink hover:bg-hover' ?>"><?= $wantIt ? '🙋 You want to try this' : '🙋 I want to try this' ?></button>
          </form>
          <?php if ($rec['interested']): ?>
          <div class="mt-3 flex flex-wrap gap-x-3 gap-y-2">
            <?php foreach ($rec['interested'] as $p): ?><span class="flex items-center gap-1.5 text-xs text-soft"><?= avatar($p['name'], $p['image'], 20) ?><?= h(first_name($p['name'])) ?></span><?php endforeach ?>
          </div>
          <?php endif ?>
        </div>

        <div class="card p-5">
          <p class="eyebrow mb-3">Plans</p>
          <?php if ($rec['plans']): ?>
          <ul class="mb-3 space-y-1.5">
            <?php foreach ($rec['plans'] as $p): ?><li><a href="/plans/<?= h($p['id']) ?>" class="text-sm font-medium hover:text-gold"><?= $p['emoji'] ?> <?= h($p['title']) ?></a></li><?php endforeach ?>
          </ul>
          <?php endif ?>
          <details class="relative">
            <summary class="btn-ghost w-full cursor-pointer list-none">🗓️ Add to a plan</summary>
            <div class="card absolute inset-x-0 top-full z-20 mt-2 overflow-hidden p-1.5 shadow-2xl shadow-black/15">
              <?php foreach ($openPlans as $p): $on = in_array($p['id'], $inPlans, true); ?>
                <form method="post" action="/plans/<?= h($p['id']) ?>/add" hx-post="/plans/<?= h($p['id']) ?>/add" hx-target="#rec-side" hx-select="#rec-side" hx-swap="outerHTML">
                  <?= csrf_field() ?><input type="hidden" name="rec" value="<?= h($rec['id']) ?>"><input type="hidden" name="from" value="rec">
                  <button <?= $on ? 'disabled' : '' ?> class="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-raised disabled:opacity-60">
                    <span class="truncate"><?= $p['emoji'] ?> <?= h($p['title']) ?></span><span class="text-xs text-mute"><?= $on ? 'Added ✓' : 'Add' ?></span>
                  </button>
                </form>
              <?php endforeach ?>
              <a href="/plans/new?rec=<?= h($rec['id']) ?>" class="block rounded-lg px-3 py-2.5 text-sm font-semibold text-gold hover:bg-raised">+ Start a new plan with this</a>
            </div>
          </details>
        </div>
      </div>
    </aside>

    <div class="min-w-0 lg:col-start-1">
      <section id="photos" class="mb-8 scroll-mt-24">
        <h2 class="eyebrow mb-3">Photos</h2>
        <?php if ($photoError): ?><p class="mb-3 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger"><?= $photoError === 1 ? "That photo didn't upload." : "$photoError photos didn't upload." ?> Photos need to be JPG, PNG, WebP or GIF and under 20 MB. A screenshot of the photo works too.</p><?php endif ?>
        <?php if ($photosAdded): ?><p class="mb-3 text-sm font-semibold text-vote">✓ <?= $photosAdded === 1 ? 'Photo added.' : "$photosAdded photos added." ?></p><?php endif ?>
        <div class="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0">
          <?php foreach ($gallery as $p): ?>
            <div class="relative shrink-0">
              <a href="/uploads/<?= h($p['file']) ?>" target="_blank" rel="noreferrer"><img src="/uploads/<?= h($p['file']) ?>" alt="" class="aspect-square w-40 rounded-2xl border border-line object-cover sm:w-full"></a>
              <?php if ($p['added_by'] === $me['id'] || $canEdit): ?>
                <form method="post" action="/photos/<?= h($p['id']) ?>/delete" data-confirm="Remove this photo?" class="absolute right-2 top-2"><?= csrf_field() ?><button class="flex size-7 items-center justify-center rounded-full bg-white/90 text-xs shadow ring-1 ring-line hover:text-danger" aria-label="Remove photo">✕</button></form>
              <?php endif ?>
            </div>
          <?php endforeach ?>
          <form method="post" action="/r/<?= h($rec['id']) ?>/photos" enctype="multipart/form-data" data-photo-upload class="shrink-0">
            <?= csrf_field() ?>
            <label class="flex aspect-square w-40 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-line-strong text-sm font-semibold text-mute transition hover:border-gold/50 hover:text-gold sm:w-full">
              <span class="text-2xl">＋</span><span data-upload-label>Add photos</span>
              <input type="file" name="photos[]" accept="image/*" multiple class="sr-only">
            </label>
            <noscript><button class="btn-ghost mt-2 w-full text-xs">Upload</button></noscript>
          </form>
        </div>
      </section>

      <?php if ($rec['description'] || $rec['tags'] || $rec['links']): ?>
      <section class="mb-8 space-y-4">
        <?php if ($rec['description']): ?><p class="text-[15px] leading-relaxed text-soft"><?= h($rec['description']) ?></p><?php endif ?>
        <?php if ($rec['links']): ?>
        <div class="flex flex-wrap gap-2"><?php foreach ($rec['links'] as $l): ?><a href="<?= h($l['url']) ?>" target="_blank" rel="noreferrer" class="chip">🔗 <?= h(host_of($l['url'])) ?> ↗</a><?php endforeach ?></div>
        <?php endif ?>
        <?php if ($rec['tags']): ?>
        <div class="flex flex-wrap gap-1.5"><?php foreach ($rec['tags'] as $t): ?><a href="/browse?tag=<?= rawurlencode($t) ?>" class="rounded-full bg-raised px-2.5 py-1 text-xs font-medium text-mute hover:text-gold">#<?= h($t) ?></a><?php endforeach ?></div>
        <?php endif ?>
      </section>
      <?php endif ?>

      <section id="comments" class="scroll-mt-24" hx-target="#comments" hx-select="#comments" hx-swap="outerHTML">
        <h2 class="mb-5 text-lg font-bold tracking-tight">Comments <span class="text-mute"><?= count($rec['comments']) ?: '' ?></span></h2>
        <?php if (!$rec['comments']): ?><p class="mb-4 text-sm text-mute">No comments yet. Been? Going? Have opinions? Start it off.</p><?php endif ?>
        <ul class="space-y-5">
          <?php foreach ($rec['comments'] as $c): $mineC = $c['user_id'] === $me['id']; ?>
          <li class="flex gap-3">
            <?= avatar($c['name'], $c['image'], 32) ?>
            <div class="min-w-0 flex-1">
              <p class="text-sm"><span class="font-semibold"><?= h($c['name'] ?: 'Former member') ?></span><span class="ml-2 text-xs text-faint"><?= time_ago($c['created_at']) ?><?= $c['edited_at'] ? ' · edited' : '' ?></span></p>
              <p class="mt-1 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-soft"><?= linkify($c['body']) ?></p>
              <?php if ($mineC || $me['role'] === 'admin'): ?>
              <div class="mt-1 flex items-start gap-3 text-xs text-faint">
                <?php if ($mineC): ?>
                <details class="group">
                  <summary class="cursor-pointer list-none hover:text-ink group-open:hidden">Edit</summary>
                  <form method="post" action="/comments/<?= h($c['id']) ?>/edit" hx-post="/comments/<?= h($c['id']) ?>/edit" class="mt-1.5 w-[min(36rem,80vw)]">
                    <?= csrf_field() ?>
                    <textarea name="body" rows="3" class="field text-sm"><?= h($c['body']) ?></textarea>
                    <div class="mt-2 flex gap-2"><button class="btn-primary h-8 px-3 text-xs">Save</button></div>
                  </form>
                </details>
                <?php endif ?>
                <form method="post" action="/comments/<?= h($c['id']) ?>/delete" hx-post="/comments/<?= h($c['id']) ?>/delete" data-confirm="Delete this comment?"><?= csrf_field() ?><button class="hover:text-danger">Delete</button></form>
              </div>
              <?php endif ?>
            </div>
          </li>
          <?php endforeach ?>
        </ul>
        <form method="post" action="/r/<?= h($rec['id']) ?>/comment" hx-post="/r/<?= h($rec['id']) ?>/comment" class="mt-6 flex items-end gap-3">
          <?= csrf_field() ?>
          <?= avatar($me['name'], $me['image'], 32, 'mb-1 hidden sm:inline-flex') ?>
          <textarea name="body" rows="1" required placeholder="Add a comment…" aria-label="Add a comment" data-submit-on-cmd-enter class="field min-h-[46px] flex-1 resize-y text-[15px]"></textarea>
          <button class="btn-primary h-[46px]">Post</button>
        </form>
      </section>
    </div>
  </div>
</article>
