<div class="space-y-4">
  <?php if (!empty($error) && empty($sent) && !isset($email)): ?><p class="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger"><?= h(AUTH_ERRORS[$error] ?? 'Something went wrong. Try again.') ?></p><?php endif ?>
  <?php if (google_enabled() && empty($sent)) partial('google_button', ['href' => '/auth/google' . ($next ? '?next=' . rawurlencode($next) : '')]) ?>
  <?php partial('email_link_form', ['next' => $next, 'sent' => $sent ?? false, 'email' => $email ?? '', 'devLink' => $devLink ?? null, 'error' => isset($email) ? $error : '']) ?>
  <?php if (open_signup()): ?>
  <p class="pt-4 text-center text-xs leading-relaxed text-faint">New here? Just enter your email to join.</p>
  <?php else: ?>
  <p class="pt-4 text-center text-xs leading-relaxed text-faint">Members only. New here? You'll need an invite from the group's founder.</p>
  <?php endif ?>
</div>
