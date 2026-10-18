<div class="mx-auto max-w-2xl">
  <a href="/admin?tab=newsletter" class="mb-4 inline-block text-sm font-semibold text-mute hover:text-ink">← Newsletter settings</a>
  <p class="mb-4 rounded-xl border border-dashed border-line-strong p-3 text-sm text-mute">Preview only. This is what the edition would look like if it went out right now. Subject line: <span class="text-soft"><?= h($p['subject']) ?></span></p>
  <?php partial('digest_view', ['data' => $p['data'], 'header' =>
      '<div class="text-xs text-mute">' . format_day($p['issue_date'], 'l, F j') . '</div><h1 class="mt-2 font-display text-[30px] leading-none tracking-tight">Worth a Mention</h1><p class="mt-1.5 text-sm font-medium text-gold">Good things. Worth remembering.</p>']) ?>
</div>
