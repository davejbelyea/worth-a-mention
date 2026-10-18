<?php
$open = array_filter($plans, fn($p) => $p['status'] === 'open');
$done = array_filter($plans, fn($p) => $p['status'] !== 'open');
$card = function (array $p) use ($voters) {
    $vs = array_values(array_filter($voters, fn($v) => $v['plan_id'] === $p['id']));
    ob_start(); ?>
<a href="/plans/<?= h($p['id']) ?>" class="card flex flex-col p-5 transition hover:border-line-strong hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)]">
  <div class="flex items-start justify-between gap-3">
    <span class="flex size-12 items-center justify-center rounded-2xl bg-raised text-2xl"><?= $p['emoji'] ?></span>
    <span class="flex items-center gap-2">
      <?= $p['is_sample'] ? sample_badge() : '' ?>
      <?php if ($p['target_date']): ?><span class="rounded-full border border-line px-2.5 py-1 text-xs font-medium text-soft"><?= format_day($p['target_date']) ?></span><?php endif ?>
    </span>
  </div>
  <h3 class="mt-4 text-lg font-bold tracking-tight"><?= h($p['title']) ?></h3>
  <?php if ($p['decided']): ?><p class="mt-1 text-sm font-medium text-vote">✓ Going with <?= h($p['decided']) ?></p>
  <?php elseif ($p['description']): ?><p class="mt-1 line-clamp-2 text-sm text-mute"><?= h($p['description']) ?></p><?php endif ?>
  <div class="mt-auto flex items-center justify-between pt-5 text-xs text-mute">
    <span><?= plural((int) $p['options'], 'option') ?> · <?= (int) $p['comments'] ?> 💬</span>
    <?= $vs ? avatar_stack($vs, 4, 20) : '<span>No votes yet</span>' ?>
  </div>
</a>
<?php return ob_get_clean();
};
?>
<?= page_header("Let's actually do it", 'Shared plans', 'Pull ideas from the site, vote on what sounds good, and make the call.', '<a href="/plans/new" class="btn-primary">＋ <span class="hidden sm:inline">New plan</span></a>') ?>
<?php if ($open): ?>
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><?= implode('', array_map($card, $open)) ?></div>
<?php else: ?>
  <?= empty_state('🗓️', 'No plans on the go', 'Try “Next Dinner Out” or “Weekend Trip Ideas” and let everyone pile on.', ['/plans/new', 'Start a plan']) ?>
<?php endif ?>
<?php if ($done): ?>
<section class="mt-12">
  <h2 class="eyebrow mb-4">Decided</h2>
  <div class="grid gap-4 opacity-80 sm:grid-cols-2 lg:grid-cols-3"><?= implode('', array_map($card, $done)) ?></div>
</section>
<?php endif ?>
