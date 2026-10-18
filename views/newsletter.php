<div class="mx-auto max-w-2xl">
  <a href="/newsletter" class="mb-4 inline-block text-sm font-semibold text-mute hover:text-ink">← All editions</a>
  <?php partial('digest_view', ['data' => $data, 'header' =>
      '<div class="flex items-center gap-2 text-xs text-mute">No. ' . (int) $n['edition'] . ' · ' . format_day($n['issue_date'], 'l, F j, Y') . ' ' . ($n['is_sample'] ? sample_badge() : '') . '</div>'
      . '<h1 class="mt-2 font-display text-[30px] leading-none tracking-tight">Worth a Mention</h1><p class="mt-1.5 text-sm font-medium text-gold">Good things. Worth remembering.</p>']) ?>
  <div class="mt-6 flex justify-between text-sm font-semibold">
    <?= $prev ? '<a href="/newsletter/' . h($prev) . '" class="text-mute hover:text-ink">← Older</a>' : '<span></span>' ?>
    <?= $next ? '<a href="/newsletter/' . h($next) . '" class="text-mute hover:text-ink">Newer →</a>' : '<span></span>' ?>
  </div>
</div>
