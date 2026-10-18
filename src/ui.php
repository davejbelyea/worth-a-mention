<?php
// Small bits of markup reused across pages.

function icon(string $d, string $class = 'size-[22px]', string $width = '1.7'): string {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' . $width . '" stroke-linecap="round" stroke-linejoin="round" class="' . $class . '" aria-hidden="true"><path d="' . $d . '"/></svg>';
}

const ICONS = [
    'home' => 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
    'search' => 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm9 16-4-4',
    'plans' => 'M8 3v3m8-3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm4 8 2 2 4-4',
    'mail' => 'M4 6h16v12H4zM4 6l8 6 8-6',
    'gear' => 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14.5 3h-4l-.4 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z',
    'menu' => 'M4 7h16M4 12h16M4 17h16',
    'plus' => 'M12 5v14M5 12h14',
    'pin' => 'M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21zm0-9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
    'link' => 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
];

function logo(string $class = 'size-6'): string {
    return '<svg viewBox="16 18 36 34" class="' . $class . '" aria-hidden="true"><path d="M20 22h24a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4H31l-8 6v-6h-3a4 4 0 0 1-4-4V26a4 4 0 0 1 4-4z" fill="none" stroke="#e5484d" stroke-width="2.6" stroke-linejoin="round"/><path d="M32 27.5l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z" fill="#e5484d"/></svg>';
}

function avatar(?string $name, ?string $image, int $size = 28, string $class = ''): string {
    $n = $name ?: '?';
    $style = "width:{$size}px;height:{$size}px;font-size:" . max(10, (int) round($size * 0.38)) . 'px;';
    if ($image) return '<img src="' . h($image) . '" alt="' . h($n) . '" title="' . h($n) . '" style="' . $style . '" referrerpolicy="no-referrer" class="shrink-0 rounded-full object-cover ' . $class . '">';
    $initials = mb_strtoupper(implode('', array_map(fn($p) => mb_substr($p, 0, 1), array_slice(preg_split('/\s+/', trim($n)), 0, 2))));
    $hu = hue($n);
    return '<span title="' . h($n) . '" style="' . $style . "background:hsl($hu 75% 90%);color:hsl($hu 45% 32%);" . '" class="inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold ' . $class . '">' . h($initials) . '</span>';
}

function avatar_stack(array $people, int $max = 5, int $size = 24): string {
    $out = '<span class="inline-flex items-center">';
    foreach (array_slice($people, 0, $max) as $i => $p) $out .= avatar($p['name'], $p['image'] ?? null, $size, ($i ? '-ml-1.5 ' : '') . 'ring-2 ring-white');
    if (count($people) > $max) $out .= '<span class="ml-1.5 text-xs text-mute">+' . (count($people) - $max) . '</span>';
    return $out . '</span>';
}

function stars_display(?float $value, ?int $count = null, string $size = 'sm'): string {
    $t = $size === 'md' ? 'text-sm' : 'text-xs';
    if (!$value) return '<span class="' . $t . ' text-faint">No ratings yet</span>';
    return '<span class="inline-flex items-center gap-1 ' . $t . '"><span class="text-gold">★</span><span class="font-semibold tabular-nums text-ink">' . number_format($value, 1) . '</span>'
        . ($count !== null ? '<span class="text-mute">(' . $count . ')</span>' : '') . '</span>';
}

function sample_badge(string $class = ''): string {
    return '<span title="Sample content. The founder can remove it all in Settings." class="inline-flex items-center rounded-full bg-raised px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-mute ' . $class . '">Sample</span>';
}

function cover(?string $src, ?string $emoji, string $class = ''): string {
    if ($src) return '<img src="' . h($src) . '" alt="" loading="lazy" referrerpolicy="no-referrer" class="object-cover ' . $class . '">';
    $e = $emoji ?: '✨';
    $hu = hue($e);
    return '<div class="flex items-center justify-center ' . $class . '" style="background:linear-gradient(135deg,hsl(' . $hu . ' 85% 94%),hsl(' . (($hu + 30) % 360) . ' 75% 86%))"><span class="text-5xl drop-shadow-[0_6px_10px_rgba(0,0,0,0.12)]">' . $e . '</span></div>';
}

function page_header(string $title, ?string $eyebrow = null, ?string $sub = null, string $action = ''): string {
    return '<div class="mb-6 flex items-end justify-between gap-4"><div class="min-w-0">'
        . ($eyebrow ? '<p class="eyebrow mb-1.5">' . h($eyebrow) . '</p>' : '')
        . '<h1 class="font-display text-[26px] leading-[1.05] tracking-tight sm:text-[32px]">' . $title . '</h1>'
        . ($sub ? '<p class="mt-1.5 text-[16px] text-mute">' . $sub . '</p>' : '')
        . '</div>' . ($action ? '<div class="shrink-0">' . $action . '</div>' : '') . '</div>';
}

function empty_state(string $emoji, string $title, string $body = '', ?array $cta = null): string {
    return '<div class="flex flex-col items-center rounded-3xl bg-raised px-6 py-14 text-center"><div class="text-4xl">' . $emoji . '</div>'
        . '<h3 class="mt-4 text-lg font-bold">' . h($title) . '</h3>'
        . ($body ? '<p class="mt-1.5 max-w-sm text-sm text-mute">' . $body . '</p>' : '')
        . ($cta ? '<a href="' . h($cta[0]) . '" class="btn-primary mt-5">' . h($cta[1]) . '</a>' : '') . '</div>';
}

