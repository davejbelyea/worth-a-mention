<?php
$isOpen = $plan['status'] === 'open';
$canManage = $plan['created_by'] === $me['id'] || $me['role'] === 'admin';
$top = ($items && count($items[0]['voters'])) ? $items[0] : null;
$decided = null;
foreach ($items as $it) if ($it['id'] === $plan['decided_item_id']) $decided = $it;
$pid = h($plan['id']);
?>
<div class="mx-auto max-w-3xl" id="plan" hx-target="#plan" hx-select="#plan" hx-swap="outerHTML">
  <div class="mb-4 flex items-center justify-between text-sm">
    <a href="/plans" class="font-semibold text-mute hover:text-ink">← All plans</a>
    <?php if ($canManage): ?><a href="/plans/<?= $pid ?>/edit" class="btn-ghost h-9 px-3 text-sm">Edit</a><?php endif ?>
  </div>

  <header class="mb-8">
    <div class="flex items-center gap-3">
      <span class="flex size-14 items-center justify-center rounded-2xl border border-line bg-surface text-3xl"><?= $plan['emoji'] ?></span>
      <?= $plan['is_sample'] ? sample_badge() : '' ?>
    </div>
    <h1 class="mt-4 font-display text-[30px] leading-[1.02] tracking-tight sm:text-[38px]"><?= h($plan['title']) ?></h1>
    <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-mute">
      <?php if ($plan['target_date']): ?><span>🗓️ <?= format_day($plan['target_date'], 'l, F j') ?></span><?php endif ?>
      <span class="flex items-center gap-1.5"><?= avatar($plan['creator'], $plan['creator_image'], 18) ?> Started by <?= h(first_name($plan['creator']) ?: 'someone') ?></span>
      <span><?= $voterCount ?> <?= $voterCount === 1 ? 'person has' : 'people have' ?> voted</span>
    </div>
    <?php if ($plan['description']): ?><p class="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-soft"><?= h($plan['description']) ?></p><?php endif ?>
  </header>

  <?php if ($decided): ?>
  <div class="card mb-6 flex flex-wrap items-center justify-between gap-3 border-vote/40 bg-vote/[0.07] p-4">
    <p class="text-sm"><span class="font-bold text-vote">✓ It's decided:</span> <a href="/r/<?= h($decided['rec_id']) ?>" class="font-semibold hover:underline"><?= h($decided['title']) ?></a></p>
    <form method="post" action="/plans/<?= $pid ?>/decide" hx-post="/plans/<?= $pid ?>/decide"><?= csrf_field() ?><button class="btn-quiet h-8 px-3 text-xs">Reopen voting</button></form>
  </div>
  <?php endif ?>

  <section>
    <div class="mb-3 flex items-end justify-between gap-3">
      <h2 class="text-lg font-bold tracking-tight">The options</h2>
      <p class="text-right text-xs text-mute"><span class="font-semibold text-vote">Votes</span> pick what we do.<br class="sm:hidden"> <span class="font-semibold text-gold">★ Stars</span> are how good it is.</p>
    </div>
    <?php if ($isOpen): ?><p class="mb-4 text-sm text-mute">Vote for every option you'd be happy with. Tap again to take your vote back.</p><?php endif ?>

    <div class="card divide-y divide-line">
      <?php foreach ($items as $i => $it): $voted = in_array($me['id'], array_column($it['voters'], 'user_id'), true); $place = place_line($it); ?>
      <div class="flex items-center gap-3 p-3.5 sm:gap-4 sm:p-4 <?= $decided && $decided['id'] === $it['id'] ? 'bg-vote/[0.05]' : '' ?>" data-option>
        <span class="w-5 text-center text-sm font-semibold tabular-nums <?= $i === 0 && $top ? 'text-vote' : 'text-faint' ?>"><?= $i + 1 ?></span>
        <a href="/r/<?= h($it['rec_id']) ?>" class="shrink-0"><?= cover($it['cover'], $it['emoji'], 'size-14 rounded-xl border border-line [&_span]:text-2xl') ?></a>
        <div class="min-w-0 flex-1">
          <a href="/r/<?= h($it['rec_id']) ?>" class="line-clamp-1 font-semibold hover:text-gold"><?= h($it['title']) ?></a>
          <p class="truncate text-xs text-mute"><?= $it['emoji'] ?> <?= h($it['category']) ?><?= $place ? ' · ' . h($place) : '' ?></p>
          <div class="mt-1 flex items-center gap-3">
            <?= stars_display($it['avg'] !== null ? (float) $it['avg'] : null, (int) $it['ratings']) ?>
            <span class="hidden text-[11px] text-faint sm:inline">added by <?= h(first_name($it['adder'])) ?></span>
            <?php if (($it['added_by'] === $me['id'] || $canManage) && $isOpen): ?>
              <form method="post" action="/items/<?= h($it['id']) ?>/remove" hx-post="/items/<?= h($it['id']) ?>/remove" data-confirm="Take this option off the list?"><?= csrf_field() ?><button class="text-xs text-faint hover:text-danger">Remove</button></form>
            <?php endif ?>
            <?php if ($isOpen && $top && $top['id'] === $it['id']): ?>
              <form method="post" action="/plans/<?= $pid ?>/decide" hx-post="/plans/<?= $pid ?>/decide"><?= csrf_field() ?><input type="hidden" name="item" value="<?= h($it['id']) ?>"><button class="btn-ghost h-7 whitespace-nowrap px-2.5 text-xs">Lock it in</button></form>
            <?php endif ?>
          </div>
        </div>
        <div class="flex items-center gap-2.5">
          <?php if ($it['voters']): ?><span class="hidden sm:inline-flex"><?= avatar_stack($it['voters'], 4, 22) ?></span><?php endif ?>
          <form method="post" action="/items/<?= h($it['id']) ?>/vote" hx-post="/items/<?= h($it['id']) ?>/vote"><?= csrf_field() ?>
            <button <?= $isOpen ? '' : 'disabled' ?> aria-pressed="<?= $voted ? 'true' : 'false' ?>" data-testid="vote"
              class="inline-flex h-9 min-w-[76px] items-center justify-center gap-1.5 rounded-full border px-3 text-sm font-semibold tabular-nums transition active:scale-95 disabled:opacity-60 <?= $voted ? 'border-vote/60 bg-vote/15 text-vote' : 'border-line bg-raised text-soft hover:border-vote/40 hover:text-vote' ?>">
              <span aria-hidden="true"><?= $voted ? '✓' : '＋' ?></span><span><?= count($it['voters']) ?></span><span class="sr-only"><?= $voted ? 'Remove your vote' : 'Vote for this' ?></span>
            </button>
          </form>
        </div>
      </div>
      <?php endforeach ?>
      <?php if (!$items): ?><p class="p-5 text-sm text-mute">No options yet. Add a few from the site and let the voting begin.</p><?php endif ?>
    </div>

    <?php if ($isOpen): ?>
    <details class="mt-3" id="add-option">
      <summary class="btn-ghost w-full cursor-pointer list-none py-3">＋ Add an option from the site</summary>
      <div class="card mt-2 p-3">
        <input type="search" name="q" placeholder="Search recommendations…" aria-label="Search recommendations to add" class="field"
          hx-get="/api/plan-search/<?= $pid ?>" hx-trigger="input changed delay:250ms, toggle from:closest details" hx-target="#plan-hits" hx-select="unset" hx-swap="innerHTML">
        <div id="plan-hits" class="mt-2 max-h-80 overflow-y-auto"><?php partial('plan_search_results', ['planId' => $plan['id'], 'hits' => list_recs(['limit' => 12]), 'existing' => array_column($items, 'rec_id')]) ?></div>
      </div>
    </details>
    <?php endif ?>
  </section>

  <section id="discussion" class="mt-12 scroll-mt-24">
    <h2 class="mb-5 text-lg font-bold tracking-tight">Discussion <span class="text-mute"><?= count($comments) ?: '' ?></span></h2>
    <?php if (!$comments): ?><p class="mb-4 text-sm text-mute">Hash it out here. Who's driving, who's booking, who vetoed sushi again.</p><?php endif ?>
    <ul class="space-y-5">
      <?php foreach ($comments as $c): ?>
      <li class="flex gap-3">
        <?= avatar($c['name'], $c['image'], 32) ?>
        <div class="min-w-0 flex-1">
          <p class="text-sm"><span class="font-semibold"><?= h($c['name'] ?: 'Former member') ?></span><span class="ml-2 text-xs text-faint"><?= time_ago($c['created_at']) ?></span></p>
          <p class="mt-1 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-soft"><?= linkify($c['body']) ?></p>
          <?php if ($c['user_id'] === $me['id'] || $me['role'] === 'admin'): ?>
            <form method="post" action="/plan-comments/<?= h($c['id']) ?>/delete" hx-post="/plan-comments/<?= h($c['id']) ?>/delete" data-confirm="Delete this comment?"><?= csrf_field() ?><button class="mt-1 text-xs text-faint hover:text-danger">Delete</button></form>
          <?php endif ?>
        </div>
      </li>
      <?php endforeach ?>
    </ul>
    <form method="post" action="/plans/<?= $pid ?>/comment" hx-post="/plans/<?= $pid ?>/comment" class="mt-6 flex items-end gap-3">
      <?= csrf_field() ?>
      <textarea name="body" rows="1" required placeholder="Say something about the plan…" aria-label="Comment on this plan" data-submit-on-cmd-enter class="field min-h-[46px] flex-1 resize-y text-[15px]"></textarea>
      <button class="btn-primary h-[46px]">Post</button>
    </form>
  </section>
</div>
