<?php

function email_enabled(): bool { return setting('resend_api_key') !== ''; }

/**
 * Sends through Resend when a key is saved in Settings. Otherwise the email is
 * saved to storage/outbox and written to the PHP error log, so nothing is lost.
 */
function send_email(string $to, string $subject, string $html, string $text): bool {
    if (!email_enabled()) {
        @mkdir(STORAGE . '/outbox', 0775, true);
        $file = STORAGE . '/outbox/' . (int) (microtime(true) * 1000) . '-' . preg_replace('/[^a-z0-9@.]/i', '_', $to) . '.html';
        file_put_contents($file, "<!-- To: $to\nSubject: $subject -->\n$html");
        error_log("[email not configured] To: $to | $subject | " . preg_replace('/\s+/', ' ', $text));
        return true;
    }
    $ch = curl_init('https://api.resend.com/emails');
    curl_setopt_array($ch, [
        CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 20,
        CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . setting('resend_api_key'), 'Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode(['from' => setting('email_from') ?: 'Worth a Mention <onboarding@resend.dev>', 'to' => [$to], 'subject' => $subject, 'html' => $html, 'text' => $text]),
    ]);
    $body = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($code >= 300 || $body === false) {
        error_log("Resend error $code: $body");
        return false;
    }
    return true;
}

function simple_email(string $heading, string $body, string $button, string $url, string $footer = "If the button doesn't work, paste this into your browser:"): string {
    $u = h($url);
    return <<<HTML
<!doctype html><html><body style="margin:0;background:#f7f7f7;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border:1px solid #ebebeb;border-radius:16px;" cellpadding="0" cellspacing="0">
<tr><td style="padding:32px 28px;color:#222222;">
<div style="font-weight:800;font-size:16px;color:#e5484d;margin-bottom:20px;">worth a mention</div>
<h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;font-weight:700;color:#222222;">$heading</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#484848;">$body</p>
<a href="$u" style="display:inline-block;background:#e5484d;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 20px;border-radius:10px;">$button</a>
<p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#717171;">$footer<br><span style="color:#484848;word-break:break-all;">$u</span></p>
</td></tr></table>
<p style="font-size:12px;color:#a3a3a3;margin-top:16px;">Good things. Worth remembering.</p>
</td></tr></table></body></html>
HTML;
}
