<?php $enabled = setting('digest_enabled') === '1'; ?>
<div class="mx-auto max-w-3xl">
  <?= page_header('The Thursday edition', 'The archive', $enabled ? 'A quick roundup of the week, in your inbox every Thursday at ' . format_time12(setting('digest_time') ?: '08:00') . ' Eastern.' : 'The weekly email is paused for now. Past editions live here.') ?>
  <?php if ($issues): ?>
  <div class="card divide-y divide-line">
    <?php foreach ($issues as $n): $d = json_decode($n['data'], true); ?>
    <a href="/newsletter/<?= h($n['id']) ?>" class="flex items-center gap-4 p-4 transition hover:bg-raised/50 sm:p-5">
      <div class="w-14 shrink-0 text-center">
        <div class="text-[11px] font-semibold uppercase tracking-wider text-gold"><?= format_day($n['issue_date'], 'M') ?></div>
        <div class="font-display text-3xl leading-none"><?= format_day($n['issue_date'], 'j') ?></div>
      </div>
      <div class="min-w-0 flex-1">
        <p class="truncate font-semibold"><?= h(preg_replace('/^Worth a Mention · [^:]+: /u', '', $n['subject'])) ?></p>
        <p class="mt-0.5 text-xs text-mute">No. <?= (int) $n['edition'] ?><?= $d ? ' · ' . $d['stats']['recs'] . ' new · ' . $d['stats']['comments'] . ' comments' : '' ?></p>
      </div>
      <?= $n['is_sample'] ? sample_badge() : '<span class="text-mute">→</span>' ?>
    </a>
    <?php endforeach ?>
  </div>
  <?php else: ?>
    <?= empty_state('📮', 'The first edition is on its way', 'Come Thursday, this is where every edition will live.') ?>
  <?php endif ?>
</div>
