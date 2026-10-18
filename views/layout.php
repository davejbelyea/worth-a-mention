<?php
/** @var string $content */
$me ??= current_user();
$nav ??= '';
$tabs = [['/', 'Home', 'home', 'home'], ['/browse', 'Browse', 'search', 'browse'], ['/add', 'Add', 'plus', 'add'], ['/plans', 'Plans', 'plans', 'plans'], ['/newsletter', 'Thursday', 'mail', 'newsletter']];
?><!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#ffffff">
<meta name="csrf-token" content="<?= h(csrf_token()) ?>">
<title><?= isset($title) ? h($title) . ' · ' : '' ?>Worth a Mention</title>
<link rel="icon" href="<?= asset('icon.svg') ?>" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="<?= asset('app.css') ?>">
<script src="<?= asset('htmx.min.js') ?>" defer></script>
<script src="<?= asset('app.js') ?>" defer></script>
</head>
<body>
<?php if ($me): ?>
<header class="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur-xl">
  <div class="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:h-20 sm:px-6">
    <a href="/" class="flex items-center gap-2.5"><?= logo('size-7') ?><span class="text-[19px] font-extrabold leading-none tracking-tight text-gold">worth a mention</span></a>
    <nav class="hidden items-center gap-1 md:flex">
      <?php foreach ($tabs as [$href, $label, , $key]): if ($key === 'add') continue; ?>
        <a href="<?= $href ?>" class="rounded-full px-3.5 py-2 text-[14px] font-semibold transition <?= $nav === $key ? 'text-ink' : 'text-mute hover:bg-raised hover:text-ink' ?>"><?= $label === 'Thursday' ? 'Newsletter' : $label ?></a>
      <?php endforeach ?>
    </nav>
    <div class="ml-auto flex items-center gap-2">
      <a href="/browse" class="btn-quiet hidden px-2.5 md:inline-flex lg:hidden" aria-label="Search"><?= icon(ICONS['search'], 'size-5') ?></a>
      <form action="/browse" class="hidden items-center rounded-full border border-line-strong bg-white py-1.5 pl-5 pr-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.05)] transition hover:shadow-[0_2px_4px_rgba(0,0,0,0.1),0_6px_18px_rgba(0,0,0,0.08)] lg:flex">
        <input name="q" placeholder="Search everything" aria-label="Search" class="w-44 bg-transparent text-[14px] font-medium outline-none placeholder:text-mute">
        <button aria-label="Search" class="flex size-8 items-center justify-center rounded-full bg-gold text-white"><?= icon(ICONS['search'], 'size-4', '2') ?></button>
      </form>
      <a href="/add" class="btn-quiet hidden h-10 rounded-full px-4 text-[14px] text-ink md:inline-flex"><span class="text-lg leading-none">+</span> Add a mention</a>
      <?php if ($me['role'] === 'admin'): ?>
        <a href="/admin" class="btn-quiet px-2.5 <?= str_starts_with($_SERVER['REQUEST_URI'] ?? '', '/admin') ? 'text-ink' : '' ?>" aria-label="Settings" title="Group settings"><?= icon(ICONS['gear'], 'size-5') ?></a>
      <?php endif ?>
      <a href="/me" aria-label="Your profile" class="flex items-center gap-2.5 rounded-full border border-line-strong py-1 pl-3 pr-1 transition hover:shadow-[0_2px_6px_rgba(0,0,0,0.12)]">
        <?= icon(ICONS['menu'], 'size-4') ?><?= avatar($me['name'], $me['image'], 30) ?>
      </a>
    </div>
  </div>
</header>

<nav class="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur-xl md:hidden" aria-label="Main">
  <div class="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-2">
    <?php foreach ($tabs as [$href, $label, $ic, $key]): ?>
      <?php if ($key === 'add'): ?>
        <a href="/add" aria-label="Add a recommendation" class="mx-auto flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-[#e61e4d] to-[#e5484d] text-white shadow-[0_8px_20px_-6px_rgba(229,72,77,0.6)] transition active:scale-95"><?= icon(ICONS['plus'], 'size-6', '2.2') ?></a>
      <?php else: ?>
        <a href="<?= $href ?>" class="flex flex-col items-center gap-1 text-[11px] font-semibold transition <?= $nav === $key ? 'text-gold' : 'text-mute' ?>"><?= icon(ICONS[$ic]) ?><?= $label ?></a>
      <?php endif ?>
    <?php endforeach ?>
  </div>
</nav>

<main class="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 sm:pt-10 md:pb-16"><?= $content ?></main>
<?php else: ?>
<main class="mx-auto max-w-xl px-4 py-16"><?= $content ?></main>
<?php endif ?>
</body>
</html>
