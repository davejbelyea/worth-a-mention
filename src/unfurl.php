<?php

/** Guesses a category from the website, so a pasted link lands in the right place. */
function guess_category(string $url): ?string {
    $h = host_of($url);
    $rules = [
        '/imdb\.com|letterboxd\.com|rottentomatoes\.com|themoviedb\.org/' => 'movies',
        '/netflix\.com|hulu\.com|max\.com|hbomax|disneyplus|peacocktv|paramountplus|tv\.apple\.com|primevideo/' => 'tv',
        '/spotify\.com|music\.apple\.com|bandcamp\.com|soundcloud\.com|tidal\.com|pitchfork\.com/' => 'music',
        '/yelp\.com|resy\.com|opentable\.com|exploretock\.com|infatuation\.com|eater\.com/' => 'restaurants',
        '/allrecipes|cooking\.nytimes|seriouseats|bonappetit|smittenkitchen|food52|epicurious|kingarthurbaking|budgetbytes|americastestkitchen/' => 'recipes',
        '/airbnb\.|vrbo\.|tripadvisor\.|booking\.com|hotels\.com|nps\.gov|alltrails\.com/' => 'travel',
        '/etsy\.com|amazon\.|target\.com|wayfair|llbean|rei\.com/' => 'stores',
        '/youtube\.com|youtu\.be|tiktok\.com|instructables|lifehacker/' => 'tips',
    ];
    foreach ($rules as $re => $cat) if (preg_match($re, $h)) return $cat;
    return null;
}

function public_host(string $host): bool {
    if (getenv('UNFURL_ALLOW_PRIVATE') === '1') return true;
    $ips = gethostbynamel($host) ?: [];
    foreach ($ips as $ip) {
        if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) return false;
    }
    return (bool) $ips;
}

function meta_tag(string $html, array $keys): ?string {
    foreach ($keys as $k) {
        $k = preg_quote($k, '/');
        if (preg_match('/<meta[^>]+(?:property|name)=["\']' . $k . '["\'][^>]*content=["\']([^"\']*)["\']/i', $html, $m)
            || preg_match('/<meta[^>]+content=["\']([^"\']*)["\'][^>]*(?:property|name)=["\']' . $k . '["\']/i', $html, $m)) {
            $v = trim(preg_replace('/\s+/', ' ', html_entity_decode($m[1], ENT_QUOTES | ENT_HTML5, 'UTF-8')));
            if ($v !== '') return $v;
        }
    }
    return null;
}

function unfurl(string $input): ?array {
    $url = clean_url($input);
    if (!$url) return null;
    $base = ['url' => $url, 'category' => guess_category($url), 'siteName' => host_of($url)];
    if (!public_host((string) parse_url($url, PHP_URL_HOST))) return $base;
    $html = '';
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_FOLLOWLOCATION => true, CURLOPT_MAXREDIRS => 5, CURLOPT_TIMEOUT => 8, CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS, CURLOPT_REDIR_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
        CURLOPT_USERAGENT => 'Mozilla/5.0 (compatible; WorthAMentionBot/1.0; +link preview)',
        CURLOPT_HTTPHEADER => ['Accept: text/html,application/xhtml+xml', 'Accept-Language: en-US,en;q=0.8'],
        CURLOPT_ENCODING => '',
        CURLOPT_WRITEFUNCTION => function ($ch, $chunk) use (&$html) {
            $html .= $chunk;
            return (strlen($html) > 1_000_000 || stripos($html, '</head>') !== false) ? 0 : strlen($chunk);
        },
    ]);
    curl_exec($ch);
    $final = curl_getinfo($ch, CURLINFO_EFFECTIVE_URL) ?: $url;
    $type = (string) curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    curl_close($ch);
    if (!$html || ($type && stripos($type, 'html') === false)) return $base;

    $title = meta_tag($html, ['og:title', 'twitter:title']);
    if (!$title && preg_match('/<title[^>]*>([^<]*)<\/title>/i', $html, $m)) $title = trim(html_entity_decode($m[1], ENT_QUOTES | ENT_HTML5, 'UTF-8'));
    $image = meta_tag($html, ['og:image:secure_url', 'og:image', 'twitter:image', 'twitter:image:src']);
    if ($image && !preg_match('#^https?://#i', $image)) {
        $p = parse_url($final);
        $origin = $p['scheme'] . '://' . $p['host'] . (isset($p['port']) ? ':' . $p['port'] : '');
        $image = str_starts_with($image, '//') ? $p['scheme'] . ':' . $image : $origin . (str_starts_with($image, '/') ? '' : '/') . $image;
    }
    $desc = meta_tag($html, ['og:description', 'twitter:description', 'description']);
    return array_filter([
        'url' => $url,
        'title' => $title ? mb_substr($title, 0, 200) : null,
        'description' => $desc ? mb_substr($desc, 0, 600) : null,
        'image' => $image,
        'siteName' => meta_tag($html, ['og:site_name', 'application-name']) ?: $base['siteName'],
        'category' => $base['category'] ?: guess_category($final),
    ], fn($v) => $v !== null);
}
