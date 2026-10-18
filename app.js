/* Editor icon browser - shared logic (identical in all engine sites; engine specifics come from config.json and data/).
   Stores nothing: no cookies, no localStorage, no requests except this site's own files. The address (#...) holds the current
   version, search and opened icon so a link can point to it. */
'use strict';
const $ = id => document.getElementById(id);
const m = $('m'), q = $('q'), c = $('c'), d = $('d'), vbtn = $('vbtn'), vlist = $('vlist');
const SIZES = [16, 24, 32, 48, 64, 96, 128];
const S = { cp: 'code', tint: '', z: 48, light: false, ty: '', sharp: false, nw: false, gone: false, so: 'az', pfx: '', bg: 'dark', q: '', v: '' };
let CFG = {}, VERS = [], DATA = null, D = [], list = [], shown = 0, sel = -1;
const BATCH = 240;
const HP = new URLSearchParams(location.hash.replace(/^#/, ''));

const esc = s => String(s).replace(/[&<>"]/g, x => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[x]));
const brk = s => esc(s).replace(/([._])/g, '$1<wbr>');
const vkey = v => v.split('.').map(Number);
const vcmp = (a, b) => { const x = vkey(a), y = vkey(b); for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d; } return 0; };
const major = v => vkey(v)[0];

function toast(t, err) { const e = $('ts'); e.textContent = t; e.classList.toggle('err', !!err); e.classList.add('show'); clearTimeout(toast.h); toast.h = setTimeout(() => e.classList.remove('show'), err ? 3200 : 1300); }
function copy(t, msg) { try { navigator.clipboard.writeText(t).then(() => toast(msg || 'Copied'), () => toast('Copy failed')); } catch (e) { toast('Copy failed'); } }
function addr() { const p = new URLSearchParams(); if (S.v && S.v !== VERS[VERS.length - 1].v) p.set('v', S.v); if (S.q) p.set('q', S.q); if (sel >= 0 && list[sel] !== undefined) p.set('k', D[list[sel]].n); if (S.tint) p.set('tint', S.tint); if (S.gone) p.set('gone', '1'); history.replaceState(null, '', '#' + p.toString()); }
function src(r) { return 'img/' + r.h + '.' + r.e; }
function aliasOf(r) { if (!r.a) return ''; const q = (S.q || '').toLowerCase(); return (q && r.a.find(x => x.toLowerCase().includes(q))) || r.a[0]; }
function nameOf(r) { return aliasOf(r) || r.n; }
function fill(code, r) { const x = ((r.x || [])[0] || '').split('::'); return code.replace(/\{name\}/g, r.n).replace(/\{file\}/g, r.f).replace(/\{alias\}/g, aliasOf(r)).replace(/\{under\}/g, r.f.replace(/^Engine\/Content\//, '')).replace(/\{w\}/g, r.w || 16).replace(/\{g\}/g, r.g || r.w || 16).replace(/\{cls\}/g, r.e === 'svg' ? 'FSlateVectorImageBrush' : 'FSlateImageBrush').replace(/\{style\}/g, x[0] || '').replace(/\{key\}/g, x.slice(1).join('::')); }
// what the user can paste: the variants of the first snippet group that fits this icon and version (e.g. FSlateIcon and Brush); each is clean code without comments
function snippets(r) {
  const all = CFG.snippets || [], ok = t => vcmp(S.v, t.from) >= 0 && (!t.needs || (r[t.needs] && (r[t.needs].length === undefined || r[t.needs].length)));
  const groups = []; all.forEach(t => { const g = t.group || t.label; if (!groups.includes(g)) groups.push(g); });
  for (const g of groups) {
    const by = new Map();
    all.forEach(t => { if ((t.group || t.label) === g && ok(t)) { const o = by.get(t.label); if (!o || vcmp(t.from, o.from) > 0) by.set(t.label, t); } });
    if (by.size) return [...by.values()].map(t => ({ label: t.label, code: fill(t.code, r), note: fill(t.note || '', r) }));
  }
  return [];
}
function snippet(r) { const v = snippets(r)[0]; return v ? v.code : ''; }
function goneIn(u) { const mj = major(u); const vs = VERS.filter(x => (CFG.crossMajor || major(x.v) === mj) && vcmp(x.v, u) > 0); return vs.length ? vs[0].v : '?'; }   // crossMajor: names stay the same across major versions
const small = r => r.e === 'png' && r.w < 24;
function rgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function tintHtml(r, px, extra) {
  const u = src(r), im = '<img src="' + u + '" style="width:' + px + 'px;height:' + px + 'px;object-fit:contain;' + (r.e === 'png' ? 'image-rendering:pixelated;' : '') + (extra || '') + '" alt="">';
  if (!S.tint) return im;
  return '<span class="tw">' + im + '<i style="background:' + S.tint + ';-webkit-mask-image:url(' + u + ');mask-image:url(' + u + ')"></i></span>';
}
function tileImg(r) {
  const im = '<img class="' + (r.e === 'png' ? 'px' : '') + '" loading="lazy" decoding="async" src="' + src(r) + '" alt="">';
  if (!S.tint) return im;
  const u = src(r);
  return '<span class="tw">' + im + '<i style="background:' + S.tint + ';-webkit-mask-image:url(' + u + ');mask-image:url(' + u + ')"></i></span>';
}
function setTint(v) {
  S.tint = /^#[0-9a-fA-F]{6}$/.test(v || '') ? v.toLowerCase() : '';
  if (S.tint) $('tx').value = S.tint; else $('tx').value = '';
  const sw = $('wb'); sw.classList.toggle('on', !!S.tint); sw.style.setProperty('--sw', S.tint || 'none');
  m.querySelectorAll('.t').forEach(t => { const r = D[+t.dataset.i]; t.querySelector('.i').innerHTML = tileImg(r); });
  if (sel >= 0 && list[sel] !== undefined) renderPrev(D[list[sel]]);
  addr();
}
function tintCode() {
  if (!S.tint || !(CFG.tint || []).length) return '';
  const [r, g, b] = rgb(S.tint), f = x => (x / 255).toFixed(3).replace(/\.?0+$/, '') || '0';
  return CFG.tint.map(t => t.code.replace(/\{hex\}/g, S.tint).replace(/\{r\}/g, r).replace(/\{g\}/g, g).replace(/\{b\}/g, b).replace(/\{rf\}/g, f(r)).replace(/\{gf\}/g, f(g)).replace(/\{bf\}/g, f(b))).join('\n');
}
function colorful(r, cb) { // is the icon multi-coloured? (tinting multiplies colours: only white/grey icons tint cleanly)
  const im = new Image(); im.onload = () => { try { const cv = document.createElement('canvas'); cv.width = cv.height = 32; const x = cv.getContext('2d'); x.drawImage(im, 0, 0, 32, 32); const p = x.getImageData(0, 0, 32, 32).data; let n = 0, sat = 0; for (let i = 0; i < p.length; i += 4) { if (p[i + 3] < 128) continue; const mx = Math.max(p[i], p[i + 1], p[i + 2]), mn = Math.min(p[i], p[i + 1], p[i + 2]); sat += mx ? (mx - mn) / mx : 0; n++; } cb(n ? sat / n : 0); } catch (e) { cb(0); } }; im.src = src(r);
}

/* ---------- filter / sort */
function filter() {
  const s = S.q.trim().toLowerCase();
  list = D.map((r, i) => i).filter(i => {
    const r = D[i];
    return (!s || (r.n + ' ' + r.f + ' ' + (r.a ? r.a.join(' ') : '') + ' ' + (r.x ? r.x.join(' ') : '')).toLowerCase().includes(s)) && (!S.ty || r.e === S.ty) && (!S.sharp || r.e === 'svg' || r.w >= 24)
      && (!S.nw || r.nw) && (!S.gone || r.u) && (!S.pfx || cat(r) === S.pfx);
  });
  if (S.so === 'size') list.sort((a, b) => D[b].w * D[b].g - D[a].w * D[a].g || a - b);
  c.textContent = list.length.toLocaleString() + ' of ' + D.length.toLocaleString() + ' icons';
  m.innerHTML = ''; shown = 0; sel = -1; more(); addr();
}
function cat(r) { return (CFG.catField && r[CFG.catField]) || prefix(r.n); }   // category: a field of the data (e.g. a folder), else derived from the name
function prefix(n) {
  if (CFG.catRoot) { n = n.replace(new RegExp(CFG.catRoot), ''); const f = n.indexOf('/'); if (f > 0) return n.slice(0, f); }   // folder as category
  const t = n.match(/^[A-Z0-9]+(?=_)|^[A-Z0-9]+$|^[A-Z][a-z0-9]*|^[a-z0-9]+(?=_)|^[A-Za-z0-9]+/); return t ? t[0] : n;
}
function tile(i) {
  const r = D[i], e = document.createElement('div');
  e.className = 't'; e.tabIndex = 0; e.dataset.i = i; e.setAttribute('role', 'button'); e.setAttribute('aria-label', r.n);
  e.innerHTML = (r.nw ? '<span class="badge">NEW</span>' : '') + (r.u ? '<span class="badge gone" title="Last present in ' + esc(r.u) + '">GONE IN ' + esc(goneIn(r.u)) + '</span>' : '') + '<div class="i">' + tileImg(r) + '</div><b title="' + esc(r.n) + '">' + brk(CFG.catRoot ? r.n.split('/').pop() : r.n) + '</b><small><span>' + r.e + '</span><span class="' + (small(r) ? 'warn' : '') + '"' + (small(r) ? ' title="small PNG: blurry when scaled up"' : '') + '>' + (r.w ? r.w + '&times;' + r.g : '') + '</span></small>';
  return e;
}
function more() {
  const end = Math.min(list.length, shown + BATCH), f = document.createDocumentFragment();
  for (let k = shown; k < end; k++) f.appendChild(tile(list[k]));
  const old = m.querySelector('.more'); if (old) old.remove();
  m.appendChild(f); shown = end;
  if (!list.length) m.innerHTML = '<div class="empty">No icons match. Try fewer filters or another word.</div>';
  else if (shown < list.length) { const e = document.createElement('div'); e.className = 'more'; e.textContent = 'Loading more…'; m.appendChild(e); io.observe(e); }
}
const io = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting)) { io.disconnect(); more(); } }, { rootMargin: '800px' });

/* ---------- display */
function zoom(n) {
  n = Math.max(0, Math.min(SIZES.length - 1, n)); S.z = SIZES[n]; const z = S.z;
  m.style.setProperty('--sz', z + 'px'); m.style.setProperty('--cell', Math.max(176, z + 70) + 'px');
  document.querySelectorAll('[data-z]').forEach(b => b.classList.toggle('on', +b.dataset.z === z));
}
function theme() { document.body.classList.toggle('light', S.light); }

/* ---------- details */
function renderPrev(r) {
  const bgc = { dark: '#121316', light: '#f4f5f7', check: 'repeating-conic-gradient(#8884 0 25%,transparent 0 50%) 50%/16px 16px' }[S.bg];
  const bigpx = r.e === 'png' ? Math.min(180, r.w * Math.max(1, Math.floor(180 / r.w))) : 160;
  $('bigp').style.background = bgc; $('bigp').innerHTML = tintHtml(r, bigpx);
  $('prv').innerHTML = [16, 24, 32, 48].map(z => '<div><span class="pvbox" style="background:' + bgc + '">' + tintHtml(r, z, 'display:block;') + '</span>' + z + '</div>').join('');
  const tc = tintCode();
  $('tcode').innerHTML = S.tint && tc ? '<div class="code">' + esc(tc) + '</div><div class="acts"><button class="btn" id="tcc">Copy tint code</button></div>' : '';
  if ($('tcc')) $('tcc').onclick = () => copy(tc, 'Tint code copied');
  $('tn').textContent = '';
  if (S.tint) colorful(r, s => { if (s > 0.25 && sel >= 0 && D[list[sel]] === r) $('tn').textContent = 'This icon has its own colours. The engine multiplies the tint with them, so the result is darker or mixed (shown here as the engine does it). White and grey icons give the pure tint colour.'; });
}
function open_(k) {
  sel = k; const i = list[k], r = D[i];
  document.querySelectorAll('.t.sel').forEach(x => x.classList.remove('sel'));
  const t = m.querySelector('[data-i="' + i + '"]'); if (t) { t.classList.add('sel'); keepVisible(t); }
  const sv = snippets(r), sn = sv.length ? sv[0].code : '', ch = choices();
  const life = r.u ? 'Removed in ' + esc(goneIn(r.u)) : 'Still present in ' + esc(lastOfSeries());
  $('dk').textContent = r.n;
  $('db').innerHTML =
    '<div class="big" id="bigp"></div>' +
    '<div class="bgs" aria-label="Preview background"><button class="sw ' + (S.bg === 'dark' ? 'on' : '') + '" data-bg="dark" style="background:#121316" title="Dark"></button><button class="sw ' + (S.bg === 'light' ? 'on' : '') + '" data-bg="light" style="background:#f4f5f7" title="Light"></button><button class="sw ' + (S.bg === 'check' ? 'on' : '') + '" data-bg="check" style="background:repeating-conic-gradient(#888 0 25%,#ddd 0 50%) 50%/10px 10px" title="Checkerboard"></button></div>' +
    '<div class="prev" id="prv"></div>' +
    '<small id="tn"></small><div id="tcode"></div>' +
    '<dl><dt>' + esc(CFG.keyLabel || 'Name') + '</dt><dd>' + esc(r.n) + '</dd><dt>Type</dt><dd>' + (r.e === 'svg' ? 'SVG (vector, sharp at any size)' : 'PNG (bitmap)') + '</dd>' +
    '<dt>Size</dt><dd class="' + (small(r) ? 'warn' : '') + '">' + (r.w ? r.w + '&times;' + r.g : 'vector') + (small(r) ? ' &ndash; small, blurry when scaled up' : '') + '</dd>' +
    (r.a ? '<dt>' + esc(CFG.aliasLabel || 'Code name') + '</dt><dd>' + r.a.slice(0, 6).map(esc).join('<br>') + (r.a.length > 6 ? '<br>+' + (r.a.length - 6) + ' more' : '') + '</dd>' : '') + (r.x ? '<dt>' + (r.a ? 'Other style sets' : esc(CFG.aliasLabel || 'Code name')) + '</dt><dd>' + r.x.slice(0, 3).map(esc).join('<br>') + (r.x.length > 3 ? '<br>+' + (r.x.length - 3) + ' more' : '') + '</dd>' : '') + '<dt>Since</dt><dd>' + esc(r.s) + (r.nw ? ' (new in ' + esc(S.v) + ')' : '') + '</dd><dt>Status</dt><dd>' + life + '</dd>' + (CFG.noFile ? '' : '<dt>File</dt><dd>' + esc(r.f) + '</dd>') + '</dl>' +
    '<div class="acts">' + ch.map(c => '<button class="btn' + (resolve(r, c.v).err ? ' off" aria-disabled="true' : c.v === S.cp ? ' on' : '') + '" data-c="' + esc(c.v) + '">' + esc(c.btn) + '</button>').join('') + '</div>' +
    sv.map(v => '<small class="vl">' + esc(v.label) + '</small><div class="code">' + esc(v.code) + '</div>').join('') + (sv[0] && sv[0].note ? '<p class="note">' + esc(sv[0].note) + '</p>' : '');
  d.classList.add('open'); document.body.classList.add('dopen'); addr();
  renderPrev(r);
  document.querySelectorAll('.acts [data-c]').forEach(b => b.onclick = () => { const x = resolve(r, b.dataset.c); if (x.err) toast(x.err, true); else copy(x.text, x.msg); });
  document.querySelectorAll('[data-bg]').forEach(b => b.onclick = () => { S.bg = b.dataset.bg; document.querySelectorAll('[data-bg]').forEach(x => x.classList.toggle('on', x === b)); renderPrev(r); });
}
// scroll the page only as far as needed so the tile is not hidden under the sticky header or the footer
function keepVisible(t) { const hh = document.querySelector('header').offsetHeight, r = t.getBoundingClientRect(); if (r.top < hh + 8) window.scrollBy(0, r.top - hh - 8); else if (r.bottom > innerHeight - 48) window.scrollBy(0, r.bottom - innerHeight + 56); }
function lastOfSeries() { const mj = major(S.v); const vs = VERS.filter(x => major(x.v) === mj); return vs[vs.length - 1].v; }
function close_() { d.classList.remove('open'); document.body.classList.remove('dopen'); sel = -1; document.querySelectorAll('.t.sel').forEach(x => x.classList.remove('sel')); addr(); }

/* ---------- version */
async function loadVersion(v, keepOpen) {
  S.v = v; setVerUI(v); close_();
  const vi = VERS.find(x => x.v === v); vbtn.title = vi && vi.date ? 'Released ' + vi.date : '';
  let j;
  try { j = await (await fetch('data/' + v + '.json', { cache: 'no-cache' })).json(); } catch (e) { m.innerHTML = '<div class="empty">Could not load the data for ' + esc(v) + '.</div>'; return; }
  DATA = j; D = j.icons;
  const info = VERS.find(x => x.v === v);
  $('nw').hidden = !(info && info.new > 0); if ($('nw').hidden) S.nw = false;
  $('nw').classList.toggle('on', S.nw); $('nw').textContent = 'New in ' + v + (info && info.new ? ' (' + info.new + ')' : '');
  const gn = D.filter(r => r.u).length;
  $('gn').hidden = gn === 0; if (gn === 0) S.gone = false;
  $('gn').classList.toggle('on', S.gone); $('gn').textContent = 'Removed later (' + gn + ')';
  const hasPng = D.some(r => r.e === 'png'), hasSvg = D.some(r => r.e === 'svg');
  $('ty').hidden = !(hasPng && hasSvg); $('sharp').hidden = !hasPng; if (!(hasPng && hasSvg)) { S.ty = ''; document.querySelectorAll('#ty .btn').forEach(x => x.classList.toggle('on', x.dataset.v === '')); }
  if (!hasPng) S.sharp = false; $('sharp').classList.toggle('on', S.sharp);
  const cnt = {}; D.forEach(r => { const p = cat(r); cnt[p] = (cnt[p] || 0) + 1; });
  const top = Object.entries(cnt).filter(e => e[1] > 1).sort((a, b) => b[1] - a[1]).slice(0, 14).map(e => e[0]);
  S.pfx = top.includes(S.pfx) ? S.pfx : '';
  $('chips').hidden = top.length < 2;
  $('chips').innerHTML = top.map(p => '<button class="chip' + (p === S.pfx ? ' on' : '') + '" data-p="' + esc(p) + '" title="Icons in the category ' + esc(p) + '">' + esc(p) + ' <small>' + cnt[p] + '</small></button>').join('');
  filter();
  if (keepOpen) { const j2 = list.findIndex(i => D[i].n === keepOpen); if (j2 >= 0) open_(j2); }
}

/* ---------- dropdowns: own widget instead of the native select popup (its highlight colour cannot be styled) */
function enhance(sel) {
  const box = document.createElement('div'), btn = document.createElement('button'), list = document.createElement('div');
  box.className = 'dd'; btn.className = 'ddbtn'; btn.setAttribute('aria-haspopup', 'listbox'); btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-label', sel.getAttribute('aria-label') || '');
  list.className = 'ddlist'; list.setAttribute('role', 'listbox'); list.hidden = true;
  list.innerHTML = [...sel.options].map(o => '<div class="dopt" role="option" data-v="' + esc(o.value) + '">' + esc(o.textContent) + '</div>').join('');
  const show = () => { btn.textContent = sel.options[sel.selectedIndex].textContent; list.querySelectorAll('.dopt').forEach(x => x.setAttribute('aria-selected', x.dataset.v === sel.value ? 'true' : 'false')); };
  const open = o => { list.hidden = !o; btn.setAttribute('aria-expanded', o ? 'true' : 'false'); list.querySelectorAll('.hi').forEach(x => x.classList.remove('hi')); if (o) { const c = list.querySelector('[aria-selected=true]'); if (c) c.classList.add('hi'); } };
  const move = d => { const it = [...list.querySelectorAll('.dopt')]; let i = it.findIndex(x => x.classList.contains('hi')); if (i < 0) i = it.findIndex(x => x.getAttribute('aria-selected') === 'true'); i = Math.max(0, Math.min(it.length - 1, i + d)); it.forEach(x => x.classList.remove('hi')); it[i].classList.add('hi'); };
  const pick = v => { open(false); if (sel.value !== v) { sel.value = v; sel.dispatchEvent(new Event('change')); } show(); };
  btn.onclick = e => { e.stopPropagation(); document.querySelectorAll('.ddlist').forEach(l => { if (l !== list) l.hidden = true; }); open(list.hidden); };
  list.onclick = e => { const o = e.target.closest('.dopt'); if (o) { pick(o.dataset.v); btn.focus(); } };
  document.addEventListener('click', e => { if (!list.hidden && !e.target.closest('.dd')) open(false); });
  btn.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (list.hidden) open(true); move(e.key === 'ArrowDown' ? 1 : -1); }
    else if (e.key === 'Enter' && !list.hidden) { e.preventDefault(); const h = list.querySelector('.hi'); if (h) pick(h.dataset.v); else open(false); }
    else if (e.key === 'Escape' && !list.hidden) { e.stopPropagation(); open(false); }
  });
  sel.hidden = true; sel.after(box); box.append(btn, list); show();
}
enhance($('so'));