function rec_card(array $r): string {
    $place = place_line($r);
    $sub = $place ?: ($r['site_name'] ?: ($r['cat_name'] ?? ''));
    $blurb = $r['why'] ? '“' . snippet($r['why'], 140) . '”' : snippet($r['description'] ?? '', 140);
    ob_start(); ?>
<a href="/r/<?= h($r['id']) ?>" class="group flex flex-col" data-rec-card>
  <div class="relative aspect-[4/3] overflow-hidden rounded-2xl bg-raised">
    <?= cover($r['cover'], $r['cat_emoji'] ?? null, 'size-full transition duration-500 group-hover:scale-[1.04]') ?>
    <span class="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[12px] font-semibold text-ink shadow-sm"><?= $r['cat_emoji'] ?? '✨' ?> <?= h($r['cat_name'] ?: 'Other') ?></span>
    <?= $r['is_sample'] ? sample_badge('absolute right-3 top-3 bg-white/90 shadow-sm') : '' ?>
    <?php if ($r['interest_count'] > 0): ?><span class="absolute bottom-3 left-3 rounded-full bg-white/95 px-2.5 py-1 text-[12px] font-semibold text-ink shadow-sm">🙋 <?= $r['interest_count'] ?> want to try</span><?php endif ?>
  </div>
  <div class="pt-3">
    <div class="flex items-start justify-between gap-3">
      <h3 class="line-clamp-1 text-[15px] font-bold leading-snug"><?= h($r['title']) ?></h3>
      <span class="shrink-0 pt-px"><?= stars_display($r['avg_rating']) ?></span>
    </div>
    <p class="mt-0.5 truncate text-[14px] text-mute"><?= h($sub) ?></p>
    <?php if ($blurb): ?><p class="mt-1 line-clamp-2 text-[14px] leading-snug text-soft"><?= h($blurb) ?></p><?php endif ?>
    <div class="mt-2 flex items-center gap-2 text-[13px] text-mute">
      <?= avatar($r['author_name'], $r['author_image'], 20) ?>
      <span class="truncate"><?= h(first_name($r['author_name'])) ?> · <?= time_ago($r['created_at']) ?></span>
      <?php if ($r['comment_count'] > 0): ?><span class="ml-auto shrink-0">💬 <?= $r['comment_count'] ?></span><?php endif ?>
    </div>
  </div>
</a>
<?php
    return ob_get_clean();
}

function rec_grid(array $recs): string {
    return '<div class="grid grid-cols-1 gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">' . implode('', array_map('rec_card', $recs)) . '</div>';
}

function rec_row(array $r, string $right = ''): string {
    $place = place_line($r);
    return '<div class="flex items-center gap-3 py-3"><a href="/r/' . h($r['id']) . '" class="shrink-0">' . cover($r['cover'], $r['cat_emoji'] ?? null, 'size-14 rounded-xl [&_span]:text-2xl') . '</a>'
        . '<div class="min-w-0 flex-1"><a href="/r/' . h($r['id']) . '" class="line-clamp-1 font-semibold hover:underline">' . h($r['title']) . '</a>'
        . '<p class="mt-0.5 truncate text-xs text-mute">' . ($r['cat_emoji'] ?? '') . ' ' . h($r['cat_name'] ?? '') . ($place ? ' · ' . h($place) : '') . ' · ' . h(first_name($r['author_name'])) . '</p>'
        . '<div class="mt-1">' . stars_display($r['avg_rating'], $r['rating_count']) . '</div></div>' . $right . '</div>';
}

/** Airbnb-style category bar: emoji over label, underline on the active one. */
function category_bar(array $cats, string $active = '', string $extra = ''): string {
    $items = array_merge([['slug' => '', 'name' => 'All', 'emoji' => '🏠']], $cats);
    $out = '<div class="no-scrollbar -mx-4 flex gap-7 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:gap-9 sm:px-0">';
    foreach ($items as $c) {
        $on = $active === $c['slug'];
        $href = $c['slug'] ? '/browse?category=' . rawurlencode($c['slug']) . ($extra ? "&$extra" : '') : '/browse' . ($extra ? "?$extra" : '');
        $out .= '<a href="' . h($href) . '" class="-mb-px flex shrink-0 flex-col items-center gap-1.5 border-b-2 pb-3 pt-1 text-[12px] font-semibold transition '
            . ($on ? 'border-ink text-ink' : 'border-transparent text-mute opacity-80 hover:border-line-strong hover:text-ink hover:opacity-100') . '">'
            . '<span class="text-2xl transition ' . ($on ? '' : 'grayscale-[35%]') . '">' . $c['emoji'] . '</span><span class="whitespace-nowrap">' . h($c['name']) . '</span></a>';
    }
    return $out . '</div>';
}

/** A POST form wrapped around one button. */
function post_button(string $action, string $label, string $class = 'btn-quiet', array $fields = [], string $confirm = ''): string {
    $out = '<form method="post" action="' . h($action) . '" class="inline"' . ($confirm ? ' data-confirm="' . h($confirm) . '"' : '') . '>' . csrf_field();
    foreach ($fields as $k => $v) $out .= '<input type="hidden" name="' . h($k) . '" value="' . h($v) . '">';
    return $out . '<button class="' . $class . '">' . $label . '</button></form>';
}

function linkify(string $text): string {
    return nl2br(preg_replace('#(https?://[^\s<]+)#', '<a href="$1" target="_blank" rel="noopener" class="text-gold underline-offset-2 hover:underline">$1</a>', h($text)));
}
