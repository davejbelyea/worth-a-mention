<?php
$cat = null;
foreach ($cats as $c) if ($c['slug'] === ($sp['category'] ?? '')) $cat = $c;
$keep = fn(string $omit, array $add = []) => http_build_query(array_merge(array_filter($sp, fn($v, $k) => $k !== $omit && $v !== '' && !($k === 'sort' && $v === 'new'), ARRAY_FILTER_USE_BOTH), $add));
$filtered = !empty($sp['q']) || !empty($sp['by']) || !empty($sp['rating']) || !empty($sp['where']) || !empty($sp['tag']);
$sel = fn(string $k, string $v) => ($sp[$k] ?? '') === $v ? ' selected' : '';
$q = $sp['q'] ?? '';
?>
<div class="mb-5">
  <p class="eyebrow mb-1.5"><?= $q ? 'Search' : 'Browse' ?></p>
  <h1 class="font-display text-[26px] leading-[1.05] tracking-tight sm:text-[32px]">
    <?php if ($q): ?>Results for “<?= h($q) ?>”<?php elseif ($cat): ?><?= $cat['emoji'] ?> <?= h($cat['name']) ?><?php elseif (!empty($sp['tag'])): ?>#<?= h($sp['tag']) ?><?php else: ?>Everything worth a mention<?php endif ?>
  </h1>
</div>

<form class="mb-4" action="/browse">
  <?php foreach ($sp as $k => $v) if ($k !== 'q' && $v !== '') echo '<input type="hidden" name="' . h($k) . '" value="' . h($v) . '">' ?>
  <input name="q" value="<?= h($q) ?>" placeholder="Search titles, notes, places, tags, comments…" aria-label="Search" class="field py-3">
</form>

<div class="mb-4"><?= category_bar($cats, $sp['category'] ?? '', $keep('category')) ?></div>

<form action="/browse" class="mb-6 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center" data-autosubmit>
  <?php foreach (['q', 'category', 'tag'] as $k) if (!empty($sp[$k])) echo '<input type="hidden" name="' . $k . '" value="' . h($sp[$k]) . '">' ?>
  <select name="by" class="field h-10 py-0 text-sm sm:w-auto" aria-label="Contributor">
    <option value="">Anyone</option>
    <?php foreach ($people as $p): ?><option value="<?= h($p['id']) ?>"<?= $sel('by', $p['id']) ?>><?= h($p['name']) ?></option><?php endforeach ?>
  </select>
  <select name="rating" class="field h-10 py-0 text-sm sm:w-auto" aria-label="Rating">
    <option value="">Any rating</option>
    <option value="4.5"<?= $sel('rating', '4.5') ?>>★ 4.5 and up</option>
    <option value="4"<?= $sel('rating', '4') ?>>★ 4 and up</option>
    <option value="3"<?= $sel('rating', '3') ?>>★ 3 and up</option>
  </select>
  <select name="where" class="field h-10 py-0 text-sm sm:w-auto" aria-label="Location">
    <option value="">Anywhere</option>
    <option value="ne"<?= $sel('where', 'ne') ?>>All of New England</option>
    <?php foreach (NEW_ENGLAND as $code => $name): ?><option value="<?= $code ?>"<?= $sel('where', $code) ?>><?= $name ?></option><?php endforeach ?>
    <option value="elsewhere"<?= $sel('where', 'elsewhere') ?>>Outside New England</option>
  </select>
  <select name="sort" class="field h-10 py-0 text-sm sm:w-auto" aria-label="Sort">
    <option value="new">Newest</option>
    <option value="top"<?= $sel('sort', 'top') ?>>Highest rated</option>
    <option value="talked"<?= $sel('sort', 'talked') ?>>Most talked about</option>
    <option value="wanted"<?= $sel('sort', 'wanted') ?>>Most wanted</option>
    <option value="old"<?= $sel('sort', 'old') ?>>Oldest first</option>
  </select>
  <noscript><button class="btn-ghost h-10">Apply</button></noscript>
  <?php if ($filtered || !empty($sp['category'])): ?><a href="/browse" class="btn-quiet col-span-2 h-10 text-sm sm:col-span-1">Clear all</a><?php endif ?>
</form>

<?php if ($tags): ?>
<div class="no-scrollbar -mx-4 mb-8 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
  <?php foreach ($tags as $t): $on = ($sp['tag'] ?? '') === $t['tag']; ?>
    <a href="/browse?<?= h($on ? $keep('tag') : $keep('tag', ['tag' => $t['tag']])) ?>" class="whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium transition <?= $on ? 'bg-gold/15 text-gold' : 'text-mute hover:bg-raised hover:text-ink' ?>">#<?= h($t['tag']) ?></a>
  <?php endforeach ?>
</div>
<?php endif ?>

<p class="mb-4 text-sm text-mute"><?= count($recs) >= 120 ? '120+' : count($recs) ?> <?= count($recs) === 1 ? 'recommendation' : 'recommendations' ?></p>
<?php if ($recs): ?>
  <?= rec_grid($recs) ?>
<?php else: ?>
  <?= empty_state('🔍', 'Nothing matches that (yet)', 'Try loosening a filter, or be the first to mention it.', [$q ? '/add?title=' . rawurlencode($q) : '/add', $q ? "Add “{$q}”" : 'Add something']) ?>
<?php endif ?>