/* ---------- version dropdown (own widget: the native popup could not be styled reliably) */
function setVerUI(v) {
  vbtn.textContent = v;
  vlist.querySelectorAll('.vo').forEach(o => o.setAttribute('aria-selected', o.dataset.v === v ? 'true' : 'false'));
}
function verOpen(open) {
  vlist.hidden = !open; vbtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (open) { const cur = vlist.querySelector('[aria-selected=true]'); vlist.querySelectorAll('.hi').forEach(x => x.classList.remove('hi')); if (cur) { cur.classList.add('hi'); cur.scrollIntoView({ block: 'center' }); } }
}
function verMove(dir) {
  const items = [...vlist.querySelectorAll('.vo')]; let i = items.findIndex(x => x.classList.contains('hi'));
  if (i < 0) i = items.findIndex(x => x.getAttribute('aria-selected') === 'true');
  i = Math.max(0, Math.min(items.length - 1, i + dir)); items.forEach(x => x.classList.remove('hi')); items[i].classList.add('hi'); items[i].scrollIntoView({ block: 'nearest' });
}
vbtn.onclick = e => { e.stopPropagation(); verOpen(vlist.hidden); };
vlist.onclick = e => { const o = e.target.closest('.vo'); if (!o) return; verOpen(false); loadVersion(o.dataset.v); vbtn.focus(); };
document.addEventListener('click', e => { if (!vlist.hidden && !e.target.closest('.vpick')) verOpen(false); });
vbtn.addEventListener('keydown', e => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (vlist.hidden) verOpen(true); verMove(e.key === 'ArrowDown' ? 1 : -1); }
  else if (e.key === 'Enter' && !vlist.hidden) { e.preventDefault(); const hi = vlist.querySelector('.hi'); verOpen(false); if (hi) loadVersion(hi.dataset.v); }
  else if (e.key === 'Escape' && !vlist.hidden) { e.stopPropagation(); verOpen(false); }
});

