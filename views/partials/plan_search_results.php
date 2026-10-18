<ul>
  <?php foreach ($hits as $r): $on = in_array($r['id'], $existing, true); $place = place_line($r); ?>
  <li>
    <form method="post" action="/plans/<?= h($planId) ?>/add" hx-post="/plans/<?= h($planId) ?>/add" hx-target="#plan" hx-select="#plan" hx-swap="outerHTML">
      <?= csrf_field() ?><input type="hidden" name="rec" value="<?= h($r['id']) ?>">
      <button <?= $on ? 'disabled' : '' ?> class="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-raised disabled:opacity-50">
        <span class="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-raised text-lg">
          <?= $r['cover'] ? '<img src="' . h($r['cover']) . '" alt="" referrerpolicy="no-referrer" class="size-full object-cover">' : $r['cat_emoji'] ?>
        </span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm font-semibold"><?= h($r['title']) ?></span>
          <span class="block truncate text-xs text-mute"><?= $r['cat_emoji'] ?> <?= h($r['cat_name']) ?><?= $place ? ' · ' . h($place) : '' ?></span>
        </span>
        <span class="text-xs font-semibold text-gold"><?= $on ? 'On the list' : 'Add' ?></span>
      </button>
    </form>
  </li>
  <?php endforeach ?>
  <?php if (!$hits): ?><li class="p-3 text-sm text-mute">Nothing found. Add it to the site first, then pop back here.</li><?php endif ?>
</ul>
