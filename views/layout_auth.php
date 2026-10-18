<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#ffffff">
<title><?= isset($title) ? h($title) . ' · ' : '' ?>Worth a Mention</title>
<link rel="icon" href="<?= asset('icon.svg') ?>" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="<?= asset('app.css') ?>">
<script src="<?= asset('app.js') ?>" defer></script>
</head>
<body>
<main class="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-12">
  <div aria-hidden="true" class="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-[#ffe1e3] opacity-70 blur-3xl"></div>
  <div class="relative w-full max-w-sm">
    <div class="mb-8 text-center">
      <div class="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-white shadow-[0_6px_20px_rgba(0,0,0,0.08)]"><?= logo('size-8') ?></div>
      <h1 class="font-display text-[32px] leading-none">Worth a Mention</h1>
      <p class="mt-3 text-[15px] text-mute">Good things. Worth remembering.</p>
    </div>
    <?= $content ?>
  </div>
</main>
</body>
</html>