/* ---------- events */
// everything that can be copied: name, one entry per code variant of the config, file path. The detail buttons and "On click copy" both use this list.
function choices() {
  const labels = [...new Set((CFG.snippets || []).map(t => t.label))], nm = CFG.aliasLabel || (CFG.keyLabel !== 'Path' ? (CFG.keyLabel || 'Name') : '');
  const o = []; if (nm) o.push({ v: 'name', label: nm, btn: 'Copy ' + nm.toLowerCase() });
  labels.forEach(l => o.push({ v: 'sn:' + l, label: l, btn: 'Copy ' + l })); if (!CFG.noFile) o.push({ v: 'file', label: 'File path', btn: 'Copy file path' });
  return o;
}
// what a choice copies for this icon, or why it cannot: -> { text, msg } | { err }
function resolve(r, v) {
  if (v === 'file') return { text: r.f, msg: 'Path copied' };
  if (v === 'name') return CFG.aliasLabel && !r.a ? { err: 'This icon has no ' + CFG.aliasLabel.toLowerCase() + ' in the engine code.' } : { text: nameOf(r), msg: 'Name copied' };
  const L = v.slice(3), f = snippets(r).find(x => x.label === L);
  if (f) return { text: f.code, msg: 'Copied: ' + L };
  const first = (CFG.snippets || []).filter(t => t.label === L).reduce((a, t) => !a || vcmp(t.from, a.from) < 0 ? t : a, null);
  if (first && vcmp(S.v, first.from) < 0) return { err: L + ' is not available in ' + (CFG.engine || '') + ' ' + S.v + ' (needs ' + first.from + ' or newer).' };
  return { err: L + ' is not available for this icon.' };
}
function copyOptions() {
  const ch = choices(), first = ch.find(c => c.v.startsWith('sn:')) || ch[0];
  $('cp').innerHTML = ch.map(c => '<option value="' + esc(c.v) + '">' + esc(c.label) + '</option>').join('') + '<option value="">Nothing</option>';
  S.cp = first.v; $('cp').value = S.cp; enhance($('cp'));
}
function clickCopy(i) { if (!S.cp) return; const x = resolve(D[i], S.cp); if (x.err) toast(x.err, true); else copy(x.text, x.msg); }
m.addEventListener('click', e => { const t = e.target.closest('.t'); if (!t) return; open_(list.indexOf(+t.dataset.i)); clickCopy(+t.dataset.i); });
m.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.classList.contains('t')) { open_(list.indexOf(+e.target.dataset.i)); clickCopy(+e.target.dataset.i); } });
$('dx').onclick = close_; $('dp').onclick = () => sel > 0 && open_(sel - 1); $('dn').onclick = () => sel < list.length - 1 && open_(sel + 1);
q.oninput = () => { S.q = q.value; filter(); };
$('tx').oninput = e => { const v = e.target.value.trim(); if (/^#[0-9a-fA-F]{6}$/.test(v)) { setTint(v); if (!wp.hidden) { const [h, s, x] = hex2hsv(v); wh = h; ws = s; wval = x; wv.value = Math.round(x * 100); wheelDraw(); } } };
$('tr').onclick = () => setTint('');
/* colour picker: hue ring around, saturation (x) and brightness (y) in the square inside */
const wv = $('wv'), wc = $('wc'), wx = wc.getContext('2d'), wp = $('wp'), wb = $('wb');
const WN = 220, WR1 = 108, WR0 = 86, WS = 112;   // canvas, ring outer/inner radius, square side
let wh = 0, ws = 0, wval = 1, wdrag = '';
function hsv2hex(h, s, v) { const f = n => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); }; return '#' + [f(5), f(3), f(1)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join(''); }
function hex2hsv(x) { const [r, g, b] = rgb(x).map(n => n / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d) h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [h * 60, mx ? d / mx : 0, mx]; }
function hsv2rgb(h, s, v) { const f = n => { const k = (n + h / 60) % 6; return Math.round((v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255); }; return [f(5), f(3), f(1)]; }
let wring = null, wdpr = 0;   // the hue ring never changes: drawn once per pixel ratio
function wheelRing(dpr) {
  const n = Math.round(WN * dpr), img = new ImageData(n, n), c = WN / 2;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const dx = (x + .5) / dpr - c, dy = (y + .5) / dpr - c, r = Math.hypot(dx, dy);
    const a = Math.max(0, Math.min(1, Math.min(r - WR0, WR1 - r) * dpr + .5));   // smooth edge: partial coverage instead of a hard cut
    if (a <= 0) continue;
    const [R, G, B] = hsv2rgb((Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360, 1, 1), i = (y * n + x) * 4;
    img.data[i] = R; img.data[i + 1] = G; img.data[i + 2] = B; img.data[i + 3] = Math.round(a * 255);
  }
  return img;
}
function wheelDraw() {
  const dpr = Math.max(1, Math.min(4, window.devicePixelRatio || 1)), n = Math.round(WN * dpr), c = WN / 2, q = WS / 2;
  if (wc.width !== n) { wc.width = wc.height = n; }
  if (!wring || wdpr !== dpr) { wring = wheelRing(dpr); wdpr = dpr; }
  const img = new ImageData(new Uint8ClampedArray(wring.data), n, n);
  const x0 = Math.floor((c - q - 2) * dpr), x1 = Math.ceil((c + q + 2) * dpr);
  for (let y = x0; y < x1; y++) for (let x = x0; x < x1; x++) {
    const dx = (x + .5) / dpr - c, dy = (y + .5) / dpr - c;
    const a = Math.max(0, Math.min(1, Math.min(q - Math.abs(dx), q - Math.abs(dy)) * dpr + .5));
    if (a <= 0) continue;
    const [R, G, B] = hsv2rgb(wh, Math.max(0, Math.min(1, (dx + q) / WS)), Math.max(0, Math.min(1, 1 - (dy + q) / WS))), i = (y * n + x) * 4;
    img.data[i] = R; img.data[i + 1] = G; img.data[i + 2] = B; img.data[i + 3] = Math.round(a * 255);
  }
  wx.setTransform(1, 0, 0, 1, 0, 0); wx.putImageData(img, 0, 0); wx.scale(dpr, dpr);
  const mark = (px, py) => { wx.beginPath(); wx.arc(px, py, 7, 0, 7); wx.lineWidth = 3; wx.strokeStyle = '#000'; wx.stroke(); wx.lineWidth = 1.5; wx.strokeStyle = '#fff'; wx.stroke(); };
  const a = wh * Math.PI / 180, rm = (WR0 + WR1) / 2;
  mark(c + Math.cos(a) * rm, c + Math.sin(a) * rm);
  mark(c - q + ws * WS, c - q + (1 - wval) * WS);
}
function wheelSet() { const hx = hsv2hex(wh, ws, wval); setTint(hx); $('tx').value = hx; wv.value = Math.round(wval * 100); wheelDraw(); }
wv.oninput = () => { wval = wv.value / 100; wheelSet(); };
function wheelPick(e) {
  const b = wc.getBoundingClientRect(), k = WN / b.width, dx = (e.clientX - b.left) * k - WN / 2, dy = (e.clientY - b.top) * k - WN / 2, q = WS / 2;
  if (e.type === 'pointerdown') wdrag = (Math.abs(dx) <= q + 4 && Math.abs(dy) <= q + 4) ? 'sv' : (Math.hypot(dx, dy) >= WR0 - 6 ? 'hue' : '');
  if (wdrag === 'sv') { ws = Math.max(0, Math.min(1, (dx + q) / WS)); wval = 1 - Math.max(0, Math.min(1, (dy + q) / WS)); }
  else if (wdrag === 'hue') wh = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
  else return;
  wheelSet();
}
function wheelOpen(o) { wp.hidden = !o; wb.setAttribute('aria-expanded', o ? 'true' : 'false'); if (o) { if (S.tint) { const [h, s, v] = hex2hsv(S.tint); wh = h; ws = s; wval = v; } wv.value = Math.round(wval * 100); wheelDraw(); } }
wb.onclick = e => { e.stopPropagation(); wheelOpen(wp.hidden); };
wc.onpointerdown = e => { wc.setPointerCapture(e.pointerId); wheelPick(e); wc.onpointermove = wheelPick; };
wc.onpointerup = () => { wc.onpointermove = null; wdrag = ''; };
document.addEventListener('click', e => { if (!wp.hidden && !e.target.closest('.wpick')) wheelOpen(false); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !wp.hidden) wheelOpen(false); });
$('cp').onchange = e => { S.cp = e.target.value; };
$('so').onchange = e => { S.so = e.target.value; filter(); };
$('ty').onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; S.ty = b.dataset.v; document.querySelectorAll('#ty .btn').forEach(x => x.classList.toggle('on', x === b)); filter(); };
$('sharp').onclick = e => { S.sharp = !S.sharp; e.currentTarget.classList.toggle('on', S.sharp); filter(); };
$('gn').onclick = e => { S.gone = !S.gone; e.currentTarget.classList.toggle('on', S.gone); filter(); };
$('nw').onclick = e => { S.nw = !S.nw; e.currentTarget.classList.toggle('on', S.nw); filter(); };
$('zm').onclick = () => zoom(SIZES.indexOf(S.z) - 1); $('zp').onclick = () => zoom(SIZES.indexOf(S.z) + 1);
document.querySelectorAll('[data-z]').forEach(b => b.onclick = () => zoom(SIZES.indexOf(+b.dataset.z)));
$('th').onclick = () => { S.light = !S.light; theme(); };
$('chips').onclick = e => { const b = e.target.closest('.chip'); if (!b) return; S.pfx = S.pfx === b.dataset.p ? '' : b.dataset.p; document.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x.dataset.p === S.pfx)); filter(); };
document.addEventListener('keydown', e => {
  const typing = ['INPUT', 'SELECT'].includes(document.activeElement.tagName);
  if (e.key === '/' && !typing) { e.preventDefault(); q.focus(); q.select(); }
  else if (e.key === 'Escape') { if (d.classList.contains('open')) close_(); else if (typing) document.activeElement.blur(); }
  else if (!typing && (e.key === 'ArrowRight' || e.key === 'ArrowDown') && sel >= 0) { e.preventDefault(); open_(Math.min(sel + 1, list.length - 1)); }
  else if (!typing && (e.key === 'ArrowLeft' || e.key === 'ArrowUp') && sel >= 0) { e.preventDefault(); open_(Math.max(sel - 1, 0)); }
  else if (!typing && (e.key === '+' || e.key === '=')) zoom(SIZES.indexOf(S.z) + 1);
  else if (!typing && e.key === '-') zoom(SIZES.indexOf(S.z) - 1);
  else if (!typing && e.key === 'c' && sel >= 0) copy(D[list[sel]].n, 'Name copied');
});

