<?php
$h = (int) ny()->format('G');
$part = $h < 5 ? 'Up late' : ($h < 12 ? 'Morning' : ($h < 17 ? 'Afternoon' : 'Evening'));
$subs = ["Here's what the group has been talking up.", 'The good stuff, minus the "wait, what was it called?"', "Everything your friends swore you'd love.", 'Fresh finds from people with taste (allegedly).'];
?>
<?php if ($welcome): ?>
<div class="card mb-6 border-gold/30 bg-gold/[0.06] p-5">
  <p class="font-semibold text-gold">Welcome in, <?= h(first_name($me['name'])) ?>. 🎉</p>
  <p class="mt-1 text-sm text-soft">Poke around, rate a few things you've tried, and add the next thing you can't stop talking about. A name is enough to save it. You can update your name and photo on <a href="/me" class="text-gold">your profile</a>.</p>
</div>
<?php endif ?>
<div class="mb-6">
  <h1 class="font-display text-[30px] leading-[1.05] tracking-tight sm:text-[36px]"><?= $part ?>, <?= h(first_name($me['name'])) ?>.</h1>
  <p class="mt-2 text-[15px] text-mute"><?= h($subs[(int) date('j') % count($subs)]) ?></p>
</div>

<form action="/browse" class="mb-5 lg:hidden"><input name="q" placeholder="Search restaurants, shows, recipes…" aria-label="Search" class="field py-3"></form>

<div class="mb-8"><?= category_bar($cats) ?></div>

<?php if ($total === 0): ?>
  <?= empty_state('🌱', 'Nothing here yet', 'Be the one who finally writes down that restaurant everyone keeps mentioning.', ['/add', 'Add the first one']) ?>
<?php else: ?>
<div class="grid gap-10 lg:grid-cols-[1fr_320px]">
  <section>
    <div class="mb-4 flex items-baseline justify-between">
      <h2 class="text-lg font-bold tracking-tight">Fresh mentions</h2>
      <a href="/browse" class="text-sm font-semibold text-mute hover:text-gold">See all →</a>
    </div>
    <?= rec_grid($fresh) ?>
  </section>

  <aside class="space-y-8">
    <?php if ($latest): ?>
    <a href="/newsletter/<?= h($latest['id']) ?>" class="card block p-4 transition hover:border-line-strong">
      <p class="eyebrow text-gold">The Thursday edition</p>
      <p class="mt-2 font-display text-xl leading-tight"><?= format_day($latest['issue_date'], 'F j') ?></p>
      <p class="mt-1 line-clamp-2 text-sm text-mute"><?= h(preg_replace('/^Worth a Mention · [^:]+: /u', '', $latest['subject'])) ?></p>
    </a>
    <?php endif ?>

    <section>
      <div class="mb-2 flex items-baseline justify-between">
        <h2 class="font-bold tracking-tight">Coming up</h2>
        <a href="/plans" class="text-sm font-semibold text-mute hover:text-gold">Plans →</a>
      </div>
      <?php if ($plans): ?>
      <div class="card divide-y divide-line">
        <?php foreach ($plans as $p): ?>
        <a href="/plans/<?= h($p['id']) ?>" class="flex items-center gap-3 p-3.5 transition hover:bg-raised/60">
          <span class="flex size-10 items-center justify-center rounded-xl bg-raised text-xl"><?= $p['emoji'] ?></span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-semibold"><?= h($p['title']) ?></span>
            <span class="text-xs text-mute"><?= $p['target_date'] ? format_day($p['target_date']) : 'No date yet' ?> · <?= plural((int) $p['options'], 'option') ?></span>
          </span>
          <?= $p['is_sample'] ? sample_badge() : '' ?>
        </a>
        <?php endforeach ?>
      </div>
      <?php else: ?>
      <p class="text-sm text-mute">No plans brewing. <a href="/plans/new" class="text-gold">Start one</a>.</p>
      <?php endif ?>
    </section>

    <?php if ($talk): ?>
    <section>
      <h2 class="mb-2 font-bold tracking-tight">Overheard</h2>
      <div class="space-y-3">
        <?php foreach ($talk as $c): ?>
        <a href="/r/<?= h($c['rec_id']) ?>#comments" class="-mx-2 flex gap-3 rounded-xl p-2 transition hover:bg-raised/60">
          <?= avatar($c['name'], $c['image'], 28) ?>
          <span class="min-w-0 text-sm">
            <span class="text-soft"><span class="font-semibold text-ink"><?= h(first_name($c['name'])) ?></span> on <span class="text-ink"><?= h($c['title']) ?></span></span>
            <span class="mt-0.5 line-clamp-2 block text-mute"><?= h(snippet($c['body'], 110)) ?></span>
            <span class="text-[11px] text-faint"><?= time_ago($c['created_at']) ?></span>
          </span>
        </a>
        <?php endforeach ?>
      </div>
    </section>
    <?php endif ?>

    <?php if ($wanted): ?>
    <section>
      <h2 class="mb-1 font-bold tracking-tight">Everyone wants to try</h2>
      <div class="divide-y divide-line">
        <?php foreach ($wanted as $r) echo rec_row($r, '<span class="text-xs text-mute">🙋 ' . $r['interest_count'] . '</span>') ?>
      </div>
    </section>
    <?php endif ?>
  </aside>
</div>
<?php endif ?>
