// Small progressive enhancements. Every form still works without this file.
(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const csrf = () => $('meta[name="csrf-token"]')?.content || $('input[name="_csrf"]')?.value || '';

  // Ask before destructive actions. Runs in the capture phase so htmx never sees a cancelled submit.
  document.addEventListener('submit', (e) => {
    const form = e.target;
    if (form.dataset.confirm && !confirm(form.dataset.confirm)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }
    if (form.dataset.busy && !form.hasAttribute('hx-post')) {
      const btn = e.submitter || $('button:not([type=button])', form);
      if (btn && !btn.name) setTimeout(() => { btn.disabled = true; btn.textContent = form.dataset.busy; }, 0);
    }
  }, true);

  document.addEventListener('change', (e) => {
    const form = e.target.closest('form[data-autosubmit]');
    if (form && e.target.matches('select')) form.submit();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && e.target.matches('[data-submit-on-cmd-enter]')) {
      e.preventDefault();
      e.target.form.requestSubmit();
    }
  });

  document.addEventListener('click', async (e) => {
    const copy = e.target.closest('[data-copy]');
    if (copy) {
      try { await navigator.clipboard.writeText(copy.dataset.copy); } catch { prompt('Copy this:', copy.dataset.copy); return; }
      const old = copy.textContent;
      copy.textContent = 'Copied!';
      setTimeout(() => (copy.textContent = old), 1500);
    }
  });

  // Star rating hints ("Pretty good", "Obsessed") while hovering.
  document.addEventListener('mouseover', (e) => {
    const b = e.target.closest('.stars button');
    if (!b) return;
    const label = $('[data-stars-label]', b.closest('form'));
    if (label) label.textContent = b.dataset.label;
  });
  document.addEventListener('mouseout', (e) => {
    const box = e.target.closest('.stars');
    if (!box || box.contains(e.relatedTarget)) return;
    const label = $('[data-stars-label]', box.closest('form'));
    if (label) label.textContent = label.dataset.default;
  });

  // htmx: send the CSRF token on every request, and close any open dropdown after a swap.
  document.addEventListener('htmx:configRequest', (e) => { e.detail.headers['X-CSRF-Token'] = csrf(); });
  document.addEventListener('htmx:afterSwap', () => $$('details[data-autoclose][open]').forEach((d) => d.removeAttribute('open')));
  document.addEventListener('htmx:responseError', () => alert("That didn't save. Check your connection and try again."));

  // Shrinks big phone photos before upload so it stays quick on cellular and under the server's size limit.
  async function shrink(file) {
    if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.size < 600000) return file;
    try {
      const bmp = await createImageBitmap(file);
      const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bmp.width * scale);
      canvas.height = Math.round(bmp.height * scale);
      canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
      // Stay under 1.8 MB so it fits even a host's default 2 MB upload limit.
      let blob = null;
      for (const q of [0.85, 0.72, 0.6, 0.45]) {
        blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', q));
        if (!blob || blob.size < 1_800_000) break;
      }
      return blob ? new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file;
    } catch {
      return file;
    }
  }

  // "Add photos" on a recommendation page: shrink, then upload straight away.
  document.addEventListener('change', async (e) => {
    const form = e.target.closest('form[data-photo-upload]');
    if (!form || !e.target.files?.length) return;
    const label = $('[data-upload-label]', form);
    label.textContent = 'Uploading…';
    const body = new FormData(form);
    body.delete('photos[]');
    for (const f of await Promise.all([...e.target.files].slice(0, 8).map(shrink))) body.append('photos[]', f, f.name);
    try {
      const res = await fetch(form.action, { method: 'POST', body });
      if (!res.ok || res.url.endsWith('/photos')) {
        label.textContent = res.status === 413 ? 'Too big. Try a smaller photo' : "Didn't upload. Try again";
        return;
      }
      window.location.href = res.url.split('#')[0] + '#photos';
    } catch {
      label.textContent = "Didn't upload. Try again";
    }
  });

  // ---------------- The add / edit form ----------------
  const form = $('#rec-form');
  if (!form) return;
  const editing = form.dataset.editing === '1';
  const urlInput = $('#url', form);
  const titleInput = $('#title', form);
  const descInput = $('#description', form);
  const imageInput = $('input[name=image_url]', form);
  const siteInput = $('input[name=site_name]', form);
  const preview = $('[data-image-preview]', form);
  const note = $('[data-fetch-note]', form);
  const fetchBtn = $('[data-fetch]', form);
  const location = $('[data-location]', form);
  const more = $('[data-more]', form);
  let lastFetched = urlInput.value.trim();

  const showLocation = () => { location.classList.remove('hidden'); $('[data-more-loc]', form)?.classList.add('hidden'); };
  const setImage = (src) => {
    imageInput.value = src || '';
    preview.classList.toggle('hidden', !src);
    if (src) $('img', preview).src = src;
  };
  const say = (msg) => { note.textContent = msg; note.classList.toggle('hidden', !msg); };

  async function fetchLink(raw) {
    const v = (raw || '').trim();
    if (!v || v === lastFetched || !/\.\w{2,}|^(https?:\/\/)?(\d+\.){3}\d+|localhost/.test(v)) return;
    lastFetched = v;
    fetchBtn.textContent = 'Looking…';
    say('');
    try {
      const body = new FormData();
      body.append('url', v);
      body.append('_csrf', csrf());
      const res = await fetch('/api/unfurl', { method: 'POST', body, headers: { 'X-CSRF-Token': csrf() } });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      if (d.title && !titleInput.value) titleInput.value = d.title;
      if (d.image && !imageInput.value) setImage(d.image);
      if (d.description && descInput && !descInput.value) descInput.value = d.description;
      if (d.siteName) siteInput.value = d.siteName;
      if (d.category && !$('input[name=category]:checked', form)) {
        const radio = $(`input[name=category][value="${d.category}"]`, form);
        if (radio) { radio.checked = true; radio.dispatchEvent(new Event('change', { bubbles: true })); }
      }
      if (d.url) urlInput.value = d.url;
      say(d.title ? 'Pulled in what we could find. Tweak anything you like.' : "Couldn't read that page, but the link is saved. Fill in a name below.");
      checkSimilar();
    } catch {
      say("Couldn't read that link. You can still fill things in by hand.");
    } finally {
      fetchBtn.textContent = 'Fetch';
    }
  }
  urlInput.addEventListener('paste', (e) => { const v = e.clipboardData.getData('text'); setTimeout(() => fetchLink(v), 0); });
  urlInput.addEventListener('blur', () => fetchLink(urlInput.value));
  fetchBtn.addEventListener('click', () => { lastFetched = ''; fetchLink(urlInput.value); });
  $('[data-remove-image]', form).addEventListener('click', () => setImage(''));

  // Point people at things already on the site while they type.
  const similarBox = $('[data-similar]', form);
  let timer;
  async function checkSimilar() {
    if (editing || $('[data-testid=dupe]')) return;
    const title = titleInput.value.trim();
    const url = urlInput.value.trim();
    if (title.length < 3 && !url) { similarBox.classList.add('hidden'); return; }
    const res = await fetch('/api/similar?' + new URLSearchParams({ title, url }));
    if (!res.ok) return;
    const list = (await res.json()).slice(0, 3);
    similarBox.classList.toggle('hidden', !list.length);
    if (!list.length) return;
    const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    similarBox.innerHTML = `<p class="text-xs font-semibold text-soft">${list.some((s) => s.exact) ? 'Looks like this might already be here:' : 'Similar things already on the site:'}</p>
      <ul class="mt-2 space-y-1.5">${list.map((s) => `<li><a href="/r/${esc(s.id)}" class="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-hover">
        <span class="truncate">${esc(s.emoji)} ${esc(s.title)} <span class="text-mute">· ${esc((s.author || '').split(' ')[0])}</span></span>
        <span class="shrink-0 text-xs font-semibold text-gold">Rate or comment →</span></a></li>`).join('')}</ul>`;
  }
  titleInput.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(checkSimilar, 350); });

  form.addEventListener('change', (e) => {
    if (e.target.name === 'category' && e.target.dataset.hasLocation === '1') showLocation();
    if (e.target.matches('[data-state]')) $('[data-country]', form).classList.toggle('hidden', e.target.value !== 'INTL');
  });
  more?.addEventListener('toggle', () => { if (more.open) showLocation(); });

  // Optional rating when adding.
  const picker = $('[data-star-picker]', form);
  if (picker) {
    const starsInput = $('input[name=stars]', form);
    const paint = (n) => $$('button', picker).forEach((b, i) => { b.classList.toggle('text-gold', i < n); b.classList.toggle('text-faint', i >= n); });
    paint(+starsInput.value || 0);
    picker.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      starsInput.value = starsInput.value === b.value ? '' : b.value;
      paint(+starsInput.value || 0);
    });
  }

  // Extra links.
  const links = $('[data-links]', form);
  links.addEventListener('click', (e) => {
    if (e.target.closest('[data-remove-link]')) {
      const row = e.target.closest('div.flex');
      if ($$('input', links).length > 1) row.remove(); else $('input', row).value = '';
    }
    if (e.target.closest('[data-add-link]')) {
      const row = $('div.flex', links).cloneNode(true);
      $('input', row).value = '';
      links.insertBefore(row, e.target.closest('[data-add-link]'));
      $('input', row).focus();
    }
  });

  // Photos: shrink big phone photos before upload and show previews.
  const photoInput = $('[data-add-photo] input', form);
  photoInput.addEventListener('change', async () => {
    const files = await Promise.all([...photoInput.files].slice(0, 8).map(shrink));
    try {
      const dt = new DataTransfer();
      files.forEach((f) => dt.items.add(f));
      photoInput.files = dt.files;
    } catch { /* older browsers: upload the originals */ }
    $$('[data-preview]', form).forEach((n) => n.remove());
    const addTile = $('[data-add-photo]', form);
    files.forEach((f) => {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(f);
      img.dataset.preview = '';
      img.className = 'size-20 rounded-xl border border-gold/40 object-cover';
      addTile.before(img);
    });
  });
})();