/* ---------- start */
(async function () {
  try {
    CFG = await (await fetch('config.json', { cache: 'no-cache' })).json();
    VERS = (await (await fetch('data/versions.json', { cache: 'no-cache' })).json()).versions;
  } catch (e) {
    m.outerHTML = '<div class="fatal"><b>This page needs to be opened through a web server.</b><br>Browsers block loading its data files from a local folder (file://). In the project folder run <code>python -m http.server</code> and open <code>http://localhost:8000</code>.</div>';
    return;
  }
  document.title = CFG.title || 'Editor icon browser';
  copyOptions();
  $('eng').textContent = CFG.engine || 'Editor';
  if (/^#[0-9a-fA-F]{6}$/.test(HP.get('accent') ? '#' + HP.get('accent') : (CFG.accent || ''))) document.documentElement.style.setProperty('--eng', HP.get('accent') ? '#' + HP.get('accent') : CFG.accent);
  $('ft').innerHTML = CFG.footer || '';
  if (CFG.palette) { const pl = CFG.palette, st = document.createElement('style'); st.textContent = ':root{--acc:' + pl.dark[0] + ';--acc2:' + pl.dark[1] + '}body.light{--acc:' + pl.light[0] + ';--acc2:' + pl.light[1] + '}'; document.head.appendChild(st); }   // engine colours replace the default blue
  if (!(CFG.tint || []).length) document.querySelector('.tintbar').hidden = true;
  if (CFG.iconsLight) document.body.classList.add('iconslight');   // icons are white/light: keep their tile and preview background dark in the light theme   // engines that cannot tint icons
  q.placeholder = 'Search ' + (CFG.engine || '') + ' icons – e.g. camera, node, audio';
  VERS.sort((a, b) => vcmp(a.v, b.v));
  const majors = [...new Set(VERS.map(x => major(x.v)))].sort((a, b) => b - a);
  vlist.innerHTML = majors.map(mj => '<div class="vg">' + esc(CFG.engine || '') + ' ' + mj + '</div>' + VERS.filter(x => major(x.v) === mj).reverse().map(x => '<div class="vo" role="option" data-v="' + x.v + '" ' + (x.date ? 'title="Released ' + x.date + '"' : '') + '>' + x.v + '</div>').join('')).join('');
  const want = HP.get('v'); S.v = VERS.some(x => x.v === want) ? want : VERS[VERS.length - 1].v;
  S.q = HP.get('q') || ''; q.value = S.q;
  if (HP.get('gone')) S.gone = true;
  if (/^#[0-9a-f]{6}$/i.test(HP.get('tint') || '')) { S.tint = HP.get('tint').toLowerCase(); $('tx').value = S.tint; $('wb').classList.add('on'); $('wb').style.setProperty('--sw', S.tint); }
  theme(); zoom(3);
  await loadVersion(S.v, HP.get('k'));
})();
