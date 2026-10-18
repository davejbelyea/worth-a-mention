<?php
/** @var array $data @var string $header */
$recItem = function (array $r) {
    return '<a href="/r/' . h($r['id']) . '" class="flex gap-4 py-4 transition hover:opacity-90">' . cover($r['cover'], $r['emoji'], 'size-16 shrink-0 rounded-xl border border-line sm:size-20 [&_span]:text-3xl')
        . '<div class="min-w-0"><p class="font-bold leading-snug">' . h($r['title']) . '</p>'
        . '<p class="mt-0.5 text-xs text-mute">' . $r['emoji'] . ' ' . h($r['category']) . ($r['place'] ? ' · ' . h($r['place']) : '') . ' · from ' . h(first_name($r['author'])) . (!empty($r['age']) ? ' · ' . h($r['age']) : '') . '</p>'
        . ($r['why'] ? '<p class="mt-1.5 line-clamp-2 text-sm leading-relaxed text-soft">“' . h($r['why']) . '”</p>' : '')
        . '<p class="mt-1 text-xs">' . ($r['avg'] ? '<span class="text-gold">★ ' . number_format($r['avg'], 1) . '</span> <span class="text-mute">(' . $r['ratings'] . ')</span>' : '<span class="text-faint">Not rated yet</span>') . '</p></div></a>';
};
$section = fn(string $title, string $body) => '<section class="border-t border-line px-5 py-6 sm:px-8"><h2 class="mb-1 text-[13px] font-bold uppercase tracking-[0.14em] text-gold">' . $title . '</h2>' . $body . '</section>';
$s = $data['stats'];
?>
<div class="card overflow-hidden">
  <div class="px-5 pb-6 pt-7 sm:px-8">
    <?= $header ?>
    <p class="mt-5 text-[17px] leading-relaxed text-soft"><?= h($data['intro']) ?></p>
    <?php if ($s['recs'] || $s['comments'] || $s['ratings']): ?>
    <div class="mt-5 grid grid-cols-3 gap-2 text-center">
      <?php foreach (['New' => $s['recs'], 'Comments' => $s['comments'], 'Ratings' => $s['ratings']] as $l => $n): ?>
      <div class="rounded-xl bg-raised py-3"><div class="font-display text-2xl tabular-nums"><?= (int) $n ?></div><div class="text-[11px] font-medium text-mute"><?= $l ?></div></div>
      <?php endforeach ?>
    </div>
    <?php endif ?>
  </div>

  <?php if ($data['newRecs']) echo $section('Fresh this week', '<div class="divide-y divide-line">' . implode('', array_map($recItem, $data['newRecs'])) . '</div>'
      . ($data['moreNew'] ? '<a href="/browse?sort=new" class="mt-2 inline-block text-sm font-semibold text-gold">Plus ' . $data['moreNew'] . ' more →</a>' : '')) ?>

  <?php if ($data['talk']) echo $section('Popular discussions', '<div class="divide-y divide-line">' . implode('', array_map(fn($t) =>
      '<a href="/' . ($t['kind'] === 'rec' ? 'r' : 'plans') . '/' . h($t['id']) . '" class="block py-4 transition hover:opacity-90"><p class="font-bold">' . $t['emoji'] . ' ' . h($t['title']) . '</p>'
      . '<p class="mt-0.5 text-xs text-mute">' . plural((int) $t['count'], 'comment') . ' from ' . h(implode(', ', array_map('first_name', $t['people']))) . '</p>'
      . ($t['latest']['body'] ? '<p class="mt-1.5 text-sm text-soft"><span class="font-semibold text-ink">' . h(first_name($t['latest']['name'])) . ':</span> ' . h($t['latest']['body']) . '</p>' : '') . '</a>', $data['talk'])) . '</div>') ?>

  <?php if ($data['rediscover']) echo $section('From the vault', '<p class="text-sm text-mute">Worth a second look, in case it slipped through the cracks.</p>' . $recItem($data['rediscover'])) ?>

  <?php if ($data['plans']) echo $section('Coming up', '<div class="divide-y divide-line">' . implode('', array_map(fn($p) =>
      '<a href="/plans/' . h($p['id']) . '" class="block py-4 transition hover:opacity-90"><p class="font-bold">' . $p['emoji'] . ' ' . h($p['title']) . '</p>'
      . '<p class="mt-0.5 text-xs text-mute">' . ($p['when'] ? h($p['when']) . ' · ' : '') . plural($p['options'], 'option') . ' · ' . $p['voters'] . ' voted</p>'
      . '<p class="mt-1.5 text-sm text-soft">' . ($p['leader'] ? 'In the lead: <span class="font-semibold text-vote">' . h($p['leader']['title']) . '</span> (' . plural($p['leader']['votes'], 'vote') . ')' : 'No votes yet. Go break the tie before there is one.') . '</p></a>', $data['plans'])) . '</div>') ?>

  <?php if ($data['quiet']): ?><div class="border-t border-line px-5 py-6 sm:px-8"><a href="/add" class="btn-primary">Add something in ten seconds</a></div><?php endif ?>

  <div class="border-t border-line px-5 py-6 text-sm text-mute sm:px-8"><?= h($data['signoff']) ?></div>
</div>
